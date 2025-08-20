import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterCandidate.css";

const RegisterCandidate = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    candidateName: "",
    fatherName: "",
    email: "",
    contactNo: "",
    secondaryContactNo: "",
    emergencyContactNo: "",
    primarySkills: "",
    secondarySkills: "",
    totalExperience: "",
    relevantExperience: "",
    tools: "",
    toolsExperience: "",
    currentOrg: "",
    previousOrg: "",
    currentLocation: "",
    preferredLocation: "",
    noticePeriod: "",
    cvFile: null,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (name === "cvFile") {
      const resumeFile = files[0];
      if (!resumeFile) return;

      setFormData((prev) => ({
        ...prev,
        cvFile: resumeFile,
      }));
      //
      /*      setLoading(true);

      try {
        const data = new FormData();
        data.append("resume", resumeFile);

        const res = await axios.post(
          "http://localhost:5001/api/affinda/upload-resume",
          data
        );
        const parsed = res.data;

        console.log("Parsed resume data:", parsed); // Debug log
        //Personal Detail

        let extractedFatherName = "";

        const allSections = parsed.sections || [];

        for (const section of allSections) {
          const match = section.text?.match(/Father\s*Name\s*[:\-]?\s*(.+)/i);
          if (match && match[1]) {
            extractedFatherName = match[1].trim();
            break; // stop at the first match
          }
        }

        //current and previous organization
        const workExperiences = parsed.workExperience || [];

        const today = new Date();
        let currentOrg = "";
        let previousOrg = "";

        // Sort work by startDate DESC (most recent first)
        const sorted = [...workExperiences].sort((a, b) => {
          const aDate = new Date(a.dates?.startDate || 0);
          const bDate = new Date(b.dates?.startDate || 0);
          return bDate - aDate;
        });

        // Find current org (first one that ends today or later)
        const currentIndex = sorted.findIndex((job) => {
          const endDate = job.dates?.endDate
            ? new Date(job.dates.endDate)
            : null;
          return job.dates?.isCurrent === true || (endDate && endDate >= today);
        });

        // Set current organization
        if (currentIndex !== -1) {
          currentOrg = sorted[currentIndex]?.organization || "";
        }

        // Set previous organization
        if (currentIndex + 1 < sorted.length) {
          previousOrg = sorted[currentIndex + 1]?.organization || "";
        }
        //Relevent Experience
        let relevantExperience = "";

        if (workExperiences.length > 0) {
          const datePairs = workExperiences
            .map((job) => ({
              start: job.dates?.startDate
                ? new Date(job.dates.startDate)
                : null,
              end: job.dates?.endDate
                ? new Date(job.dates.endDate)
                : new Date(), // if no endDate, use today
            }))
            .filter((d) => d.start); // ignore jobs with no startDate

          if (datePairs.length > 0) {
            const earliestStart = new Date(
              Math.min(...datePairs.map((d) => d.start.getTime()))
            );
            const latestEnd = new Date(
              Math.max(...datePairs.map((d) => d.end.getTime()))
            );

            // Calculate total months
            const yearsDiff =
              latestEnd.getFullYear() - earliestStart.getFullYear();
            const monthsDiff = latestEnd.getMonth() - earliestStart.getMonth();
            const totalMonths = yearsDiff * 12 + monthsDiff;

            const years = Math.floor(totalMonths / 12);
            const months = totalMonths % 12;

            relevantExperience = `${years} years ${months} months`;
          }
        }
        //Skills
        const allSkills = parsed.skills || [];

        const primarySkills = allSkills
          .filter((s) => s.type === "specialized_skill")
          .map((s) => s.name)
          .join(", ");

        const secondarySkills = allSkills
          .filter((s) => s.type === "common_skill")
          .map((s) => s.name)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          candidateName: parsed.name?.raw || prev.candidateName,
          fatherName: extractedFatherName || prev.fatherName,
          email: parsed.emails?.[0] || prev.email,
          contactNo: parsed.phoneNumbers?.[0] || prev.contactNo,
          primarySkills: primarySkills || prev.primarySkills,
          secondarySkills: secondarySkills || prev.secondarySkills,
          totalExperience: parsed.totalYearsExperience || prev.totalExperience,
          //relevantExperience: relevantExperience || prev.relevantExperience,
          currentOrg: currentOrg || prev.currentOrg,
          previousOrg: previousOrg || prev.previousOrg,
        }));
      } catch (err) {
        console.error("Resume parsing failed:", err);
        alert(
          "Failed to parse resume automatically. You can still fill manually."
        );
      } finally {
      setLoading(false);
      } */
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const nameRegex = /^[a-zA-Z\s]+$/;

    if (!formData.candidateName || !nameRegex.test(formData.candidateName)) {
      alert("Please enter a valid Candidate Name (letters only).");
      return false;
    }

    if (formData.fatherName && !nameRegex.test(formData.fatherName)) {
      alert("Father's Name should contain letters only.");
      return false;
    }

    if (!formData.email || !emailRegex.test(formData.email)) {
      alert("Please enter a valid Email.");
      return false;
    }

    if (!phoneRegex.test(formData.contactNo)) {
      alert("Candidate Contact No must be a 10-digit number.");
      return false;
    }

    if (
      formData.secondaryContactNo &&
      !phoneRegex.test(formData.secondaryContactNo)
    ) {
      alert("Secondary Contact No must be a 10-digit number.");
      return false;
    }

    if (
      formData.emergencyContactNo &&
      !phoneRegex.test(formData.emergencyContactNo)
    ) {
      alert("Emergency Contact No must be a 10-digit number.");
      return false;
    }

    if (!formData.cvFile) {
      alert("Please upload a resume (PDF).");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submissionData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submissionData.append(key, value);
    });

    try {
      const response = await axios.post(
        "http://localhost:5001/api/candidates",
        submissionData
      );
      console.log("Candidate registered:", response.data);
      alert("Candidate registered successfully!");
      navigate("/AdminDashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.response) {
        alert(
          `Server Error: ${error.response.data.message || "Registration failed."}`
        );
      } else if (error.request) {
        alert(
          "No response from server. Please check your network or backend server."
        );
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="register-container">
      <h2>Register Candidate</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          name="candidateName"
          placeholder="Candidate Name"
          value={formData.candidateName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="fatherName"
          placeholder="Father's Name"
          value={formData.fatherName}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="contactNo"
          placeholder="Candidate Contact No"
          value={formData.contactNo}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="secondaryContactNo"
          placeholder="Secondary Contact No"
          value={formData.secondaryContactNo}
          onChange={handleChange}
        />
        <input
          type="tel"
          name="emergencyContactNo"
          placeholder="Emergency Contact No"
          value={formData.emergencyContactNo}
          onChange={handleChange}
        />
        <input
          type="text"
          name="primarySkills"
          placeholder="Primary Skills"
          value={formData.primarySkills}
          onChange={handleChange}
        />
        <input
          type="text"
          name="secondarySkills"
          placeholder="Secondary Skills"
          value={formData.secondarySkills}
          onChange={handleChange}
        />
        <input
          type="text"
          name="totalExperience"
          placeholder="Total Experience"
          value={formData.totalExperience}
          onChange={handleChange}
        />
        <input
          type="text"
          name="relevantExperience"
          placeholder="Relevant Experience"
          value={formData.relevantExperience}
          onChange={handleChange}
        />
        <input
          type="text"
          name="tools"
          placeholder="Name of Tools"
          value={formData.tools}
          onChange={handleChange}
        />
        <input
          type="text"
          name="toolsExperience"
          placeholder="Tools Experience"
          value={formData.toolsExperience}
          onChange={handleChange}
        />
        <input
          type="text"
          name="currentOrg"
          placeholder="Current Organization"
          value={formData.currentOrg}
          onChange={handleChange}
        />
        <input
          type="text"
          name="previousOrg"
          placeholder="Previous Organization"
          value={formData.previousOrg}
          onChange={handleChange}
        />
        <input
          type="text"
          name="currentLocation"
          placeholder="Current Location"
          value={formData.currentLocation}
          onChange={handleChange}
        />
        <input
          type="text"
          name="preferredLocation"
          placeholder="Preferred Location"
          value={formData.preferredLocation}
          onChange={handleChange}
        />
        <input
          type="text"
          name="noticePeriod"
          placeholder="Notice Period (e.g. 2 months)"
          value={formData.noticePeriod}
          onChange={handleChange}
        />

        <label>Upload Resume (PDF)</label>
        <input
          type="file"
          name="cvFile"
          accept=".pdf"
          onChange={handleChange}
          required
        />

        {loading && (
          <p style={{ color: "blue" }}>Parsing resume, please wait...</p>
        )}

        <button type="submit" disabled={loading}>
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterCandidate;
