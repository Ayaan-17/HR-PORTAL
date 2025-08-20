import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/ReviewResumes.css";

const ReviewResumes = () => {
  const [resumes, setResumes] = useState([]);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5001/api/resumes/pending-resumes"
      );
      setResumes(res.data);
    } catch (err) {
      console.error("Failed to fetch pending resumes", err);
    }
  };

  const handleDecision = async (resumeId, decision) => {
    let reason = "";
    if (decision === "denied") {
      reason = prompt("Enter reason for denial:");
      if (!reason) return;
    }

    try {
      await axios.post("http://localhost:5001/api/resumes/review-resume", {
        resumeId,
        status: decision,
        reason,
      });
      fetchResumes();
    } catch (err) {
      alert("Failed to submit decision.");
      console.error(err);
    }
  };

  return (
    <div className="review-container">
      <h2 className="review-heading">Pending Resume Reviews</h2>
      {resumes.length === 0 ? (
        <p>No resumes pending review.</p>
      ) : (
        resumes.map((resume) => (
          <div key={resume.resume_id} className="review-card">
            <p>
              <strong>Name:</strong> {resume.candidate?.name}
            </p>
            <p>
              <strong>Email:</strong> {resume.candidate?.email}
            </p>
            <p>
              <strong>Skills:</strong> {resume.candidate?.skills}
            </p>
            <p>
              <strong>Experience:</strong> {resume.candidate?.experience} yrs
            </p>
            <p>
              <strong>Job Mandate:</strong> {resume.job?.title || "N/A"}
            </p>
            <p>
              <strong>Submitted By:</strong>{" "}
              {resume.submitted_by?.name || "N/A"}
            </p>
            <p>
              <strong>Submitted At:</strong>{" "}
              {new Date(resume.submitted_at).toLocaleString()}
            </p>
            <p>
              <strong>Resume:</strong>{" "}
              <a
                href={`http://localhost:5001${resume.file_path}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Resume
              </a>
            </p>

            <div className="button-group">
              <button
                className="button-approve"
                onClick={() => handleDecision(resume.resume_id, "approved")}
              >
                Approve
              </button>
              <button
                className="button-deny"
                onClick={() => handleDecision(resume.resume_id, "denied")}
              >
                Deny
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ReviewResumes;
