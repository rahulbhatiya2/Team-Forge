import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentNavbar.css";

export default function StudentNavbar({ activeTab = "home", student = {}, onLogout }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tab navigation handler
  const handleTabClick = (tabId) => {
    setDropdownOpen(false);
    if (tabId === "home") navigate("/student/dashboard");
    else if (tabId === "team") navigate("/student/my-team");
    else if (tabId === "applications") navigate("/student/applications");
    else if (tabId === "profile") navigate("/student/profile");
  };

  // Logout handler
  const handleLogout = () => {
    setDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("nexus_user_id");
      localStorage.removeItem("user");
      localStorage.clear();
      navigate("/", { replace: true });
    }
  };

  // Bahar click karne par dropdown close ho jaye
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "ST";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className="stu-navbar">
      <div className="stu-nav-inner">
        {/* Brand */}
        <div className="stu-brand" onClick={() => handleTabClick("home")}>
          <span className="stu-brand-hex">⬡</span>
          <span className="stu-brand-name">Team Forge</span>
          <span className="stu-role-badge">STUDENT</span>
        </div>

        {/* Center Navigation Links */}
        <nav className="stu-nav-menu">
          <button
            type="button"
            className={`stu-nav-btn ${activeTab === "home" ? "active" : ""}`}
            onClick={() => handleTabClick("home")}
          >
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`stu-nav-btn ${activeTab === "team" ? "active" : ""}`}
            onClick={() => handleTabClick("team")}
          >
            <span>My Team</span>
            <span className="stu-tab-badge">Active</span>
          </button>

          <button
            type="button"
            className={`stu-nav-btn ${activeTab === "applications" ? "active" : ""}`}
            onClick={() => handleTabClick("applications")}
          >
            <span>All Applications</span>
          </button>

          <button
            type="button"
            className={`stu-nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => handleTabClick("profile")}
          >
            <span>Profile</span>
          </button>
        </nav>

        {/* Right: Profile Pill with Logout Dropdown */}
        <div className="stu-nav-actions" ref={dropdownRef}>
          <div className="stu-profile-container">
            <div
              className={`stu-user-pill ${dropdownOpen ? "active" : ""}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <div className="stu-avatar-initials">
                {getInitials(student?.name)}
              </div>
              <div className="stu-user-meta">
                <span className="stu-user-name">{student?.name || "Student"}</span>
                <span className="stu-user-course">
                  {student?.course || "MCA"} · {student?.semester || "Sem 3"}
                </span>
              </div>
              <span className={`stu-dropdown-chevron ${dropdownOpen ? "open" : ""}`}>▾</span>
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="stu-dropdown-card">
                <div className="stu-dropdown-user-header">
                  <strong>{student?.name || "Student Candidate"}</strong>
                  <span className="stu-dropdown-sub">{student?.email || "Student Account"}</span>
                </div>

               

                {/* Logout Button */}
                <button
                  type="button"
                  className="stu-dropdown-logout-btn"
                  onClick={handleLogout}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}