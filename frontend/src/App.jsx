import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ResultPage from "./pages/ResultPage";
import { useEffect, useState } from "react";
import BackgroundAnimation from "./components/BackgroundAnimation";

function App() {
  console.log("!!! App.jsx: Script Execution Confirmed !!! Version " + new Date().getTime());
  // alert("ConceptWeaver UI Updated!"); // Temporarily disabled to avoid annoyance if it works, but I'll tell user to check console first.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  //check if we already have a token when app loads
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("token");
  };

  return (
<>
      <BackgroundAnimation />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login login={login} />} />
          <Route path="/register" element={<Register login={login} />} />
          <Route path="/dashboard" element={<Dashboard logout={logout} />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </Router>
    </>
  );
}
export default App;