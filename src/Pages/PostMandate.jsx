// src/pages/superadmin/PostMandate.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/PostMandate.css";

const PostMandate = () => {
  const [formData, setFormData] = useState({
    jobTitle: "",
    primarySkills: "",
    experienceRequired: "",
    location: "",
    positions: "",
    assignedAdminId: "",
    deadline: "",
  });

  const [admins, setAdmins] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch admin list on mount
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const token = localStorage.getItem("token"); // get token from localStorage

        const res = await axios.get("http://localhost:5001/api/admins/all", {
          headers: {
            Authorization: `Bearer ${token}`, // pass token in header
          },
        });

        setAdmins(res.data);
      } catch (error) {
        console.error("Failed to fetch admins", error);
      }
    };
    fetchAdmins();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5001/api/jobMandates", {
        job_title: formData.jobTitle,
        primary_skills: formData.primarySkills,
        experience_required: parseInt(formData.experienceRequired),
        location: formData.location,
        positions: parseInt(formData.positions),
        assigned_admin_id: parseInt(formData.assignedAdminId),
        deadline: formData.deadline,
      });

      setMessage("Job mandate posted successfully.");
      setFormData({
        jobTitle: "",
        primarySkills: "",
        experienceRequired: "",
        location: "",
        positions: "",
        assignedAdminId: "",
        deadline: "",
      });
    } catch (error) {
      console.error("Failed to post job mandate", error);
      setMessage("Failed to post job mandate.");
    }
  };

  return (
    <div className="post-mandate-container">
      <h2 className="post-mandate-title">Post a Job Mandate</h2>
      <form onSubmit={handleSubmit} className="post-mandate-form">
        <input
          type="text"
          name="jobTitle"
          placeholder="Job Title"
          value={formData.jobTitle}
          onChange={handleChange}
          className="post-mandate-input"
          required
        />

        <input
          type="text"
          name="primarySkills"
          placeholder="Primary Skills (comma-separated)"
          value={formData.primarySkills}
          onChange={handleChange}
          className="post-mandate-input"
          required
        />

        <input
          type="number"
          name="experienceRequired"
          placeholder="Experience Required (years)"
          value={formData.experienceRequired}
          onChange={handleChange}
          className="post-mandate-input"
          required
        />

        <input
          type="text"
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
          className="post-mandate-input"
          required
        />

        <input
          type="number"
          name="positions"
          placeholder="Number of Positions"
          value={formData.positions}
          onChange={handleChange}
          className="post-mandate-input"
          required
        />

        <select
          name="assignedAdminId"
          value={formData.assignedAdminId}
          onChange={handleChange}
          className="post-mandate-select"
          required
        >
          <option value="">Select Admin</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name} ({admin.email})
            </option>
          ))}
        </select>

        <div>
          <label className="post-mandate-label">Deadline</label>
          <input
            type="datetime-local"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className="post-mandate-input"
            required
          />
        </div>

        <button type="submit" className="post-mandate-button">
          Submit Mandate
        </button>
      </form>

      {message && <p className="post-mandate-message">{message}</p>}
    </div>
  );
};

export default PostMandate;
