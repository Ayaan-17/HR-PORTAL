import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../styles/MandateWorks.css";
import { useNavigate } from "react-router-dom";

const MandateWork = () => {
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumes, setSelectedResumes] = useState([]);
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin"));

  // Track AFK state
  const [isPaused, setIsPaused] = useState(false);
  const inactivityTimer = useRef(null);

  useEffect(() => {
    const mandate = JSON.parse(localStorage.getItem("selectedMandate"));
    setSelectedMandate(mandate);
  }, []);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/resumes");
        setResumes(res.data);
      } catch (err) {
        console.error("Error fetching resumes:", err);
      }
    };
    fetchResumes();
  }, []);

  // ---------------- AFK Logic ----------------
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    inactivityTimer.current = setTimeout(
      async () => {
        if (!isPaused && selectedMandate) {
          try {
            await axios.post(
              "http://localhost:5001/api/jobMandates/pause-mandate",
              {
                adminId: admin.id,
                mandateId: selectedMandate.id,
              }
            );
            setIsPaused(true);
            console.log("Mandate paused due to inactivity.");
          } catch (err) {
            console.error("Error pausing mandate:", err);
          }
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
  };

  const handleUserActivity = async () => {
    if (isPaused && selectedMandate) {
      try {
        await axios.post(
          "http://localhost:5001/api/jobMandates/resume-mandate",
          {
            adminId: admin.id,
            mandateId: selectedMandate.id,
          }
        );
        setIsPaused(false);
        console.log("Mandate resumed after activity.");
      } catch (err) {
        console.error("Error resuming mandate:", err);
      }
    }
    resetInactivityTimer();
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    resetInactivityTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
    };
  }, [isPaused, selectedMandate]);
  // --------------------------------------------

  const toggleResumeSelection = (resumeId) => {
    const maxAllowed = selectedMandate?.positions || 1;
    if (selectedResumes.includes(resumeId)) {
      setSelectedResumes((prev) => prev.filter((id) => id !== resumeId));
    } else {
      if (selectedResumes.length >= maxAllowed) {
        alert(
          `You can only send up to ${maxAllowed} resume(s) for this mandate.`
        );
        return;
      }
      setSelectedResumes((prev) => [...prev, resumeId]);
    }
  };

  const handleSendResumes = async () => {
    if (selectedResumes.length === 0) {
      alert("Please select at least one resume.");
      return;
    }

    try {
      // 1️⃣ Send the selected resumes
      const sendRes = await axios.post(
        "http://localhost:5001/api/resumes/send-resumes",
        {
          resumeIds: selectedResumes,
          adminId: admin?.id,
          jobMandateId: selectedMandate.id,
        }
      );

      alert(sendRes.data.message);

      // 2️⃣ End mandate based on submitted resumes count
      const endRes = await axios.post(
        "http://localhost:5001/api/jobMandates/end-mandate",
        {
          adminId: admin.id,
          mandateId: selectedMandate.id,
        }
      );

      alert(endRes.data.message);

      // 3️⃣ Clear mandate data and return to dashboard
      localStorage.removeItem("selectedMandate");
      navigate("/AdminDashboard");
    } catch (err) {
      console.error("Error sending resumes or ending mandate:", err);
      alert(
        err.response?.data?.error ||
          "An error occurred while sending resumes or ending mandate."
      );
    }
  };

  return (
    <div className="submit-resume-container">
      <h2 className="mandate-heading">Mandate Details</h2>
      {selectedMandate ? (
        <div className="mandate-details">
          <p>
            <strong>Company:</strong> {selectedMandate.company_name}
          </p>
          <p>
            <strong>Role:</strong> {selectedMandate.job_title}
          </p>
          <p>
            <strong>Location:</strong> {selectedMandate.location}
          </p>
          <p>
            <strong>Experience Required:</strong>{" "}
            {selectedMandate.experience_required} years
          </p>
          <p>
            <strong>Skills Required:</strong> {selectedMandate.primary_skills}
          </p>
          <p>
            <strong>Positions Open:</strong> {selectedMandate.positions}
          </p>
          <p style={{ color: isPaused ? "red" : "green", fontWeight: "bold" }}>
            {isPaused ? "Mandate Paused (AFK)" : "Mandate Active"}
          </p>
        </div>
      ) : (
        <p>Loading mandate details...</p>
      )}

      <button
        className="add-candidate-btn"
        onClick={() => navigate("/RegisterCandidate")}
      >
        Add New Candidate
      </button>

      <h3 className="resume-heading">Select Resumes to Submit</h3>
      {resumes.length === 0 ? (
        <p>No resumes found.</p>
      ) : (
        <div className="resume-list">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className={`resume-item ${
                selectedResumes.includes(resume.id) ? "selected" : ""
              }`}
              onClick={() => toggleResumeSelection(resume.id)}
            >
              <p>
                <strong>Name:</strong> {resume.candidateName}
              </p>
              <p>
                <strong>Email:</strong> {resume.email}
              </p>
              <p>
                <strong>Skills:</strong> {resume.primarySkills}
              </p>
              <p>
                <strong>Experience:</strong> {resume.totalExperience} years
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      resume.status === "approved"
                        ? "green"
                        : resume.status === "rejected"
                          ? "red"
                          : "orange",
                  }}
                >
                  {resume.status || "Pending"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      <button className="send-resumes-btn" onClick={handleSendResumes}>
        Send Selected Resumes
      </button>
    </div>
  );
};

export default MandateWork;
