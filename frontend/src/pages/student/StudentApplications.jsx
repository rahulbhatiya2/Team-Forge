import React, { useState, useEffect } from "react";
import StudentNavbar from "../../components/students/StudentNavbar";
import "./StudentApplications.css";

export default function StudentApplications() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [allMatchedProjects, setAllMatchedProjects] = useState([]);

  const storedUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const userId =
    localStorage.getItem("nexus_user_id") ||
    storedUser?._id ||
    storedUser?.id;

  useEffect(() => {
    let isMounted = true;

    const fetchAllApplications = async () => {
      if (!userId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const profileRes = await fetch(`http://localhost:5000/api/auth/student/${userId}`);
        const profileData = await profileRes.json();

        let sId = userId;
        let sEmail = (storedUser?.email || "").toLowerCase().trim();

        if (profileRes.ok && profileData.student) {
          const s = profileData.student;
          sId = s._id || userId;
          sEmail = (s.email || "").toLowerCase().trim();
          if (isMounted) {
            setStudent({
              ...s,
              name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
            });
          }
        }

        const projRes = await fetch("http://localhost:5000/api/projects/all");
        const projData = await projRes.json();

        if (projRes.ok && Array.isArray(projData.projects)) {
          const assigned = projData.projects.filter((p) =>
            (p.matchedSquad || []).some(
              (m) =>
                (m.studentId && m.studentId.toString() === sId.toString()) ||
                (m.email && m.email.toLowerCase().trim() === sEmail)
            )
          );
          if (isMounted) {
            setAllMatchedProjects(
              assigned.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            );
          }
        }
      } catch (err) {
        console.error("Applications fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllApplications();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="apps-page-shell apps-loading-screen">
        <p>Loading projects & applications...</p>
      </div>
    );
  }

  return (
    <div className="apps-page-shell">
      <StudentNavbar activeTab="applications" student={student} />

      <main className="apps-container">
        <section className="apps-hero">
          <div className="apps-hero-inner">
            <div className="pill-live">
              <span className="dot" /> ALLOCATED HISTORY
            </div>
            <h1>All Projects & Applications</h1>
            <p className="apps-hero-sub">
              Badha capstone projects ane allocations no archive jya tame company dwara squad ma shortlist thayela chho.
            </p>
          </div>
        </section>

        <div className="apps-content-shelf">
          {allMatchedProjects.length === 0 ? (
            <div className="apps-empty-card">
              <div className="empty-icon">📁</div>
              <h2>Haji Koi Project Record Nathi</h2>
              <p>Tame haji sudhi koi project squad ma allocate thaya nathi.</p>
            </div>
          ) : (
            <div className="apps-list-wrap">
              {allMatchedProjects.map((proj) => {
                const myRole = (proj.matchedSquad || []).find(
                  (m) =>
                    (m.studentId && m.studentId.toString() === (student?._id || userId)?.toString()) ||
                    (m.email && m.email.toLowerCase().trim() === (student?.email || storedUser?.email || "").toLowerCase().trim())
                );
                const isCompleted = proj.status === "Completed";

                return (
                  <article className={`app-record-card ${isCompleted ? "is-completed" : ""}`} key={proj._id}>
                    <div className="arc-top">
                      <div className="arc-meta">
                        <span className="company-badge">🏛️ {proj.companyName || "Enterprise Partner"}</span>
                        <span className="type-badge">{proj.type || "Industry Capstone"}</span>
                        <span className={`status-badge ${isCompleted ? "completed" : "open"}`}>
                          ● {isCompleted ? "Completed Project" : proj.status || "Active / In Progress"}
                        </span>
                      </div>

                      {myRole?.matchScore && (
                        <div className="arc-score-badge">
                          <span className="score-val">{myRole.matchScore}%</span>
                          <span className="score-lbl">Synergy Match</span>
                        </div>
                      )}
                    </div>

                    <div className="arc-body">
                      <h2 className="arc-title">{proj.title}</h2>
                      <p className="arc-desc">{proj.description}</p>
                    </div>

                    <div className="arc-footer">
                      <div className="arc-footer-left">
                        <div className="arc-role-pill">
                          <span className="lbl">Your Assigned Role:</span>
                          <strong>{myRole?.role || "Software Developer"}</strong>
                        </div>

                        {proj.requiredSkills && proj.requiredSkills.length > 0 && (
                          <div className="arc-skills-row">
                            <span className="skills-lbl">Stack:</span>
                            {proj.requiredSkills.map((sk) => (
                              <span className="skill-pill" key={sk}>{sk}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="arc-date-badge">
                        Allocated: {new Date(proj.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}