import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './student/pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/student/*" element={<StudentDashboard />} />
          <Route path="/dashboard/*" element={<StudentDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;