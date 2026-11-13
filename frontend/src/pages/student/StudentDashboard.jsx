import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentNavbar from "../../components/students/StudentNavbar";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allocatedCount, setAllocatedCount] = useState(0);

  const [student, setStudent] = useState({
    _id: "",
    name: "Student Candidate",
    firstName: "",
    lastName: "",
    email: "",
    college: "",
    course: "",
    semester: "",
    graduationYear: "",
    scorePercentage: "",
    githubUrl: "",
    linkedinUrl: "",
    preferredRole: "",
    profileCompletion: 70,
    skills: [],
    interests: [],
    previousProjects: [],
  });

  // Fallback ke sath ID nikalna taaki null na rahe
  const storedUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const userId =
    localStorage.getItem("nexus_user_id") ||
    storedUser?._id ||
    storedUser?.id;

  const handleLogout = () => {
    localStorage.removeItem("nexus_user_id");
    localStorage.removeItem("user");
    localStorage.clear();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      if (!userId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/auth/student/${userId}`);
        const data = await response.json();

        let studentId = userId;
        let studentEmail = storedUser?.email || "";

        if (response.ok && data.student) {
          const s = data.student;
          studentId = s._id || userId;
          studentEmail = (s.email || "").toLowerCase().trim();
          const fullName =
            `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student Candidate";

          let score = 25;
          if (s.college) score += 15;
          if (s.preferredRole) score += 15;
          if (s.graduationYear) score += 10;
          if (s.githubUrl || s.linkedinUrl) score += 10;
          if (s.skills && s.skills.length > 0) score += 15;
          if (s.previousProjects && s.previousProjects.length > 0) score += 10;

          if (isMounted) {
            setStudent({
              ...s,
              name: fullName,
              profileCompletion: Math.min(score, 100),
            });
          }
        }

        // Fetch squad allocation count
        const projRes = await fetch("http://localhost:5000/api/projects/all");
        const projData = await projRes.json();
        if (projRes.ok && Array.isArray(projData.projects)) {
          const matchedCount = projData.projects.filter((p) =>
            (p.matchedSquad || []).some(
              (m) =>
                (m.studentId && m.studentId.toString() === studentId.toString()) ||
                (m.email && m.email.toLowerCase().trim() === studentEmail)
            )
          ).length;
          if (isMounted) setAllocatedCount(matchedCount);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="stu-shell" style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <p style={{ color: "#ffffff", fontWeight: 700 }}>Loading verified workspace...</p>
      </div>
    );
  }

  const metricsData = [
    { id: 1, title: "Verified Skills", value: student.skills?.length || 0, tag: "Profile", icon: "↗", action: () => navigate("/student/profile") },
    { id: 2, title: "Squad Allocations", value: allocatedCount, tag: "Live", icon: "👥", action: () => navigate("/student/my-team") },
    { id: 3, title: "Profile Strength", value: `${student.profileCompletion}%`, tag: "Synergy", icon: "◎", action: () => navigate("/student/profile") },
    { id: 4, title: "Showcased Projects", value: student.previousProjects?.length || 0, tag: "Portfolio", icon: "▤", action: () => navigate("/student/profile") }
  ];

  return (
    <div className="stu-shell">
      <StudentNavbar activeTab="home" student={student} onLogout={handleLogout} />

      <main className="stu-container">
        {/* Top Hero Banner */}
        <section className="stu-hero-banner">
          <div className="hero-inner-layout">
            <div className="hero-left">
              <div className="stu-pill-live">
                <span className="pulse-dot" /> STUDENT WORKSPACE <span className="eyebrow-divider">/</span> TEAM INTELLIGENCE
              </div>
              <h1>
                Build your profile.<br />
                <span className="gold-text">Get matched with teams.</span>
              </h1>
              <p className="hero-subtext">
                Your skills, academic credentials, and project portfolio — thoughtfully organised in one verified student profile.
              </p>
              <div className="hero-action-row">
                <button
                  type="button"
                  className="stu-btn-primary"
                  onClick={() => navigate("/student/my-team")}
                >
                  <span>Go to My Team</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  className="stu-btn-ghost"
                  onClick={() => navigate("/student/profile")}
                >
                  View Full Profile
                </button>
              </div>
            </div>

            <div className="hero-aside" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit-core"><span>n</span></div>
              <div className="orbit-label orbit-label-top"><span className="mini-dot" /> SKILLS, VERIFIED</div>
              <div className="orbit-label orbit-label-bottom">STRONGER TEAMS BY DESIGN</div>
            </div>
          </div>
        </section>

        {/* Lower Shelf */}
        <div className="stu-main-content">
          <div className="metrics-strip">
            {metricsData.map((m, idx) => (
              <div className="metric-cell" key={m.id} onClick={m.action}>
                <div className="m-top-row">
                  <span className="m-icon">{m.icon}</span>
                  <span className="trend-pill">
                    <span className="trend-dot" />
                    {m.tag}
                  </span>
                </div>
                <h3 className="m-val">{m.value}</h3>
                <p className="m-lbl">{m.title}</p>
                <span className="m-index">0{idx + 1}</span>
              </div>
            ))}
          </div>

          <div className="content-grid-wrap">
            <div className="section-card">
              <div className="card-top-row">
                <div>
                  <span className="section-kicker">YOUR CREDENTIALS</span>
                  <h3>Academic & Track Overview</h3>
                  <p className="card-desc">Information visible to algorithmic engines and team sponsors</p>
                </div>
                <button
                  type="button"
                  className="text-cta"
                  onClick={() => navigate("/student/profile")}
                >
                  Open Full Profile →
                </button>
              </div>

              <div className="overview-stats-grid">
                <div className="overview-item">
                  <span className="p-lbl">College & Batch</span>
                  <p>{student.college || "College not set"} ({student.graduationYear || "Batch"})</p>
                </div>
                <div className="overview-item">
                  <span className="p-lbl">Degree & Semester</span>
                  <p>{student.course || "MCA"} • {student.semester || "Semester"}</p>
                </div>
                <div className="overview-item">
                  <span className="p-lbl">Target Role Track</span>
                  <p className="gold-text">{student.preferredRole || "Developer"}</p>
                </div>
                <div className="overview-item">
                  <span className="p-lbl">Profiles</span>
                  <p>
                    {student.githubUrl && <a href={student.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#1b4332", marginRight: "12px", textDecoration: "none", fontWeight: 700 }}>GitHub ↗</a>}
                    {student.linkedinUrl && <a href={student.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "#2f6cb3", textDecoration: "none", fontWeight: 700 }}>LinkedIn ↗</a>}
                    {!student.githubUrl && !student.linkedinUrl && <span>None provided</span>}
                  </p>
                </div>
                <div className="overview-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="p-lbl">Registered Technical Skills</span>
                  <div className="proj-skills-wrap">
                    {student.skills && student.skills.length > 0 ? (
                      student.skills.map((s) => (
                        <span className="skill-chip" key={s.name}>
                          {s.name} ({s.level || "Intermediate"})
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: "12px", color: "#738477" }}>No skills added yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}