import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PdfUploader from "../components/PdfUploader";
import axios from "axios";

export default function Dashboard({ logout }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get("http://localhost:8000/documents");
        if (response.data.documents) {
          setHistory(response.data.documents);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const Logout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '500px', marginTop: '10vh' }}>
      <h2 style={{ marginBottom: "10px" }}>Knowledge Explorer</h2>
      <p style={{ color: "#94a3b8", marginBottom: "30px" }}>Upload a document to weave its concepts</p>

      <PdfUploader />

      <div style={{ marginTop: '40px', textAlign: 'left' }}>
        <h3 style={{ fontSize: '14px', color: '#6366f1', letterSpacing: '2px', marginBottom: '15px' }}>RECENT ANALYSES</h3>
        
        {isLoading ? (
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>Loading history...</p>
        ) : history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((doc, index) => (
              <div 
                key={index}
                onClick={() => navigate("/result", { state: { concepts: doc.concepts, filename: doc.filename } })}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  transition: 'all 0.2s'
                }}
                className="history-item"
              >
                📄 {doc.filename}
                <span style={{ float: 'right', opacity: 0.3 }}>→</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>No history found yet.</p>
        )}
      </div>

      <button
        onClick={Logout}
        style={{
          marginTop: "40px",
          background: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8",
          padding: "8px 16px",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Logout
      </button>
    </div>
  );
}
