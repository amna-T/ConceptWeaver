import api from "../services/api";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ login }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      login();
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Login failed");
    }
  };

  return (
    // Applied the glass-panel class here
    <div className="glass-panel">
      <h2 style={{ marginBottom: "24px" }}>Welcome Back</h2>
      <form onSubmit={handleLogin} style={{ width: "100%" }}>
        <input
          className="glass-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="glass-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="glow-button" type="submit">Login</button>
      </form>
      <p style={{ marginTop: "20px", color: "#94a3b8" }}>
        Don't have an account? <Link to="/register" style={{ color: "#38bdf8" }}>Register</Link>
      </p>
    </div>
  );
}
