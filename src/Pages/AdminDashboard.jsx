import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [mandates, setMandates] = useState([]); // assigned but NOT completed
  const [completedMandates, setCompletedMandates] = useState([]); // completed mandates
  const [activeMandate, setActiveMandate] = useState(null);
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem("admin"));
    if (!admin) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem("admin"));
    const adminId = admin?.id;

    const fetchAssignedMandates = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/jobMandates/assigned/${adminId}`
        );
        // Filter out completed mandates (assuming completed have status 'done')
        const filtered = res.data.filter((m) => m.status !== "done");
        setMandates(filtered);
      } catch (err) {
        console.error("Error fetching assigned mandates:", err);
      }
    };

    const fetchCompletedMandates = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/jobMandates/admin/completed-mandates/${adminId}`
        );
        setCompletedMandates(res.data);
      } catch (err) {
        console.error("Error fetching completed mandates:", err);
      }
    };

    const fetchActiveMandate = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/jobMandates/admins/${adminId}/active-mandate`
        );
        setActiveMandate(res.data);
      } catch (err) {
        console.error("Error fetching active mandate:", err);
      }
    };

    if (adminId) {
      fetchAssignedMandates();
      fetchCompletedMandates();
      fetchActiveMandate();
    }
  }, []);

  useEffect(() => {
    console.log("Mandates:", mandates);
    console.log("Completed Mandates:", completedMandates);
  }, [mandates, completedMandates]);

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(
          "http://localhost:5001/api/admins/logout",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to logout.");
    }
  };

  const handleSelectMandate = (mandate) => {
    setSelectedMandate(mandate);
    setShowModal(true);
  };

  const handleProceed = async (mandate) => {
    const admin = JSON.parse(localStorage.getItem("admin"));
    try {
      const res = await axios.post(
        "http://localhost:5001/api/jobMandates/start-mandate",
        { adminId: admin.id, mandateId: mandate.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message || "Mandate started successfully.");
      localStorage.setItem("selectedMandate", JSON.stringify(mandate));
      navigate("/MandateWork");
    } catch (err) {
      alert(err.response?.data?.message || "Error starting mandate.");
    }
  };

  const handleContinueMandate = () => {
    if (activeMandate) {
      localStorage.setItem("selectedMandate", JSON.stringify(activeMandate));
      navigate("/MandateWork");
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="dashboard-body">
        <div className="dashboard-actions">
          <button onClick={() => navigate("/registercandidate")}>
            ➕ Register New Candidate
          </button>
          <button onClick={() => navigate("/candidatelist")}>
            📋 View Candidate List
          </button>
          <button className="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        {activeMandate && (
          <div className="active-mandate-card">
            <h3>Active Mandate</h3>
            <p>
              <strong>{activeMandate.job_title}</strong>
            </p>
            <p>Skills: {activeMandate.primary_skills}</p>
            <p>Deadline: {new Date(activeMandate.deadline).toLocaleString()}</p>
            <button onClick={handleContinueMandate}>▶ Continue Mandate</button>
          </div>
        )}

        <div className="mandates-panel">
          <h3>Assigned Job Mandates</h3>
          {mandates.length === 0 && <p>No mandates assigned yet.</p>}
          {mandates.map((mandate) => (
            <div key={mandate.id} className="mandate-card">
              <p>
                <strong>{mandate.job_title}</strong>
              </p>
              <p>Skills: {mandate.primary_skills}</p>
              <p>Deadline: {new Date(mandate.deadline).toLocaleString()}</p>
              <button onClick={() => handleSelectMandate(mandate)}>
                Select Mandate
              </button>
            </div>
          ))}
        </div>

        <div className="mandates-panel">
          <h3>Completed Mandates</h3>
          {completedMandates.length === 0 && <p>No completed mandates yet.</p>}
          {completedMandates.map((mandate) => (
            <div
              key={mandate.id}
              className="mandate-card completed-mandate cursor-pointer hover:bg-gray-100"
              onClick={() =>
                navigate(`/admin/completed-mandates/${mandate.id}/details`)
              }
            >
              <p>
                <strong>{mandate.job_title}</strong>
              </p>
              <p>
                Status: <strong>{mandate.status}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h4>Proceed with this mandate?</h4>
            <p>
              <strong>{selectedMandate?.job_title}</strong>
            </p>
            <div className="modal-buttons">
              <button onClick={() => handleProceed(selectedMandate)}>
                Proceed
              </button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
