const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();
require("dotenv").config();

const { verifyToken } = require("../middleware/auth");

// Middleware to allow only superadmins
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ error: "Access denied. Super Admins only." });
  }
  next();
}

// ✅ Admin login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM admins WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid email" });

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // ✅ Log login time in admin_logs
    await db.query(
      "INSERT INTO admin_logs (admin_id, login_time) VALUES (?, NOW())",
      [admin.id]
    );

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Apply token check to all routes below
router.use(verifyToken);

// ✅ Create new admin (superadmin only)
router.post("/create", requireSuperAdmin, async (req, res) => {
  const { name, email, password, role = "admin" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );
    res.status(201).json({ message: "Admin created successfully." });
  } catch (err) {
    console.error("Error creating admin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get all admins (superadmin only)
router.get("/all", requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, email, role FROM admins");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching admins:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Delete admin by ID (superadmin only)
router.delete("/delete/:id", requireSuperAdmin, async (req, res) => {
  const adminId = req.params.id;

  try {
    await db.query("DELETE FROM admins WHERE id = ?", [adminId]);
    res.json({ message: "Admin deleted successfully." });
  } catch (err) {
    console.error("Error deleting admin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Logout (any admin)
router.post("/logout", async (req, res) => {
  try {
    const adminId = req.user.id;

    // ✅ Update the most recent login entry for this admin
    await db.query(
      `UPDATE admin_logs 
       SET logout_time = NOW() 
       WHERE admin_id = ? 
       ORDER BY login_time DESC 
       LIMIT 1`,
      [adminId]
    );

    res.json({ message: "Logout time recorded." });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error on logout." });
  }
});

// ✅ Get admin details by ID
router.get("/byid/:id", requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM admins WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get login/logout history for an admin
router.get("/logs/:adminId", requireSuperAdmin, async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT login_time, logout_time FROM admin_logs WHERE admin_id = ? ORDER BY login_time DESC",
      [adminId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Log fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }

  router.get("/logs/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await db.query(
        "SELECT login_time, logout_time FROM admin_logs WHERE admin_id = ? ORDER BY login_time DESC",
        [id]
      );
      res.json(rows);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

//Resumes routes

router.post("/api/send-resumes", async (req, res) => {
  const { resumeIds, adminId } = req.body;

  if (!Array.isArray(resumeIds) || resumeIds.length !== 5) {
    return res.status(400).json({ error: "Exactly 5 resumes must be sent." });
  }

  try {
    const now = new Date();

    for (const resumeId of resumeIds) {
      await db.query(
        "INSERT INTO resume_sends (resume_id, sent_by_admin_id, sent_at) VALUES (?, ?, ?)",
        [resumeId, adminId, now]
      );
      await db.query(
        "UPDATE resumes SET sent_to_superadmin = TRUE WHERE id = ?",
        [resumeId]
      );
    }

    res.json({ message: "Resumes sent to superadmin successfully." });
  } catch (error) {
    console.error("Error sending resumes:", error);
    res.status(500).json({ error: "Failed to send resumes." });
  }
});

router.get("/api/pending-resumes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM resumes WHERE sent_to_superadmin = TRUE AND approval_status = 'pending'"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending resumes:", error);
    res.status(500).json({ error: "Failed to fetch resumes." });
  }
});

router.post("/api/review-resume", async (req, res) => {
  const { resumeId, status, reason } = req.body;

  if (!["approved", "denied"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  if (status === "denied" && !reason) {
    return res.status(400).json({ error: "Denial reason is required." });
  }

  try {
    await db.query(
      "UPDATE resumes SET approval_status = ?, superadmin_reason = ?, decision_timestamp = NOW() WHERE id = ?",
      [status, reason || null, resumeId]
    );

    res.json({ message: "Resume reviewed successfully." });
  } catch (error) {
    console.error("Error reviewing resume:", error);
    res.status(500).json({ error: "Failed to review resume." });
  }
});

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

router.get("/admin/:adminId/active-mandate", async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT * FROM job_mandates 
       WHERE assigned_admin_id = ? 
       AND started_at IS NOT NULL 
       AND submitted_at IS NULL`,
      [adminId]
    );

    if (rows.length > 0) {
      res.json({ hasActiveMandate: true, mandate: rows[0] });
    } else {
      res.json({ hasActiveMandate: false });
    }
  } catch (err) {
    console.error("Error checking active mandate:", err);
    res.status(500).json({ error: "Failed to check active mandate." });
  }
});

router.post("/admin/inactive", async (req, res) => {
  const { adminId } = req.body;

  try {
    await db.query("UPDATE admins SET status = 'inactive' WHERE id = ?", [
      adminId,
    ]);

    res.json({ message: "Admin marked as inactive due to inactivity." });
  } catch (err) {
    console.error("Error marking admin inactive:", err);
    res.status(500).json({ error: "Failed to update admin status." });
  }
});

router.post("/admin/active", async (req, res) => {
  const { adminId } = req.body;

  try {
    await db.query("UPDATE admins SET status = 'active' WHERE id = ?", [
      adminId,
    ]);

    res.json({ message: "Admin marked as active again." });
  } catch (err) {
    console.error("Error marking admin active:", err);
    res.status(500).json({ error: "Failed to update admin status." });
  }
});

module.exports = router;
