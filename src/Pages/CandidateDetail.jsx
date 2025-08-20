// src/CandidateDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/CandidateDetail.css";

const CandidateDetail = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/candidates/byid?id=${id}`
        );
        setCandidate(response.data);
        setEditData(response.data);
        setInterviewStatus(response.data.interviewStatus || "");
        setLoading(false);
      } catch (err) {
        console.error("Error fetching candidate:", err);
        setError("Candidate not found.");
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id]);

  const handleStatusSave = async () => {
    if (!interviewStatus) return;
    setSavingStatus(true);
    try {
      await axios.put(
        `http://localhost:5001/api/candidates/update-status/${id}`,
        {
          interviewStatus,
        }
      );
      setSaveMessage("Interview status saved successfully.");
    } catch (err) {
      console.error("Error saving interview status:", err);
      setSaveMessage("Failed to save interview status.");
    }
    setSavingStatus(false);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleFieldChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(
        `http://localhost:5001/api/candidates/update/${id}`,
        editData
      );
      setCandidate(editData);
      setIsEditing(false);
      setSaveMessage("Candidate details updated successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Error updating candidate:", err);
      setSaveMessage("Failed to update candidate.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;

  const renderField = (label, field) => (
    <li>
      <strong>{label}:</strong>{" "}
      {isEditing ? (
        <input
          type="text"
          value={editData[field] || ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
        />
      ) : (
        candidate[field] || "Not set"
      )}
    </li>
  );

  return (
    <div className="candidate-detail">
      <h2>{candidate.candidateName}'s Details</h2>
      <ul>
        {renderField("Father's Name", "fatherName")}
        {renderField("Email", "email")}
        {renderField("Contact No", "contactNo")}
        {renderField("Secondary Contact", "secondaryContactNo")}
        {renderField("Emergency Contact", "emergencyContactNo")}
        {renderField("Primary Skills", "primarySkills")}
        {renderField("Secondary Skills", "secondarySkills")}
        {renderField("Total Experience", "totalExperience")}
        {renderField("Relevant Experience", "relevantExperience")}
        {renderField("Tools", "tools")}
        {renderField("Tools Experience", "toolsExperience")}
        {renderField("Current Organization", "currentOrg")}
        {renderField("Previous Organization", "previousOrg")}
        {renderField("Current Location", "currentLocation")}
        {renderField("Preferred Location", "preferredLocation")}
        {renderField("Notice Period", "noticePeriod")}

        <li>
          <strong>Resume:</strong>{" "}
          {candidate.resumePath ? (
            <a
              href={`http://localhost:5001${candidate.resumePath}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Resume
            </a>
          ) : (
            "Not uploaded"
          )}
        </li>

        <li>
          <strong>Interview Status:</strong>
          <select
            value={interviewStatus}
            onChange={(e) => setInterviewStatus(e.target.value)}
            style={{
              padding: "8px",
              fontSize: "14px",
              width: "100%",
              maxWidth: "300px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              marginTop: "8px",
            }}
          >
            <option value="" disabled>
              Select interview status
            </option>
            <option value="Resume Processed">Resume Processed</option>
            <option value="Resume Processed to client">
              Resume Processed to client
            </option>
            <option value="L1- Tech Discussion">L1- Tech Discussion</option>
            <option value="L2 - Tech Discussion">L2 - Tech Discussion</option>
            <option value="L3 - Project Manager">L3 - Project Manager</option>
            <option value="L4 - HR Discussion">L4 - HR Discussion</option>
            <option value="Offer Release">Offer Release</option>
            <option value="DOJ - Follow up">DOJ - Follow up</option>
          </select>
        </li>
      </ul>

      <button
        onClick={handleStatusSave}
        disabled={savingStatus || !interviewStatus}
        style={{
          marginTop: "12px",
          padding: "10px 16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {savingStatus ? "Saving..." : "Save Interview Status"}
      </button>

      <br />

      <button
        onClick={() => {
          if (isEditing) handleSaveEdit();
          else setIsEditing(true);
        }}
        style={{
          marginTop: "12px",
          padding: "10px 16px",
          backgroundColor: isEditing ? "green" : "#ffc107",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isEditing ? "Save Details" : "Edit Details"}
      </button>

      {saveMessage && (
        <p style={{ marginTop: "10px", color: "green" }}>{saveMessage}</p>
      )}
    </div>
  );
};

export default CandidateDetail;
