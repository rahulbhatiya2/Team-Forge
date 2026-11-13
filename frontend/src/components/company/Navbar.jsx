import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Fetch original company profile from localStorage / auth state
  const [companyInfo, setCompanyInfo] = useState({
    name: "Company Partner",
    role: "Company Admin",
  });

  useEffect(() => {
    try {
      // Multiple possible storage keys check kar rahe hain taaki original name miss na ho
      const storedUser = localStorage.getItem("user");
      const storedCompanyName = localStorage.getItem("companyName");
      const storedName = localStorage.getItem("nexus_user_name");

      let resolvedName = storedCompanyName || storedName || "";

      if (storedUser) {
        const parsed = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
        resolvedName =
          parsed.companyName ||
          parsed.name ||
          (parsed.firstName ? `${parsed.firstName} ${parsed.lastName || ""}`.trim() : "") ||
          resolvedName ||
          parsed.email?.split("@")[0] ||
          "Company Partner";
      }

      if (resolvedName) {
        setCompanyInfo({
          name: resolvedName,
          role: "Company Admin",
        });
      }
    } catch (err) {
      console.error("Error reading auth session:", err);
    }
  }, []);

  // 2. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("nexus_user_id");
    localStorage.removeItem("companyName");
    navigate("/");
  };

  const navLinks = [
    { label: "Dashboard", path: "/company/dashboard" },
    { label: "Browse Talent", path: "/company/browse-students" },
    { label: "Teams", path: "/company/teams", badge: "Live" },
  ];

  return (
    <header className="co-navbar">
      <div className="co-nav-inner">
        {/* Brand Logo (Text-only, No hex icon) */}
        <Link to="/company/dashboard" className="co-nav-brand">
          <span className="brand-title">Team Forge</span>
          <span className="brand-badge">PRO</span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="co-nav-menu">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`co-nav-item ${isActive ? "active" : ""}`}
              >
                {link.label}
                {link.badge && <span className="co-badge">{link.badge}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="co-nav-actions">
          <Link to="/company/post-project" className="btn-post-project">
            + Post Project
          </Link>

          {/* Profile Pill - Icon Hata Diya Gaya Hai */}
          <div className="profile-menu-container">
            <div
              className="co-profile-pill"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Account Menu"
            >
              <div className="co-profile-text">
                <span className="co-name">{companyInfo.name}</span>
                <span className="co-tier">{companyInfo.role}</span>
              </div>
              <span className={`dropdown-chevron ${showDropdown ? "open" : ""}`}>▾</span>
            </div>

            {/* Logout Dropdown */}
            {showDropdown && (
              <div className="co-dropdown-menu">
                <div className="dropdown-user-header">
                  <strong>{companyInfo.name}</strong>
                  <span className="dropdown-tier-badge">Verified Partner</span>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-logout-btn" onClick={handleLogout}>
                  🚪 Logout Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}