const express = require("express");
const router = express.Router();
const db = require("../db"); // your database connection

// POST /api/job-mandates
router.post("/", async (req, res) => {
  try {
    const {
      job_title,
      primary_skills,
      experience_required,
      location,
      positions,
      assigned_admin_id,
      deadline,
    } = req.body;

    // Validate input
    if (
      !job_title ||
      !primary_skills ||
      !experience_required ||
      !location ||
      !positions ||
      !assigned_admin_id ||
      !deadline
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Insert into database
    const [result] = await db.execute(
      `INSERT INTO job_mandates 
      (job_title, primary_skills, experience_required, location, positions, assigned_admin_id, deadline) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        job_title,
        primary_skills,
        experience_required,
        location,
        positions,
        assigned_admin_id,
        deadline,
      ]
    );

    res.status(201).json({
      message: "Job mandate created successfully",
      mandateId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating job mandate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/job-mandates/assigned/:adminId
router.get("/assigned/:adminId", async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM job_mandates WHERE assigned_admin_id = ? AND status = 'open'",
      [adminId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching mandates", error);
    res.status(500).json({ error: "Failed to fetch job mandates" });
  }
});

router.post("/submit", async (req, res) => {
  const { resumeIds, jobMandateId, adminId } = req.body;

  if (!Array.isArray(resumeIds) || resumeIds.length === 0) {
    return res.status(400).json({ error: "No resumes provided." });
  }

  try {
    const values = resumeIds.map((resumeId) => [
      resumeId,
      jobMandateId,
      adminId,
    ]);

    const query = `
      INSERT INTO resume_submissions (resume_id, job_mandate_id, submitted_by_admin_id)
      VALUES ?
    `;

    await db.query(query, [values]);

    res.status(200).json({ message: "Resumes submitted for approval." });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Failed to submit resumes." });
  }
});

// START MANDATE
router.post("/start-mandate", async (req, res) => {
  const { adminId, mandateId } = req.body;

  if (!adminId || !mandateId) {
    return res
      .status(400)
      .json({ message: "adminId and mandateId are required." });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1) Check if admin already has an active mandate
    const [activeRows] = await conn.query(
      `SELECT active_mandate_id 
       FROM admins
       WHERE id = ? FOR UPDATE`,
      [adminId]
    );

    if (activeRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Admin not found." });
    }

    if (
      activeRows[0].active_mandate_id &&
      activeRows[0].active_mandate_id !== mandateId
    ) {
      await conn.rollback();
      return res
        .status(409)
        .json({ message: "Admin already has an active mandate." });
    }

    // 2) Verify mandate exists and is assigned to the admin
    const [mandateRows] = await conn.query(
      `SELECT id, assigned_admin_id, started_at, submitted_at
       FROM job_mandates
       WHERE id = ? FOR UPDATE`,
      [mandateId]
    );

    if (mandateRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Mandate not found." });
    }

    if (mandateRows[0].assigned_admin_id !== adminId) {
      await conn.rollback();
      return res
        .status(403)
        .json({ message: "Mandate is not assigned to this admin." });
    }

    if (mandateRows[0].started_at && !mandateRows[0].submitted_at) {
      await conn.rollback();
      return res
        .status(409)
        .json({ message: "This mandate is already in progress." });
    }

    // 3) Start the mandate
    await conn.query(
      `UPDATE job_mandates 
       SET started_at = NOW(), status = 'in_progress'
       WHERE id = ?`,
      [mandateId]
    );

    // 4) Update admin's active mandate
    await conn.query(
      `UPDATE admins 
       SET status = 'active', active_mandate_id = ?
       WHERE id = ?`,
      [mandateId, adminId]
    );

    // 5) Start mandate session (kick off active timer here!)
    await conn.query(
      `INSERT INTO admin_mandate_session 
        (admin_id, job_mandate_id, started_at, active_start_time, total_active_time, total_inactive_time)
       VALUES (?, ?, NOW(), NOW(), 0, 0)`,
      [adminId, mandateId]
    );

    // 6) Log admin as active
    await conn.query(
      `INSERT INTO admin_activity_logs (admin_id, job_mandate_id, status, timestamp)
       VALUES (?, ?, 'active', NOW())`,
      [adminId, mandateId]
    );

    await conn.commit();

    return res.json({
      message:
        "Mandate started, active timer started, and session tracking initiated.",
      mandateId,
    });
  } catch (err) {
    console.error("Error in /start-mandate:", err);
    if (conn) {
      try {
        await conn.rollback();
      } catch (e) {}
    }
    return res.status(500).json({ error: "Failed to start mandate." });
  } finally {
    if (conn) conn.release();
  }
});

// ========================= PAUSE MANDATE =========================
router.post("/pause-mandate", async (req, res) => {
  const { adminId, mandateId } = req.body;

  if (!adminId || !mandateId) {
    return res
      .status(400)
      .json({ message: "adminId and mandateId are required." });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1) Check session
    const [sessionRows] = await conn.query(
      `SELECT id, active_start_time 
       FROM admin_mandate_session
       WHERE admin_id = ? AND job_mandate_id = ? AND active_start_time IS NOT NULL
       ORDER BY started_at DESC LIMIT 1 FOR UPDATE`,
      [adminId, mandateId]
    );

    if (sessionRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "No active session found to pause." });
    }

    // 2) Stop active timer → update total_active_time, set inactive_start_time
    await conn.query(
      `UPDATE admin_mandate_session
       SET total_active_time = total_active_time + TIMESTAMPDIFF(SECOND, active_start_time, NOW()),
           active_start_time = NULL,
           inactive_start_time = NOW()
       WHERE id = ?`,
      [sessionRows[0].id]
    );

    // 3) Update admin status
    await conn.query(
      `UPDATE admins
       SET status = 'inactive'
       WHERE id = ?`,
      [adminId]
    );

    // 4) Log the action
    await conn.query(
      `INSERT INTO admin_activity_logs (admin_id, job_mandate_id, status, timestamp)
       VALUES (?, ?, 'inactive', NOW())`,
      [adminId, mandateId]
    );

    await conn.commit();

    return res.json({ message: "Mandate paused, active time saved." });
  } catch (err) {
    console.error("Error in /pause-mandate:", err);
    if (conn) await conn.rollback();
    return res.status(500).json({ error: "Failed to pause mandate." });
  } finally {
    if (conn) conn.release();
  }
});

// ========================= RESUME MANDATE =========================
router.post("/resume-mandate", async (req, res) => {
  const { adminId, mandateId } = req.body;

  if (!adminId || !mandateId) {
    return res
      .status(400)
      .json({ message: "adminId and mandateId are required." });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1) Check session
    const [sessionRows] = await conn.query(
      `SELECT id, inactive_start_time 
       FROM admin_mandate_session
       WHERE admin_id = ? AND job_mandate_id = ? AND inactive_start_time IS NOT NULL
       ORDER BY started_at DESC LIMIT 1 FOR UPDATE`,
      [adminId, mandateId]
    );

    if (sessionRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "No paused session found to resume." });
    }

    // 2) Stop inactive timer → update total_inactive_time, set active_start_time
    await conn.query(
      `UPDATE admin_mandate_session
       SET total_inactive_time = total_inactive_time + TIMESTAMPDIFF(SECOND, inactive_start_time, NOW()),
           inactive_start_time = NULL,
           active_start_time = NOW()
       WHERE id = ?`,
      [sessionRows[0].id]
    );

    // 3) Update admin status
    await conn.query(
      `UPDATE admins
       SET status = 'active'
       WHERE id = ?`,
      [adminId]
    );

    // 4) Log the action
    await conn.query(
      `INSERT INTO admin_activity_logs (admin_id, job_mandate_id, status, timestamp)
       VALUES (?, ?, 'active', NOW())`,
      [adminId, mandateId]
    );

    await conn.commit();

    return res.json({ message: "Mandate resumed, inactive time saved." });
  } catch (err) {
    console.error("Error in /resume-mandate:", err);
    if (conn) await conn.rollback();
    return res.status(500).json({ error: "Failed to resume mandate." });
  } finally {
    if (conn) conn.release();
  }
});

// POST /end-mandate
router.post("/end-mandate", async (req, res) => {
  const { adminId } = req.body;

  if (!adminId) {
    return res.status(400).json({ error: "adminId is required." });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1) Get active mandate for this admin
    const [adminRows] = await conn.query(
      `SELECT active_mandate_id 
       FROM admins
       WHERE id = ? FOR UPDATE`,
      [adminId]
    );

    if (adminRows.length === 0 || !adminRows[0].active_mandate_id) {
      await conn.rollback();
      return res
        .status(404)
        .json({ error: "No active mandate found for this admin." });
    }

    const mandateId = adminRows[0].active_mandate_id;

    // 2) Get mandate details
    const [mandateRows] = await conn.query(
      `SELECT positions, started_at, job_title
       FROM job_mandates
       WHERE id = ? AND assigned_admin_id = ? FOR UPDATE`,
      [mandateId, adminId]
    );

    if (mandateRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ error: "Mandate not found or not assigned to this admin." });
    }

    const { positions, started_at } = mandateRows[0];

    // 3) Count resumes uploaded during mandate period
    const [resumeCountRows] = await conn.query(
      `SELECT COUNT(*) AS count
       FROM resumes
       WHERE submitted_by_admin_id = ?
         AND uploaded_at >= ?`,
      [adminId, started_at]
    );

    const submittedCount = resumeCountRows[0].count;

    // 4) Decide new status
    let newStatus = "partial_review";
    if (submittedCount >= positions) {
      newStatus = "completed_review";
    }

    // 5) Update mandate status
    await conn.query(
      `UPDATE job_mandates
       SET submitted_at = NOW(), status = ?
       WHERE id = ?`,
      [newStatus, mandateId]
    );

    // 6) Free admin
    await conn.query(
      `UPDATE admins
       SET status = 'inactive', active_mandate_id = NULL
       WHERE id = ?`,
      [adminId]
    );

    // 7) Flush any running timer and close session
    await conn.query(
      `UPDATE admin_mandate_session
       SET total_active_time = total_active_time + IF(active_start_time IS NOT NULL, TIMESTAMPDIFF(SECOND, active_start_time, NOW()), 0),
           total_inactive_time = total_inactive_time + IF(inactive_start_time IS NOT NULL, TIMESTAMPDIFF(SECOND, inactive_start_time, NOW()), 0),
           active_start_time = NULL,
           inactive_start_time = NULL,
           submitted_at = NOW()
       WHERE admin_id = ? AND job_mandate_id = ? AND submitted_at IS NULL`,
      [adminId, mandateId]
    );

    // 8) Get final totals to return (safe check)
    const [sessionFinal] = await conn.query(
      `SELECT total_active_time, total_inactive_time
       FROM admin_mandate_session
       WHERE admin_id = ? AND job_mandate_id = ?`,
      [adminId, mandateId]
    );

    let totalActiveTime = 0;
    let totalInactiveTime = 0;

    if (sessionFinal.length > 0) {
      totalActiveTime = sessionFinal[0].total_active_time;
      totalInactiveTime = sessionFinal[0].total_inactive_time;
    }

    // 9) Log mandate closure
    await conn.query(
      `INSERT INTO admin_activity_logs (admin_id, job_mandate_id, status, timestamp)
       VALUES (?, ?, 'ended', NOW())`,
      [adminId, mandateId]
    );

    await conn.commit();

    return res.json({
      message: `Mandate marked as ${newStatus.replace("_", " ")}.`,
      submittedCount,
      positions,
      status: newStatus,
      totalActiveTime,
      totalInactiveTime,
    });
  } catch (err) {
    console.error("Error in /end-mandate:", err);
    if (conn) await conn.rollback();
    return res.status(500).json({ error: "Failed to end mandate." });
  } finally {
    if (conn) conn.release();
  }
});

router.get("/admins/:adminId/active-mandate", async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT * FROM job_mandates
       WHERE assigned_admin_id = ?
         AND started_at IS NOT NULL
         AND submitted_at IS NULL
       LIMIT 1`,
      [adminId]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching active mandate:", err);
    res.status(500).json({ error: "Failed to fetch active mandate" });
  }
});

// Route to get completed mandates for an admin
router.get("/admin/completed-mandates/:adminId", async (req, res) => {
  const { adminId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, job_title, status FROM job_mandates WHERE assigned_admin_id = ? AND status = 'done'",
      [adminId]
    );
    res.json(rows); // send only the rows array
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/completed-mandates/:mandateId/details", async (req, res) => {
  const { mandateId } = req.params;

  try {
    // Fetch resumes with candidate name
    const [resumes] = await db.query(
      `SELECT r.id, c.candidateName AS candidate_name, r.status, r.submitted_at
       FROM resumes r
       INNER JOIN candidates c ON r.candidate_id = c.id
       WHERE r.submitted_for_job_id = ?`,
      [mandateId]
    );

    // Fetch mandate timing info
    const [mandateDetails] = await db.query(
      `SELECT started_at, submitted_at
       FROM job_mandates
       WHERE id = ?`,
      [mandateId]
    );

    res.json({
      resumes,
      mandateDetails: mandateDetails.length > 0 ? mandateDetails[0] : null,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch completed mandate details" });
  }
});

module.exports = router;
