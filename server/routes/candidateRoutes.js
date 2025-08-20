const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/** POST: Save Candidate */
router.post("/", upload.single("cvFile"), async (req, res) => {
  const {
    candidateName,
    fatherName,
    email,
    contactNo,
    secondaryContactNo,
    emergencyContactNo,
    primarySkills,
    secondarySkills,
    totalExperience,
    relevantExperience,
    tools,
    toolsExperience,
    currentOrg,
    previousOrg,
    currentLocation,
    preferredLocation,
    noticePeriod,
  } = req.body;

  if (!candidateName || !email || !contactNo) {
    return res
      .status(400)
      .json({ message: "Name, email, and contact number are required." });
  }

  // file path saved to DB: /uploads/<filename>
  const resumePath = req.file ? `/uploads/${req.file.filename}` : null;

  const candidateQuery = `
    INSERT INTO candidates (
      candidateName, fatherName, email, contactNo,
      secondaryContactNo, emergencyContactNo, primarySkills,
      secondarySkills, totalExperience, relevantExperience,
      tools, toolsExperience, currentOrg, previousOrg,
      currentLocation, preferredLocation, noticePeriod, resumePath
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const candidateValues = [
    candidateName || null,
    fatherName || null,
    email || null,
    contactNo || null,
    secondaryContactNo || null,
    emergencyContactNo || null,
    primarySkills || null,
    secondarySkills || null,
    totalExperience || null,
    relevantExperience || null,
    tools || null,
    toolsExperience || null,
    currentOrg || null,
    previousOrg || null,
    currentLocation || null,
    preferredLocation || null,
    noticePeriod || null,
    resumePath || null,
  ];

  try {
    // If you want atomicity across both inserts, consider using a transaction.
    // Example (uncomment to use if your db client supports it):
    //
    // const conn = await db.getConnection();
    // await conn.beginTransaction();
    // const [result] = await conn.query(candidateQuery, candidateValues);
    // const candidateId = result.insertId;
    // if (resumePath) {
    //   await conn.query(
    //     "INSERT INTO resumes (candidate_id, file_path, status, uploaded_at) VALUES (?, ?, 'pending', NOW())",
    //     [candidateId, resumePath]
    //   );
    // }
    // await conn.commit();
    // conn.release();

    // Insert candidate (no transaction version)
    const [result] = await db.query(candidateQuery, candidateValues);
    const candidateId = result.insertId;

    // Insert resume row into resumes table (if a file was uploaded)
    let resumeInsertId = null;
    if (resumePath) {
      const [resumeResult] = await db.query(
        "INSERT INTO resumes (candidate_id, file_path, status, uploaded_at) VALUES (?, ?, 'pending', NOW())",
        [candidateId, resumePath]
      );
      resumeInsertId = resumeResult.insertId;
    }

    res.status(200).json({
      message: "✅ Candidate and resume saved successfully.",
      candidateId,
      resumeId: resumeInsertId,
    });
  } catch (err) {
    console.error("❌ Failed to insert into DB:", err);
    res.status(500).json({ message: "Server error. Candidate not saved." });
  }
});

// GET /api/candidates/:id
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM candidates");
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/byid", async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Candidate ID is required" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/byid", async (req, res) => {
  const { id } = req.query;
  try {
    const [result] = await db.query("DELETE FROM candidates WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add this to your routes (e.g., in routes/candidates.js or wherever you're defining your routes)
// PUT /api/candidates/update-status/:id
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const [result] = await db.query(
      `UPDATE candidates SET 
        candidateName = ?, fatherName = ?, email = ?, contactNo = ?, 
        secondaryContactNo = ?, emergencyContactNo = ?, primarySkills = ?, 
        secondarySkills = ?, totalExperience = ?, relevantExperience = ?, 
        tools = ?, toolsExperience = ?, currentOrg = ?, previousOrg = ?, 
        currentLocation = ?, preferredLocation = ?, noticePeriod = ? 
      WHERE id = ?`,
      [
        data.candidateName,
        data.fatherName,
        data.email,
        data.contactNo,
        data.secondaryContactNo,
        data.emergencyContactNo,
        data.primarySkills,
        data.secondarySkills,
        data.totalExperience,
        data.relevantExperience,
        data.tools,
        data.toolsExperience,
        data.currentOrg,
        data.previousOrg,
        data.currentLocation,
        data.preferredLocation,
        data.noticePeriod,
        id,
      ]
    );
    res.json({ message: "Candidate updated successfully." });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed." });
  }
});

// Backend: PUT /api/candidates/update-status/:id
router.put("/update-status/:id", async (req, res) => {
  const candidateId = req.params.id;
  const { interviewStatus } = req.body;

  if (!interviewStatus) {
    return res.status(400).json({ error: "Interview status is required." });
  }

  try {
    await db.query("UPDATE candidates SET interviewStatus = ? WHERE id = ?", [
      interviewStatus,
      candidateId,
    ]);
    res.json({ message: "Interview status updated successfully." });
  } catch (err) {
    console.error("Error updating interview status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route for admins
// Login route for admins
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const [rows] = await db.query("SELECT * FROM admins WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    console.log("User from DB:", user); // ✅ Safe here

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch); // ✅ Safe here

    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      "my_super_secret_key",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
