import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/testsignup";
import Dashboard from "./pages/company/Dashboard";
import BrowseStudents from "./pages/company/BrowseStudents";
import PostProject from "./pages/company/postProject";
import TeamsManagement from "./pages/company/TeamsManagement";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentOnboarding from "./pages/student/StudentOnboarding";
import StudentMyTeam from "./pages/student/StudentMyTeam";
import StudentApplications from "./pages/student/StudentApplications";
import StudentProfile from "./pages/student/StudentProfile"; // 1. Import Profile page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth / Landing */}
        <Route path="/" element={<Signup />} />

        {/* Company Routes */}
        <Route path="/company/dashboard" element={<Dashboard />} />
        <Route path="/company/browse-students" element={<BrowseStudents />} />
        <Route path="/company/browse" element={<Navigate to="/company/browse-students" replace />} />
        <Route path="/company/post-project" element={<PostProject />} />
        <Route path="/company/teams" element={<TeamsManagement />} />
        <Route path="/company/projects" element={<Navigate to="/company/teams" replace />} />

        {/* Student Flow Routes */}
        <Route path="/student/onboarding" element={<StudentOnboarding />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/my-team" element={<StudentMyTeam />} />
        <Route path="/student/applications" element={<StudentApplications />} />
        <Route path="/student/profile" element={<StudentProfile />} /> {/* 2. Added Profile Route */}

        {/* 404 Wildcard Catch */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;