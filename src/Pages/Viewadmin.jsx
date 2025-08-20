import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Viewadmin.css";
import { useNavigate } from "react-router-dom";

const Viewadmin = () => {
  const [admins, setAdmins] = useState([]);
  const navigate = useNavigate(); // ✅ Moved inside the component
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/admins/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdmins(res.data);
      } catch (err) {
        console.error("Error fetching admins:", err);
        alert("Failed to fetch admin list.");
      }
    };

    fetchAdmins();
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;

    try {
      await axios.delete(`http://localhost:5001/api/admins/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins((prev) => prev.filter((admin) => admin.id !== id));
    } catch (err) {
      console.error("Error deleting admin:", err);
      alert("Failed to delete admin.");
    }
  };

  const formatDateTime = (datetime) => {
    return datetime
      ? new Date(datetime).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never";
  };

  return (
    <div className="admin-list-container">
      <h2 className="admin-list-heading">Admin List</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.id}</td>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
              <td>{admin.role}</td>

              <td>
                <button
                  className="view-button"
                  onClick={() => navigate(`/AdminDetails/${admin.id}`)}
                >
                  View
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(admin.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {admins.length === 0 && (
            <tr>
              <td colSpan="7" className="no-admins">
                No admins found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Viewadmin;
