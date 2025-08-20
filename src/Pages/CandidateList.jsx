import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/CandidateList.css";

const CandidateList = () => {
  const [candidates, setCandidates] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/candidates");
        setCandidates(res.data);
      } catch (err) {
        console.error("Error fetching candidates:", err);
      }
    };
    fetchCandidates();
  }, []);

  const handleView = (id) => {
    navigate(`/CandidateDetail/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?"))
      return;
    try {
      await axios.delete(`http://localhost:5001/api/candidates/byid?id=${id}`);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Error deleting candidate:", error);
      alert("Failed to delete candidate.");
    }
  };

  const handleContactClick = (candidate) => {
    setSelectedCandidate(candidate);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedCandidate(null);
  };

  return (
    <div className="candidate-list-container">
      <h2>Candidate List</h2>
      <table className="candidate-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Primary Skills</th>
            <th>Experience</th>
            <th>Contact no.</th>
            <th>Resume</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id}>
              <td>{candidate.candidateName}</td>
              <td>{candidate.primarySkills}</td>
              <td>{candidate.totalExperience}</td>
              <td
                onClick={() => handleContactClick(candidate)}
                className="clickable-contact"
              >
                {candidate.contactNo}
              </td>
              <td className="resume-cell">
                {candidate.resumePath && (
                  <a
                    href={`http://localhost:5001${candidate.resumePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="btn resume-btn">Resume</button>
                  </a>
                )}
              </td>
              <td className="action-cell">
                <button
                  className="btn view-btn"
                  onClick={() => handleView(candidate.id)}
                >
                  View
                </button>
                <button
                  className="btn delete-btn"
                  onClick={() => handleDelete(candidate.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* POPUP OUTSIDE MAP */}
      {showPopup && selectedCandidate && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h3>Contact Details</h3>
            <p>
              <strong>Primary Contact:</strong> {selectedCandidate.contactNo}
            </p>
            <p>
              <strong>Secondary Contact:</strong>{" "}
              {selectedCandidate.secondaryContactNo || "N/A"}
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a
                href={`mailto:${selectedCandidate.email}`}
                className="email-link"
              >
                {selectedCandidate.email}
              </a>
            </p>

            <button onClick={closePopup} className="btn close-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateList;
