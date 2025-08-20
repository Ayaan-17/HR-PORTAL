import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "../styles/AdminDetails.css"; // Optional styling

const AdminDetail = () => {
  const { id } = useParams();
  const [admin, setAdmin] = useState(null);
  const [logs, setLogs] = useState([]);

  const token = localStorage.getItem("token");

  const formatDateTime = (datetime) =>
    new Date(datetime).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/admins/byid/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAdmin(res.data);
      } catch (err) {
        console.error("Error fetching admin:", err);
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/admins/logs/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setLogs(res.data);
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    };

    fetchAdmin();
    fetchLogs();
  }, [id, token]);

  if (!admin) return <div>Loading admin details...</div>;

  return (
    <div className="admin-detail-container">
      <h2>Admin Details</h2>
      <p>
        <strong>Name:</strong> {admin.name}
      </p>
      <p>
        <strong>Email:</strong> {admin.email}
      </p>
      <p>
        <strong>Role:</strong> {admin.role}
      </p>

      <h3>Login/Logout Logs</h3>
      {logs.length === 0 ? (
        <p>No logs available.</p>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>Login Time</th>
              <th>Logout Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr
                key={index}
                className={!log.logout_time ? "active-session" : ""}
              >
                <td>{formatDateTime(log.login_time)}</td>
                <td>
                  {log.logout_time
                    ? formatDateTime(log.logout_time)
                    : "Still Logged In"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDetail;
