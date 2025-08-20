const express = require("express");
const db = require("../db");
const router = express.Router();
require("dotenv").config();

router.post("/send-resumes", async (req, res) => {
  const { resumeIds, adminId, jobMandateId } = req.body;

  if (!Array.isArray(resumeIds) || resumeIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Please provide at least one resume ID." });
  }

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required." });
  }

  try {
    const placeholders = resumeIds.map(() => "?").join(", ");

    // 1) Check if any resumes have already been sent by this admin
    const [alreadySentRows] = await db.query(
      `SELECT id FROM resumes 
       WHERE submitted_by_admin_id = ? 
       AND id IN (${placeholders}) 
       AND status = 'sent'`,
      [adminId, ...resumeIds]
    );
    const alreadySentIds = alreadySentRows.map((r) => r.id);
    if (alreadySentIds.length > 0) {
      return res.status(400).json({
        error:
          "One or more selected resumes have already been sent by this admin.",
        alreadySent: alreadySentIds,
      });
    }

    // 2) Fetch the job mandate details
    const [mandateRows] = await db.query(
      "SELECT positions FROM job_mandates WHERE id = ?",
      [jobMandateId]
    );
    if (mandateRows.length === 0) {
      return res.status(404).json({ error: "Job mandate not found." });
    }

    const { positions } = mandateRows[0];

    // 3) Check how many resumes are already sent for this mandate
    const [countRow] = await db.query(
      "SELECT COUNT(*) AS total FROM resumes WHERE submitted_for_job_id = ? AND status = 'sent'",
      [jobMandateId]
    );
    const sentCount = countRow[0].total;

    if (sentCount >= positions) {
      return res.status(400).json({
        error: "All allowed resumes have already been sent for this mandate.",
      });
    }

    const remainingSlots = positions - sentCount;
    if (resumeIds.length > remainingSlots) {
      return res.status(400).json({
        error: `You can only send ${remainingSlots} more resume(s) for this mandate.`,
      });
    }

    // 4) All checks passed – update resumes
    const updateQuery = `
      UPDATE resumes
      SET status = 'sent',
          submitted_by_admin_id = ?,
          submitted_for_job_id = ?,
          submitted_at = NOW()
      WHERE id IN (${placeholders})
    `;
    await db.query(updateQuery, [adminId, jobMandateId, ...resumeIds]);

    // 5) Mark mandate as done & set submission timestamp
    await db.query(
      `UPDATE job_mandates
       SET submitted_at = NOW(), status = 'done'
       WHERE id = ?`,
      [jobMandateId]
    );

    await db.query(
      `UPDATE admins
       SET status = 'inactive',
           active_mandate_id = NULL
       WHERE id = ?`,
      [adminId]
    );

    res
      .status(200)
      .json({ message: "Resumes sent and mandate closed successfully." });
  } catch (err) {
    console.error("Error sending resumes:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all resumes sent by admins that are pending approval in superadmin
router.get("/pending-resumes", async (req, res) => {
  try {
    const jobMandateId = req.query.jobMandateId
      ? Number(req.query.jobMandateId)
      : null;

    // Base query: resumes with status 'sent' (waiting for review)
    let sql = `
      SELECT
        resumes.id AS resume_id,
        resumes.file_path,
        resumes.status,
        resumes.submitted_for_job_id,
        resumes.submitted_by_admin_id,
        resumes.submitted_at,
        candidates.candidateName AS name,
        candidates.email,
        candidates.primarySkills AS skills,
        candidates.totalExperience AS experience,
        job_mandates.id AS job_id,
        job_mandates.job_title AS job_title,
        admins.id AS admin_id,
        admins.name AS submitted_by_name
      FROM resumes
      JOIN candidates ON resumes.candidate_id = candidates.id
      LEFT JOIN job_mandates ON resumes.submitted_for_job_id = job_mandates.id
      LEFT JOIN admins ON resumes.submitted_by_admin_id = admins.id
      WHERE resumes.status = 'sent'
    `;

    const params = [];

    if (jobMandateId) {
      sql += " AND resumes.submitted_for_job_id = ?";
      params.push(jobMandateId);
    }

    sql += " ORDER BY resumes.submitted_at DESC, resumes.id DESC";

    const [rows] = await db.query(sql, params);

    // Normalize/format rows if needed (optional)
    const normalized = rows.map((r) => ({
      resume_id: r.resume_id,
      file_path: r.file_path,
      status: r.status,
      submitted_for_job_id: r.submitted_for_job_id,
      submitted_by_admin_id: r.submitted_by_admin_id,
      submitted_at: r.submitted_at,
      candidate: {
        name: r.name,
        email: r.email,
        skills: r.skills,
        experience: r.experience,
      },
      job: r.job_id ? { id: r.job_id, title: r.job_title } : null,
      submitted_by: r.admin_id
        ? { id: r.admin_id, name: r.submitted_by_name }
        : null,
    }));

    res.json(normalized);
  } catch (error) {
    console.error("Error fetching pending resumes:", error);
    res.status(500).json({ error: "Failed to fetch resumes." });
  }
});

// Review (approve or deny) a resume
router.post("/review-resume", async (req, res) => {
  try {
    const { resumeId, status, reason } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: "resumeId is required." });
    }

    // Accept frontend values 'approved' or 'denied' (map 'denied' -> 'rejected')
    if (!["approved", "denied"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use 'approved' or 'denied'." });
    }

    const normalizedStatus = status === "denied" ? "rejected" : "approved";

    // If it's a denial, require a reason
    if (normalizedStatus === "rejected" && (!reason || reason.trim() === "")) {
      return res.status(400).json({ error: "Denial reason is required." });
    }

    // Update the resume row: set status, rejection_reason (or null), and reviewed_at
    const rejectionReasonValue =
      normalizedStatus === "rejected" ? reason : null;

    const updateQuery = `
      UPDATE resumes
      SET status = ?,
          rejection_reason = ?,
          reviewed_at = NOW()
      WHERE id = ?
    `;

    const [updateResult] = await db.query(updateQuery, [
      normalizedStatus,
      rejectionReasonValue,
      resumeId,
    ]);

    // Optional: fetch and return the updated resume row
    const [rows] = await db.query(
      `SELECT id AS resume_id, candidate_id, file_path, status, rejection_reason, reviewed_at, submitted_for_job_id, submitted_by_admin_id, submitted_at, uploaded_at FROM resumes WHERE id = ?`,
      [resumeId]
    );

    const updated = rows[0] || null;

    res.json({ message: "Resume reviewed successfully.", resume: updated });
  } catch (error) {
    console.error("Error reviewing resume:", error);
    res.status(500).json({ error: "Failed to review resume." });
  }
});

// Fetch resume status by a specific admin
router.get("/api/admin-status/:adminId", async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT r.id, r.name, r.email, r.approval_status, r.superadmin_reason, r.decision_timestamp, rs.sent_at
      FROM resumes r
      JOIN resume_sends rs ON r.id = rs.resume_id
      WHERE rs.sent_by_admin_id = ?
      ORDER BY rs.sent_at DESC
    `,
      [adminId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching admin resume status:", error);
    res.status(500).json({ error: "Failed to fetch status." });
  }
});

// Get all resumes
// Get all resumes (with candidate info and status)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        resumes.id,
        resumes.status,
        resumes.file_path,
        candidates.candidateName,
        candidates.email,
        candidates.primarySkills
      FROM resumes
      JOIN candidates ON resumes.candidate_id = candidates.id;
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching resumes", err);
    res.status(500).json({ message: "Failed to fetch resumes" });
  }
});

module.exports = router;
