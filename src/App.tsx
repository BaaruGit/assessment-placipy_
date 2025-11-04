import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PTSModule from "./pts/PTSModule";
import StudentDashboard from './student/pages/Dashboard';
import AdminDashboard from './company-admin/pages/Dashboard';
import PTODashboard from "./pto/pages/Dashboard";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/student/*" element={<StudentDashboard />} />
          <Route path="/dashboard/*" element={<StudentDashboard />} />
          <Route path="/pts/*" element={<PTSModule />} />
          <Route path="/company-admin/*" element={<AdminDashboard />} />
          <Route path="/pto/*" element={<PTODashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
