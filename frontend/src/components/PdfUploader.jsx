import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid rgba(99, 102, 241, 0.2)",
  borderTop: "4px solid #6366f1",
  borderRadius: "50%",
  animation: "spin 0.9s linear infinite",
  margin: "0 auto 12px auto",
};
const spinnerKeyframes = `
  @keyframes spin {
    0% {transform: rotate(0deg);}
    100% {transform: rotate(360deg);}
    }
    `;
const PdfUploader = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleProcess = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setIsProcessing(true);
    console.log("🚀 Sending PDF to AI Brain...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Call the Python FastAPI server on port 8000
      const response = await axios.post("http://localhost:8000/process-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      console.log("✅ Concept Extraction Complete:", response.data);

      // Pass the extracted concepts to the result page
      navigate("/result", {
        state: {
          concepts: response.data.concepts,
          filename: response.data.filename
        }
      });

    } catch (err) {
      console.error("❌ Processing failed:", err);
      if (!err.response) {
        //network error backend offline
        setError("Cannot reach the AI server. Make sure python is running")
      }
      else {
        //server returned error
        setError(`server error: ${err.response.data.detail}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  if (!document.getElementById('spinner-style')) {
    const styleE1 = document.createElement('style');
    styleE1.id = 'spinner-style';
    styleE1.innerHTML = spinnerKeyframes;
    document.head.appendChild(styleE1);
  }
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      {isProcessing ? (
        <div style={{ marginBottom: '20px' }}>
          <div style={spinnerStyle}></div>
          <p style={{ color: '#818cf8', fontSize: '14px', margin: 0 }}>🧠 AI is analyzing your PDF...</p>
        </div>
      ) : (
        <h3 style={{ fontSize: "16px", marginBottom: "15px", color: "#e2e8f0" }}>
          Select PDF to Analyze
        </h3>
      )}


      <label className="glass-input" style={{
        display: "block",
        cursor: "pointer",
        borderStyle: isProcessing ? "solid" : "dashed",
        color: isProcessing ? "#4f46e5" : "#94a3b8",
        opacity: isProcessing ? 0.6 : 1,
        marginBottom: "20px",
        pointerEvents: isProcessing ? "none" : "auto"
      }}>
        {file ? `📄 ${file.name}` : "Click to select a PDF"}
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ display: "none" }}
          disabled={isProcessing}
        />
      </label>

      <button
        className="glow-button"
        onClick={handleProcess}
        disabled={isProcessing}
        style={{ opacity: isProcessing ? 0.5 : 1 }}
      >
        {isProcessing ? "Processing..." : "Process PDF"}
      </button>
    </div>
  )
};

export default PdfUploader;