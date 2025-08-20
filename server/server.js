const express = require("express");
const cors = require("cors");
const path = require("path");
const affindaRoutes = require("./routes/affinda");
const candidateRoutes = require("./routes/candidateRoutes");
const adminRoutes = require("./routes/admins");
const resumeRoutes = require("./routes/resumes");
const jobMandatesRoutes = require("./routes/jobMandates");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// server.js
app.use("/api/candidates", candidateRoutes);
app.use("/api/affinda", affindaRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobMandates", jobMandatesRoutes);

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
