import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/SendResume.css";

const SendResume = () => {
  const [resumes, setResumes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  const storedAdmin = localStorage.getItem("user");
  const adminId = storedAdmin ? JSON.parse(storedAdmin)?.id : null;

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

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((rid) => rid !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleSend = async () => {
    if (!adminId) {
      alert("Admin ID not found. Please login again.");
      return;
    }

    if (selected.length === 0) {
      alert("Please select at least one resume.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(
        "http://localhost:5001/api/resumes/send-resumes",
        { resumeIds: selected, adminId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("✅ Resumes sent to superadmin successfully.");
      setSelected([]);
    } catch (error) {
      console.error("Error sending resumes:", error);

      if (
        error.response &&
        error.response.data &&
        error.response.data.alreadySent
      ) {
        const sentIds = error.response.data.alreadySent;
        const sentNames = resumes
          .filter((r) => sentIds.includes(r.id))
          .map((r) => r.candidateName)
          .join(", ");

        setMessage(
          `❌ Cannot send. Already sent resumes: ${sentNames || sentIds.join(", ")}`
        );
      } else {
        setMessage("❌ Failed to send resumes.");
      }
    }
  };

  return (
    <div className="send-resume-container">
      <h2>Send Resumes to Superadmin</h2>
      {message && <div className="status-message">{message}</div>}

      <div className="table-container">
        <table className="resume-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Name</th>
              <th>Email</th>
              <th>Skills</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resumes.map((resume) => (
              <tr
                key={resume.id}
                className={selected.includes(resume.id) ? "selected-row" : ""}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(resume.id)}
                    onChange={() => toggleSelect(resume.id)}
                  />
                </td>
                <td>{resume.candidateName}</td>
                <td>{resume.email}</td>
                <td>{resume.primarySkills}</td>
                <td>
                  <span className={`status-tag ${resume.status}`}>
                    {resume.status || "pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="send-button"
        onClick={handleSend}
        disabled={selected.length === 0}
      >
        Send Selected Resumes
      </button>
    </div>
  );
};

export default SendResume;
