import React, { useState } from "react";
import axios from "axios";
import "../styles/Createadminform.css"; // import the CSS file

const Createadminform = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:5001/api/admins/create", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("✅ Admin created successfully.");
      setFormData({ name: "", email: "", password: "", role: "admin" });
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to create admin. Check console or try again.");
    }
  };

  return (
    <div className="admin-form-container">
      <h2 className="form-heading">Create New Admin</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <input
          type="text"
          name="name"
          placeholder="Admin Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="form-input"
        />

        <input
          type="email"
          name="email"
          placeholder="Admin Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="form-input"
        />

        <input
          type="password"
          name="password"
          placeholder="Admin Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="form-input"
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="form-select"
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>

        <button type="submit" className="submit-button">
          Create Admin
        </button>
      </form>

      {message && <p className="form-message">{message}</p>}
    </div>
  );
};

export default Createadminform;
