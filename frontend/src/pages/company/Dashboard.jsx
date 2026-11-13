import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/company/Navbar";
import "./dashboard.css";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectSquad, setSelectedProjectSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const companyId = localStorage.getItem("nexus_user_id") || storedUser?._id || storedUser?.id;
  const companyName = storedUser?.companyName || localStorage.getItem("companyName");

  const [statsData, setStatsData] = useState([
    { id: 1, title: "Total Talent Pool", value: "—", trend: "Live DB", tag: "Registered" },
    { id: 2, title: "Active Requisitions", value: "—", trend: "Active", tag: "Forming" },
    { id: 3, title: "Avg. Match Score", value: "—", trend: "Synergy", tag: "Synergy" },
    { id: 4, title: "Time to Staff", value: "—", trend: "Algorithmic", tag: "Automated" },
  ]);

  const [synergyData, setSynergyData] = useState([
    { label: "Frontend", value: 0 },
    { label: "Backend", value: 0 },
    { label: "Design", value: 0 },
    { label: "QA/Testing", value: 0 },
  ]);

  const [skillGapAlert, setSkillGapAlert] = useState("Analyzing pool balance...");

  const fetchDashboardData = async () => {
    try {
      const projUrl = companyId 
        ? `http://localhost:5000/api/projects/all?companyId=${companyId}`
        : "http://localhost:5000/api/projects/all";

      const statsUrl = companyId
        ? `http://localhost:5000/api/projects/dashboard-stats?companyId=${companyId}`
        : "http://localhost:5000/api/projects/dashboard-stats";

      const [projRes, statsRes] = await Promise.allSettled([
        fetch(projUrl),
        fetch(statsUrl),
      ]);

      if (projRes.status === "fulfilled" && projRes.value.ok) {
        const projData = await projRes.value.json();
        if (projData.projects) {
          const myProjects = projData.projects.filter((p) => {
            if (!companyId && !companyName) return true;
            const matchesId = p.companyId && String(p.companyId) === String(companyId);
            const matchesName = companyName && p.companyName?.toLowerCase().trim() === companyName.toLowerCase().trim();
            return matchesId || matchesName;
          });
          setProjects(myProjects);
        }
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const statsResData = await statsRes.value.json();
        if (statsResData.stats) {
          const rawScore = statsResData.stats.avgMatchScore;
          const formattedScore = rawScore != null
            ? String(rawScore).endsWith("%") ? String(rawScore) : `${rawScore}%`
            : "—";

          setStatsData([
            { 
              id: 1, 
              title: "Total Talent Pool", 
              value: statsResData.stats.totalTalent ?? "—", 
              trend: "Live DB", 
              tag: "Registered" 
            },
            { 
              id: 2, 
              title: "Active Requisitions", 
              value: statsResData.stats.activeRequisitions ?? "—", 
              trend: "Active", 
              tag: "Forming" 
            },
            { 
              id: 3, 
              title: "Avg. Match Score", 
              value: formattedScore, 
              trend: "AI Match", 
              tag: "Synergy" 
            },
            { 
              id: 4, 
              title: "Time to Staff", 
              value: statsResData.stats.timeToStaff ?? "—", 
              trend: "Instant Match", 
              tag: "Automated" 
            },
          ]);

          if (statsResData.synergyData) setSynergyData(statsResData.synergyData);
          if (statsResData.skillGap) setSkillGapAlert(statsResData.skillGap);
        }
      }
    } catch (err) {
      console.error("Dashboard metrics fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [companyId]);

  const handleLockSquad = async (projectId) => {
    try {
      setIsLocking(true);
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Locked" }),
      });

      if (res.ok) {
        setSelectedProjectSquad((prev) => (prev ? { ...prev, status: "Locked" } : null));
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Lock squad action failed:", err);
    } finally {
      setIsLocking(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      const matchesSearch = proj.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const isLocked = proj.status === "Locked";
      if (statusFilter === "locked") return matchesSearch && isLocked;
      if (statusFilter === "in-progress") return matchesSearch && !isLocked;
      return matchesSearch;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="nexus-dashboard">
      <div className="nexus-main">
        <Navbar />

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="status-dot" /> COMPANY WORKSPACE <span className="eyebrow-divider">/</span> TEAM INTELLIGENCE
              </div>
              <h1 className="hero-title">
                Build the right team.<br />
                <span className="text-gradient">Do your best work.</span>
              </h1>
              <p className="hero-subtitle">
                Your projects, talent pipeline and team formations — thoughtfully organised in one dynamic dashboard.
              </p>
              <div className="hero-actions">
                <Link to="/company/post-project" className="hero-cta">
                  <span>Create a project</span>
                  <span className="cta-icon" aria-hidden="true">↗</span>
                </Link>
                <span className="hero-note">Live algorithmic matching enabled</span>
              </div>
            </div>

            <div className="hero-aside" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit-core"><span>n</span></div>
              <div className="orbit-label orbit-label-top"><span className="mini-dot" /> PEOPLE, ALIGNED</div>
              <div className="orbit-label orbit-label-bottom">STRONGER TEAMS BY DESIGN</div>
            </div>
          </div>
        </section>

        <div className="content-wrapper">
          {/* Stats Bar */}
          <div className="stats-container">
            {statsData.map((stat, index) => (
              <div className={`stat-glass-card stat-card-${index + 1}`} key={stat.id}>
                <div className="stat-card-inner">
                  <div className="stat-top">
                    <span className="icon-box" aria-hidden="true">
                      {["↗", "▤", "◎", "⏱"][index]}
                    </span>
                    <span className="trend-pill">
                      <span className="trend-dot" />
                      {stat.tag}
                    </span>
                  </div>
                  {loading ? (
                    <div className="shimmer-placeholder shimmer-stat-val" />
                  ) : (
                    <h3 className="stat-value">{stat.value}</h3>
                  )}
                  <p className="stat-title">{stat.title}</p>
                  <span className="stat-index">0{index + 1}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bento Grid */}
          <div className="bento-grid">
            <div className="bento-col main-col">
              <div className="bento-card">
                <div className="card-header">
                  <div>
                    <span className="section-kicker">YOUR PIPELINE</span>
                    <h2>Your projects in motion</h2>
                    <p className="card-description">Track live candidate allocations for projects posted by your company.</p>
                  </div>
                  <Link to="/company/post-project" className="btn-primary-sm">
                    <span aria-hidden="true">＋</span> New project
                  </Link>
                </div>

                {/* Filter and Search Bar */}
                <div className="pipeline-controls">
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search your project title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="filter-pill-group">
                    <button
                      className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                      onClick={() => setStatusFilter("all")}
                    >
                      All ({projects.length})
                    </button>
                    <button
                      className={`filter-pill ${statusFilter === "in-progress" ? "active" : ""}`}
                      onClick={() => setStatusFilter("in-progress")}
                    >
                      Active
                    </button>
                    <button
                      className={`filter-pill ${statusFilter === "locked" ? "active" : ""}`}
                      onClick={() => setStatusFilter("locked")}
                    >
                      Locked
                    </button>
                  </div>
                </div>

                {/* Projects List */}
                <div className="candidate-list">
                  {loading ? (
                    [1, 2, 3].map((n) => (
                      <div className="shimmer-card" key={n}>
                        <div className="shimmer-avatar" />
                        <div className="shimmer-text-block">
                          <div className="shimmer-line line-title" />
                          <div className="shimmer-line line-sub" />
                        </div>
                      </div>
                    ))
                  ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((proj) => {
                      const squadCount = proj.matchedSquad?.length || 0;
                      const isLocked = proj.status === "Locked";

                      return (
                        <div className="candidate-row-modern" key={proj._id}>
                          <div className="c-avatar">
                            {(proj.title || "P").trim().charAt(0).toUpperCase()}
                          </div>

                          <div className="c-info">
                            <h4>{proj.title}</h4>
                            <p>
                              <span className="capacity-label">TEAM CAPACITY</span>
                              <strong>{squadCount} of {proj.teamSize || "—"}</strong>
                              <span className={`project-status ${isLocked ? "is-locked" : "is-active"}`}>
                                <span className="status-dot" />
                                {isLocked ? "Team locked" : "In progress"}
                              </span>
                            </p>
                          </div>

                          <div className="c-skills">
                            {(proj.requiredSkills || []).slice(0, 3).map((s) => (
                              <span key={s} className="skill-chip">{s}</span>
                            ))}
                            {(proj.requiredSkills || []).length > 3 && (
                              <span className="skill-chip more-chip">+{proj.requiredSkills.length - 3}</span>
                            )}
                          </div>

                          <button
                            className="btn-action-outline"
                            onClick={() => setSelectedProjectSquad(proj)}
                          >
                            <span>Inspect squad</span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state-box">
                      <div className="empty-mark">＋</div>
                      <h4>No projects found</h4>
                      <p>
                        {searchQuery ? "Try refining your search keyword or active filters." : "Create your first project brief to begin automated matching."}
                      </p>
                      <Link to="/company/post-project" className="empty-link">Create new project brief →</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Synergy Radar */}
            <div className="bento-col side-col">
              <div className="bento-card">
                <div className="card-header">
                  <div>
                    <span className="section-kicker">TALENT OVERVIEW</span>
                    <h2>Skill distribution</h2>
                  </div>
                  <span className="info-tooltip" title="Relative skill presence in the talent network">i</span>
                </div>
                <p className="sub-text">Live view of specialized capabilities across registered talent pool.</p>

                <div className="synergy-bars">
                  {synergyData.map((item) => (
                    <div className="syn-bar-wrap" key={item.label}>
                      <div className="syn-labels">
                        <span className="syn-tech">{item.label}</span>
                        <span className={`syn-value ${item.value < 50 ? "text-red" : ""}`}>
                          {item.value}%
                        </span>
                      </div>
                      <div className="syn-track">
                        <div
                          className={`syn-fill ${item.value < 50 ? "bg-red" : "bg-gradient"}`}
                          style={{ width: `${Math.min(item.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="alert-box">
                  <span className="alert-icon">⚡</span>
                  <div>
                    <div className="alert-title">Pool Intelligence Insight</div>
                    <p>{skillGapAlert}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Squad Modal */}
      {selectedProjectSquad && (
        <div className="modal-backdrop" onClick={() => setSelectedProjectSquad(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">TEAM COMPOSITION</span>
                <h2>{selectedProjectSquad.title}</h2>
                <p className="modal-subtitle">
                  {selectedProjectSquad.matchedSquad?.length || 0} candidates currently allocated
                </p>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedProjectSquad(null)}>✕</button>
            </div>

            <div className="modal-member-list">
              {selectedProjectSquad.matchedSquad && selectedProjectSquad.matchedSquad.length > 0 ? (
                selectedProjectSquad.matchedSquad.map((m, idx) => (
                  <div key={m.studentId || idx} className="member-card">
                    <div className="member-avatar">
                      {m.name ? m.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div className="member-details">
                      <h4>{m.name || "Unnamed Student"}</h4>
                      <p>{m.college || "Candidate Profile"} • {m.role || "Talent Member"}</p>
                    </div>
                    <div className="member-score">
                      <span className="score-badge">{m.matchScore || 85}% match</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-modal-state">
                  <p>No squad members matched for this project yet.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedProjectSquad(null)}>
                Dismiss
              </button>
              {selectedProjectSquad.status !== "Locked" ? (
                <button
                  className="btn-post-deploy"
                  onClick={() => handleLockSquad(selectedProjectSquad._id)}
                  disabled={isLocking}
                >
                  {isLocking ? "Locking squad..." : "Lock team & dispatch invites →"}
                </button>
              ) : (
                <span className="locked-badge">
                  <span>✔</span> Squad Officially Locked
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}