import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/company/Navbar";
import "./teamsManagement.css";

function getCountdownInfo(deadlineDate) {
  if (!deadlineDate) return { text: "No Deadline", statusClass: "normal" };

  const now = new Date().getTime();
  const target = new Date(deadlineDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { text: "Deadline Passed", statusClass: "expired", daysLeft: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    return { text: `Due Today (${hours}h left)`, statusClass: "urgent", daysLeft: 0 };
  }

  if (days <= 3) {
    return { text: `${days} Day${days > 1 ? "s" : ""} Left - Due Soon`, statusClass: "urgent", daysLeft: days };
  }

  return { text: `${days} Days Remaining`, statusClass: "normal", daysLeft: days };
}

export default function TeamsManagement() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [noteInput, setNoteInput] = useState("");
  const [sharingNote, setSharingNote] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Fix: Ref to prevent interval from overwriting user's selected project
  const selectedProjIdRef = useRef(null);

  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const companyId = localStorage.getItem("nexus_user_id") || storedUser?._id || storedUser?.id;
  const companyName = storedUser?.companyName || localStorage.getItem("companyName");

  const fetchData = async (silent = false) => {
    try {
      const url = companyId 
        ? `http://localhost:5000/api/projects/all?companyId=${companyId}`
        : "http://localhost:5000/api/projects/all";

      const projRes = await fetch(url);
      const projData = await projRes.json();

      if (projRes.ok && Array.isArray(projData.projects)) {
        const myProjects = projData.projects.filter((p) => {
          if (!companyId && !companyName) return true;
          const matchesId = p.companyId && String(p.companyId) === String(companyId);
          const matchesName = companyName && p.companyName?.toLowerCase().trim() === companyName.toLowerCase().trim();
          return matchesId || matchesName;
        });

        setProjects(myProjects);

        if (myProjects.length > 0) {
          // Use Ref so background polling doesn't reset user choice
          const targetId = selectedProjIdRef.current;
          let matched = null;
          if (targetId) {
            matched = myProjects.find((p) => String(p._id) === String(targetId));
          }
          const chosen = matched || myProjects[0];
          selectedProjIdRef.current = chosen._id;
          setSelectedProject(chosen);
        } else {
          selectedProjIdRef.current = null;
          setSelectedProject(null);
        }
      }

      if (!silent) {
        const currentActiveId = selectedProjIdRef.current;
        const stuUrl = currentActiveId
          ? `http://localhost:5000/api/projects/candidates?currentProjectId=${currentActiveId}`
          : "http://localhost:5000/api/projects/candidates";

        const stuRes = await fetch(stuUrl);
        const stuData = await stuRes.json();
        if (stuRes.ok && stuData.students) {
          setAllStudents(stuData.students);
        }
      }
    } catch (err) {
      console.error("Failed to load teams data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);

    const handleFocus = () => {
      fetchData(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [companyId]);

  const handleSelectProject = (proj) => {
    selectedProjIdRef.current = proj._id;
    setSelectedProject(proj);
  };

  const handleShareNote = async (e) => {
    e.preventDefault();
    if (!selectedProject || !noteInput.trim()) return;

    setSharingNote(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: noteInput.trim(),
          author: companyName || "Company Lead",
        }),
      });

      if (res.ok) {
        setActionMsg("Note published to the squad workspace!");
        setNoteInput("");
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSharingNote(false);
      setTimeout(() => setActionMsg(""), 4000);
    }
  };

  const handleAutoFillRemainingSlots = async () => {
    if (!selectedProject) return;

    if (selectedProject.matchedSquad.length >= selectedProject.teamSize) {
      alert("Squad capacity already full!");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          matchedSquad: selectedProject.matchedSquad,
          autoFill: true
        }),
      });

      if (res.ok) {
        setActionMsg("Matching algorithm assigned the replacement candidate!");
        setIsSwapModalOpen(false);
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMsg(""), 4000);
    }
  };

  const handleInitiateRemove = (member) => {
    setRemoveTarget({
      studentId: member.studentId,
      name: member.name || "Candidate",
    });
  };

  const handleConfirmRemoveWithAlgo = async () => {
    if (!selectedProject || !removeTarget) return;

    const updatedSquad = selectedProject.matchedSquad.filter(
      (m) => String(m.studentId) !== String(removeTarget.studentId)
    );

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          matchedSquad: updatedSquad,
          autoFill: true
        }),
      });

      if (res.ok) {
        setActionMsg(`${removeTarget.name} removed. Algorithm assigned replacement candidate!`);
        setRemoveTarget(null);
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setActionMsg(""), 4000);
    }
  };

  const handleConfirmRemoveAndManualChoose = async () => {
    if (!selectedProject || !removeTarget) return;

    const updatedSquad = selectedProject.matchedSquad.filter(
      (m) => String(m.studentId) !== String(removeTarget.studentId)
    );

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          matchedSquad: updatedSquad,
          autoFill: false
        }),
      });

      if (res.ok) {
        setRemoveTarget(null);
        await fetchData(true);
        setIsSwapModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmRemoveOnly = async () => {
    if (!selectedProject || !removeTarget) return;

    const updatedSquad = selectedProject.matchedSquad.filter(
      (m) => String(m.studentId) !== String(removeTarget.studentId)
    );

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          matchedSquad: updatedSquad,
          autoFill: false
        }),
      });

      if (res.ok) {
        setActionMsg(`${removeTarget.name} removed. Slot is currently empty.`);
        setRemoveTarget(null);
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleAddCandidateToSquad = async (student) => {
    if (!selectedProject) return;

    if (selectedProject.matchedSquad.length >= selectedProject.teamSize) {
      alert(`Team capacity of ${selectedProject.teamSize} members is full.`);
      return;
    }

    const newMember = {
      studentId: student._id,
      name: `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email.split("@")[0],
      email: student.email,
      college: student.college || "University Student",
      role: student.preferredRole || "Developer",
      skills: student.skills || [],
      matchScore: 88,
    };

    const updatedSquad = [...selectedProject.matchedSquad, newMember];

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${selectedProject._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchedSquad: updatedSquad }),
      });

      if (res.ok) {
        setActionMsg(`Assigned ${newMember.name} to the squad roster!`);
        setIsSwapModalOpen(false);
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleApproveSquad = async (projectId) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Locked" }),
      });

      if (res.ok) {
        setActionMsg("Squad officially approved and locked!");
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMsg(""), 3500);
    }
  };

  const handleUnlockSquad = async (projectId) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Open" }),
      });

      if (res.ok) {
        setActionMsg("Squad reopened for alterations.");
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMsg(""), 3000);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionMsg("Project requisition deleted.");
        selectedProjIdRef.current = null;
        setSelectedProject(null);
        await fetchData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setActionMsg(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="teams-shell">
        <Navbar />
        <div className="teams-loading">Loading Formed Squads & Projects...</div>
      </div>
    );
  }

  const filteredStudents = allStudents.filter((s) => {
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
    const skillsList = (s.skills || []).map((sk) => (typeof sk === "object" && sk.name ? sk.name.toLowerCase() : String(sk).toLowerCase())).join(" ");
    const role = (s.preferredRole || "").toLowerCase();
    const query = studentSearch.toLowerCase();
    return fullName.includes(query) || skillsList.includes(query) || role.includes(query);
  });

  const filledCount = selectedProject?.matchedSquad?.length || 0;
  const targetSize = selectedProject?.teamSize || 1;
  const isSquadFull = filledCount >= targetSize;
  const capacityPercent = Math.min(Math.round((filledCount / targetSize) * 100), 100);

  let totalTasksCount = 0;
  let completedTasksCount = 0;
  (selectedProject?.phases || []).forEach((p) => {
    (p.tasks || []).forEach((t) => {
      totalTasksCount++;
      if (t.completed) completedTasksCount++;
    });
  });

  const countdown = getCountdownInfo(selectedProject?.deadline);
  const sub = selectedProject?.submission;

  return (
    <div className="teams-shell">
      <Navbar />

      <div className="teams-container">
        <div className="teams-header">
          <div>
            <div className="pill-live">Algorithmic Team Assembly Center</div>
            <h1>Deployed Projects & Formed Squads</h1>
            <p>
              Inspect student squads, post live directive notes, and track real-time phase completion.
            </p>
          </div>
          <Link to="/company/post-project" className="btn-post-action">
            + Post Another Project
          </Link>
        </div>

        {actionMsg && <div className="teams-alert-success">{actionMsg}</div>}

        {projects.length === 0 ? (
          <div className="empty-teams-card">
            <span style={{ fontSize: "40px" }}>📁</span>
            <h3>No Live Projects Deployed by Your Company</h3>
            <p>Deploy a project requisition to let the algorithm assemble candidates automatically.</p>
            <Link to="/company/post-project" className="btn-post-action" style={{ marginTop: "16px", display: "inline-block" }}>
              Deploy First Project
            </Link>
          </div>
        ) : (
          <div className="teams-layout-grid">
            <div className="projects-sidebar">
              <div className="ps-head">
                <h3>Your Projects ({projects.length})</h3>
                <span className="ps-sub">Select brief to view squads</span>
              </div>

              <div className="proj-items-stack">
                {projects.map((proj) => {
                  const isSelected = selectedProject?._id === proj._id;
                  const isLocked = proj.status === "Locked";
                  const isDone = proj.status === "Completed";
                  return (
                    <div
                      key={proj._id}
                      className={`proj-sidebar-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectProject(proj)}
                    >
                      <div className="psc-top">
                        <span className="psc-type">{proj.type}</span>
                        <span className={`psc-status ${isDone ? "completed" : isLocked ? "locked" : "open"}`}>
                          {isDone ? "Completed" : isLocked ? "Locked" : "Active"}
                        </span>
                      </div>
                      <h4>{proj.title}</h4>
                      <p className="psc-slots">
                        Capacity: <strong>{proj.matchedSquad?.length || 0} / {proj.teamSize}</strong> Members
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedProject && (
              <div className="squad-details-panel">
                <div className="panel-hero">
                  <div className="panel-title-row">
                    <div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span className="badge-cap">{selectedProject.type}</span>
                        <span className={`countdown-timer-pill ${countdown.statusClass}`}>
                          {countdown.text}
                        </span>
                      </div>
                      <h2>{selectedProject.title}</h2>
                      <p className="panel-desc">{selectedProject.description}</p>

                      <div className="squad-progress-wrap">
                        <div className="squad-progress-header">
                          <span>Squad Capacity Filling</span>
                          <span>{filledCount} of {targetSize} Slots Assigned</span>
                        </div>
                        <div className="squad-progress-track">
                          <div className="squad-progress-fill" style={{ width: `${capacityPercent}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="panel-action-box">
                      {selectedProject.status === "Completed" ? (
                        <span className="status-badge-completed">Project Completed & Delivered</span>
                      ) : selectedProject.status === "Locked" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                          <span className="status-badge-locked">Squad Locked</span>
                          <button
                            className="btn-unlock-squad"
                            disabled={isProcessing}
                            onClick={() => handleUnlockSquad(selectedProject._id)}
                          >
                            Reopen Squad
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            className="btn-approve-squad"
                            disabled={isProcessing}
                            onClick={() => handleApproveSquad(selectedProject._id)}
                          >
                            {isProcessing ? "Locking..." : "Approve & Lock Squad"}
                          </button>
                          <button
                            className="btn-delete-proj"
                            onClick={() => handleDeleteProject(selectedProject._id)}
                            title="Delete this project"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="req-strip">
                    <div className="req-col">
                      <span className="req-lbl">Required Skills</span>
                      <div className="chips-row">
                        {selectedProject.requiredSkills?.map((s) => (
                          <span key={s} className="skill-badge">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="req-col">
                      <span className="req-lbl">Allocated Roles</span>
                      <div className="chips-row">
                        {selectedProject.requiredRoles?.map((r) => (
                          <span key={r} className="role-badge">{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DELIVERABLES REVIEW SECTION FOR COMPANY */}
                {sub && sub.githubUrl && (
                  <div className="panel-deliverables-review">
                    <div className="pdr-header">
                      <div>
                        <h3>Team Deliverables Submitted</h3>
                        <p>Submitted by <strong>{sub.submittedBy || "Squad Member"}</strong> on {new Date(sub.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <span className="badge-delivered">Delivered</span>
                    </div>

                    <div className="pdr-links-row">
                      <a href={sub.githubUrl} target="_blank" rel="noreferrer" className="btn-pdr-link github">
                        Open GitHub Repository ↗
                      </a>
                      {sub.liveDemoUrl && (
                        <a href={sub.liveDemoUrl} target="_blank" rel="noreferrer" className="btn-pdr-link demo">
                          View Live Demo ↗
                        </a>
                      )}
                    </div>
                    {sub.notes && (
                      <div className="pdr-notes-box">
                        <span className="lbl">Handover Notes:</span>
                        <p>{sub.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Direct Notes & Directive Section */}
                <div className="panel-notes-section">
                  <div className="notes-header">
                    <div>
                      <h3>Direct Team Notes & Directives</h3>
                      <p>Notes posted here appear immediately on the student team workspace.</p>
                    </div>
                  </div>

                  <form onSubmit={handleShareNote} className="note-post-form">
                    <textarea
                      rows="2"
                      placeholder="Post milestone updates, meeting links, or technical guidelines for this squad..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-post-note" disabled={sharingNote}>
                      {sharingNote ? "Publishing..." : "Post Note to Team →"}
                    </button>
                  </form>

                  {selectedProject.notes && selectedProject.notes.length > 0 && (
                    <div className="notes-display-list">
                      {selectedProject.notes.map((n, idx) => (
                        <div className="note-item-bubble" key={idx}>
                          <div className="nib-meta">
                            <strong>{n.author || "Company"}</strong>
                            <span>{new Date(n.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p>{n.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Phases Checklist */}
                <div className="panel-phases-section">
                  <div className="phases-top-bar">
                    <div>
                      <h3>Project Phases & Task Progression</h3>
                      <p>Track how your assigned student squad is completing technical milestones.</p>
                    </div>
                    <div className="phase-metric-pill">
                      {completedTasksCount} of {totalTasksCount} Tasks Completed ({totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%)
                    </div>
                  </div>

                  <div className="phases-stack-list">
                    {(selectedProject.phases || []).map((phase, pIdx) => (
                      <div className="company-phase-card" key={pIdx}>
                        <div className="phase-card-title">
                          <strong>{phase.title}</strong>
                        </div>
                        <div className="phase-task-rows">
                          {phase.tasks?.map((task, tIdx) => (
                            <div className={`company-task-chip ${task.completed ? "is-done" : ""}`} key={tIdx}>
                              <span className="task-check-icon">{task.completed ? "✔" : "○"}</span>
                              <span className="task-name">{task.text}</span>
                              {task.completed && task.completedBy && (
                                <span className="task-by-tag">By {task.completedBy}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Squad Members Roster */}
                <div className="squad-roster-section">
                  <div className="roster-head">
                    <div>
                      <h3>
                        Allocated Squad ({filledCount} / {targetSize} Members)
                      </h3>
                      <p className="roster-desc">Clicking remove gives you choice: Auto-fill via algorithm OR pick candidate yourself.</p>
                    </div>

                    {selectedProject.status !== "Locked" && selectedProject.status !== "Completed" && (
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        {!isSquadFull && (
                          <button
                            type="button"
                            className="btn-autofill-action"
                            disabled={isProcessing}
                            onClick={handleAutoFillRemainingSlots}
                          >
                            Auto-Fill Remaining
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-add-candidate"
                          onClick={() => setIsSwapModalOpen(true)}
                        >
                          + Add / Swap Candidate
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedProject.matchedSquad && selectedProject.matchedSquad.length > 0 ? (
                    <div className="squad-cards-grid">
                      {selectedProject.matchedSquad.map((member, index) => (
                        <div className="member-card" key={member.studentId || index}>
                          <div className="member-top">
                            <div className="member-avatar">
                              {member.name ? member.name.slice(0, 2).toUpperCase() : "M"}
                            </div>
                            <div className="match-pill">
                              {member.matchScore || 85}% Synergy
                            </div>
                          </div>

                          <h4>{member.name}</h4>
                          <span className="member-role">{member.role}</span>
                          <p className="member-college">{member.college || "University Student"}</p>
                          <p className="member-email">{member.email}</p>

                          <div className="member-divider"></div>

                          <div className="member-skills-wrap">
                            <span className="mini-lbl">Skills Stack</span>
                            <div className="chips-row">
                              {member.skills && member.skills.length > 0 ? (
                                member.skills.slice(0, 4).map((sk) => {
                                  const name = typeof sk === "object" && sk.name ? sk.name : String(sk);
                                  return (
                                    <span key={name} className="micro-chip">
                                      {name}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="micro-chip">Core Competency</span>
                              )}
                            </div>
                          </div>

                          {selectedProject.status !== "Locked" && selectedProject.status !== "Completed" && (
                            <div className="member-actions-row">
                              <button
                                className="btn-remove-slot"
                                onClick={() => handleInitiateRemove(member)}
                              >
                                Remove Candidate
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-roster-box">
                      <p>All squad slots currently empty.</p>
                      <button
                        type="button"
                        className="btn-autofill-action"
                        style={{ marginTop: "10px" }}
                        onClick={handleAutoFillRemainingSlots}
                      >
                        Auto-Assemble Squad via Algorithm
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: REMOVAL ACTION CHOOSER DIALOG */}
      {removeTarget && (
        <div className="modal-backdrop" onClick={() => setRemoveTarget(null)}>
          <div className="modal-card decision-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Remove Candidate & Replacement Option</h3>
                <p className="modal-sub">
                  How would you like to handle the replacement slot for <strong>{removeTarget.name}</strong>?
                </p>
              </div>
              <button className="close-btn" onClick={() => setRemoveTarget(null)}>✕</button>
            </div>

            <div className="decision-options-container">
              <div className="decision-option-box" onClick={handleConfirmRemoveWithAlgo}>
                <div className="dob-icon">⚡</div>
                <div className="dob-content">
                  <h4>Let Algorithm Auto-Fill Best Match</h4>
                  <p>System automatically scores available students not in active projects and assigns the best match instantly.</p>
                </div>
                <button type="button" className="btn-dob-action auto">Auto-Fill ↗</button>
              </div>

              <div className="decision-option-box" onClick={handleConfirmRemoveAndManualChoose}>
                <div className="dob-icon">👥</div>
                <div className="dob-content">
                  <h4>I Will Choose from Talent Directory</h4>
                  <p>Remove candidate and open the talent directory modal to select a student profile yourself.</p>
                </div>
                <button type="button" className="btn-dob-action manual">Choose Myself ↗</button>
              </div>

              <div className="decision-option-subrow">
                <button type="button" className="btn-empty-slot" onClick={handleConfirmRemoveOnly}>
                  Just remove candidate & leave slot unassigned
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TALENT DIRECTORY PICKER */}
      {isSwapModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSwapModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Assign Talent from Directory</h3>
                <p className="modal-sub">Shows only students who are available and not active in other projects.</p>
              </div>
              <button className="close-btn" onClick={() => setIsSwapModalOpen(false)}>✕</button>
            </div>

            {!isSquadFull && (
              <div className="modal-autofill-banner">
                <div>
                  <strong>Need instant assignment?</strong>
                  <p>Let algorithm evaluate and add the highest matching student automatically.</p>
                </div>
                <button
                  type="button"
                  className="btn-autofill-modal-action"
                  onClick={handleAutoFillRemainingSlots}
                >
                  Auto-Fill Best Match
                </button>
              </div>
            )}

            <div className="modal-search-box">
              <input
                type="text"
                placeholder="Search candidate by name, target role, or skills..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            <div className="modal-candidates-list">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu) => {
                  const isInSquad = selectedProject?.matchedSquad?.some((m) => String(m.studentId) === String(stu._id));
                  const fullName = `${stu.firstName || ""} ${stu.lastName || ""}`.trim() || stu.email.split("@")[0];

                  return (
                    <div className="candidate-pick-row" key={stu._id}>
                      <div className="cp-avatar">{fullName.charAt(0).toUpperCase()}</div>
                      <div className="cp-info">
                        <h4>{fullName}</h4>
                        <span className="cp-role">{stu.preferredRole || "Developer"} • {stu.college || "Student"}</span>
                        <div className="cp-skills">
                          {(stu.skills || []).slice(0, 3).map((s) => {
                            const sName = typeof s === "object" && s.name ? s.name : String(s);
                            return <span key={sName} className="micro-chip">{sName}</span>;
                          })}
                        </div>
                      </div>
                      <div>
                        {isInSquad ? (
                          <span className="already-added-pill">In Squad</span>
                        ) : (
                          <button
                            className="btn-select-candidate"
                            onClick={() => handleAddCandidateToSquad(stu)}
                          >
                            + Assign
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "26px", color: "#68766b", fontSize: "13px" }}>
                  No available candidate matches your search.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-modal-close" onClick={() => setIsSwapModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}