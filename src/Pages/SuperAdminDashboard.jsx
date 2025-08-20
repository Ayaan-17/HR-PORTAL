import React from "react";
import { useNavigate } from "react-router-dom";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <h1>SuperAdmin Dashboard</h1>
      <div className="dashboard-actions">
        <button onClick={() => navigate("/Createadminform")}>
          ➕ Create New admin
        </button>
        <button onClick={() => navigate("/Viewadmin")}>
          📋 View Admin List
        </button>
        <button onClick={() => navigate("/ReviewResumes")}>
          Review Resumes
        </button>
        <button onClick={() => navigate("/PostMandate")}>
          Create Job Mandate
        </button>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
