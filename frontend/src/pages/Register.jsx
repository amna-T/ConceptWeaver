import api from "../services/api";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register({ login }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/auth/signup", { name, email, password });
      console.log(response.data);
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Registration failed");
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ marginBottom: "24px" }}>Create Account</h2>
      <form onSubmit={handleRegister} style={{ width: "100%" }}>
        <input
          className="glass-input"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <button className="glow-button" type="submit">Register</button>
      </form>
      <p style={{ marginTop: "20px", color: "#94a3b8" }}>
        Already have an account? <Link to="/login" style={{ color: "#38bdf8" }}>Login</Link>
      </p>
    </div>
  );
}
