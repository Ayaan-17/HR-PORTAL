import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5001/api/admins/login",
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;

      // ✅ Save token and user in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("admin", JSON.stringify(user));

      // Redirect to dashboard based on role
      if (user.role === "superadmin") {
        navigate("/SuperAdminDashboard");
      } else {
        navigate("/AdminDashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
      alert("Invalid email or password");
    }
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;
