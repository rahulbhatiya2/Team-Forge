import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "../../components/students/StudentNavbar";
import "./StudentMyTeam.css";

// Deadline Countdown Utility
function getCountdownInfo(deadlineDate) {
  if (!deadlineDate) return { text: "No Deadline", statusClass: "normal" };

  const now = new Date().getTime();
  const target = new Date(deadlineDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { text: "⚠️ Deadline Passed", statusClass: "expired", daysLeft: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    return { text: `🔥 Due Today (${hours}h left)`, statusClass: "urgent", daysLeft: 0 };
  }

  if (days <= 3) {
    return { text: `⚠️ ${days} Day${days > 1 ? "s" : ""} Left - Due Soon`, statusClass: "urgent", daysLeft: days };
  }

  return { text: `⏱ ${days} Days Remaining`, statusClass: "normal", daysLeft: days };
}

export default function StudentMyTeam() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Deliverables State
  const [submitForm, setSubmitForm] = useState({
    githubUrl: "",
    liveDemoUrl: "",
    notes: ""
  });
  const [submittingLinks, setSubmittingLinks] = useState(false);

  // Opt-Out / Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leavingProject, setLeavingProject] = useState(false);

  // Live Clock Trigger (30 sec interval re-calculates grace period)
  const [, setClockTick] = useState(Date.now());

  const storedUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const userId =
    localStorage.getItem("nexus_user_id") ||
    storedUser?._id ||
    storedUser?.id;

  const fetchCurrentTeam = async (silent = false) => {
    if (!userId) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      let sId = userId;
      let sEmail = (storedUser?.email || "").toLowerCase().trim();

      if (!student) {
        const profileRes = await fetch(`http://localhost:5000/api/auth/student/${userId}`);
        const profileData = await profileRes.json();

        if (profileRes.ok && profileData.student) {
          const s = profileData.student;
          sId = s._id || userId;
          sEmail = (s.email || "").toLowerCase().trim();

          setStudent({
            ...s,
            name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
          });
        }
      } else {
        sId = student._id || userId;
        sEmail = (student.email || "").toLowerCase().trim();
      }

      const projRes = await fetch("http://localhost:5000/api/projects/all");
      const projData = await projRes.json();

      if (projRes.ok && Array.isArray(projData.projects)) {
        const matchingProjects = projData.projects.filter((project) =>
          (project.matchedSquad || []).some(
            (member) =>
              (member.studentId && member.studentId.toString() === sId.toString()) ||
              (member.email && member.email.toLowerCase().trim() === sEmail)
          )
        );

        if (matchingProjects.length > 0) {
          // Prioritize active non-completed project first
          const activeFirst = matchingProjects.sort((a, b) => {
            const aDone = a.status === "Completed" ? 1 : 0;
            const bDone = b.status === "Completed" ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;
            return new Date(b.createdAt) - new Date(a.createdAt);
          })[0];

          setCurrentProject(activeFirst);

          // Preserve saved submission data without getting wiped by polling
          if (activeFirst.submission && activeFirst.submission.githubUrl) {
            setSubmitForm({
              githubUrl: activeFirst.submission.githubUrl || "",
              liveDemoUrl: activeFirst.submission.liveDemoUrl || "",
              notes: activeFirst.submission.notes || ""
            });
          }
        } else {
          setCurrentProject(null);
        }
      }
    } catch (err) {
      console.error("Team fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Real-time synchronization
  useEffect(() => {
    fetchCurrentTeam(false);

    // Auto-polling every 3 seconds for company actions / approvals
    const pollInterval = setInterval(() => {
      fetchCurrentTeam(true);
    }, 3000);

    // Instant refresh when user returns to tab
    const handleFocus = () => {
      fetchCurrentTeam(true);
    };
    window.addEventListener("focus", handleFocus);

    // Clock interval for grace countdown
    const clockInterval = setInterval(() => {
      setClockTick(Date.now());
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId]);

  const handleToggleTask = async (phaseIndex, taskIndex) => {
    if (!currentProject || togglingTaskId) return;

    const taskKey = `${phaseIndex}-${taskIndex}`;
    setTogglingTaskId(taskKey);
    setFeedbackMsg("");

    try {
      const res = await fetch(`http://localhost:5000/api/projects/${currentProject._id}/tasks/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseIndex,
          taskIndex,
          studentName: student?.name || "Student",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setCurrentProject(data.project);
          if (data.project.submission && data.project.submission.githubUrl) {
            setSubmitForm({
              githubUrl: data.project.submission.githubUrl || "",
              liveDemoUrl: data.project.submission.liveDemoUrl || "",
              notes: data.project.submission.notes || ""
            });
          }
          if (data.message) {
            setFeedbackMsg(data.message);
            setTimeout(() => setFeedbackMsg(""), 5000);
          }
        }
      }
    } catch (err) {
      console.error("Task toggle failed:", err);
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleSubmitDeliverables = async (e) => {
    e.preventDefault();
    if (!currentProject) return;

    if (!submitForm.githubUrl.trim()) {
      alert("Please provide the GitHub repository URL.");
      return;
    }

    setSubmittingLinks(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${currentProject._id}/submit-deliverables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: submitForm.githubUrl,
          liveDemoUrl: submitForm.liveDemoUrl,
          notes: submitForm.notes,
          studentName: student?.name || "Student",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      if (data.project) {
        setCurrentProject(data.project);
        if (data.project.submission) {
          setSubmitForm({
            githubUrl: data.project.submission.githubUrl || "",
            liveDemoUrl: data.project.submission.liveDemoUrl || "",
            notes: data.project.submission.notes || ""
          });
        }
        setFeedbackMsg(data.message || "Project completed!");
        setTimeout(() => setFeedbackMsg(""), 6000);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingLinks(false);
    }
  };

  const handleConfirmLeaveProject = async () => {
    if (!currentProject) return;

    setLeavingProject(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${currentProject._id}/leave`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student?._id || userId,
          studentEmail: student?.email || storedUser?.email,
          reason: leaveReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave project");

      setIsLeaveModalOpen(false);
      setLeaveReason("");
      setCurrentProject(null);
      setFeedbackMsg(data.message || "You have opted out of this project squad.");
      setTimeout(() => setFeedbackMsg(""), 6000);
      await fetchCurrentTeam(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLeavingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="myteam-shell teams-loading">
        <div className="loading-indicator" />
        <p>Loading your project workspace...</p>
      </div>
    );
  }

  const isCompleted = currentProject?.status === "Completed";
  const isLockedByCompany = currentProject?.status === "Locked";
  const normalizedEmail = (student?.email || storedUser?.email || "").toLowerCase().trim();

  const myMemberInfo = currentProject?.matchedSquad?.find(
    (member) =>
      (member.studentId && member.studentId.toString() === (student?._id || userId)?.toString()) ||
      (member.email && member.email.toLowerCase().trim() === normalizedEmail)
  );

  let totalTasks = 0;
  let finishedTasks = 0;
  (currentProject?.phases || []).forEach((p) => {
    (p.tasks || []).forEach((t) => {
      totalTasks++;
      if (t.completed) finishedTasks++;
    });
  });

  const allTasksDone = totalTasks > 0 && finishedTasks === totalTasks;
  const taskProgressPercent = totalTasks > 0 ? Math.round((finishedTasks / totalTasks) * 100) : 0;
  const remainingCount = totalTasks - finishedTasks;
  const countdown = getCountdownInfo(currentProject?.deadline);

  // 24-Hour Grace Period Calculations
  const assignedTime = myMemberInfo?.assignedAt 
    ? new Date(myMemberInfo.assignedAt).getTime() 
    : currentProject?.createdAt ? new Date(currentProject.createdAt).getTime() : Date.now();

  const msElapsed = Date.now() - assignedTime;
  const msRemainingIn24h = Math.max(0, 24 * 60 * 60 * 1000 - msElapsed);
  const hoursLeftToLeave = Math.floor(msRemainingIn24h / (1000 * 60 * 60));
  const minsLeftToLeave = Math.floor((msRemainingIn24h % (1000 * 60 * 60)) / (1000 * 60));

  const canStudentLeave = !isCompleted && !isLockedByCompany && msRemainingIn24h > 0;

  return (
    <div className="myteam-shell">
      <StudentNavbar activeTab="team" student={student} />

      <main className="myteam-container">
        {/* Top Header */}
        <section className="myteam-hero">
          <div className="myteam-hero-inner">
            <div className="page-eyebrow">
              <span className="eyebrow-mark" />
              STUDENT WORKSPACE
            </div>

            <div className="hero-heading-row">
              <div>
                <h1>My Team Workspace</h1>
                <p className="myteam-hero-sub">
                  Execute project stages, review company directives, and submit deliverables.
                </p>
              </div>

              <div className="student-identity">
                <div className="identity-avatar">
                  {(student?.firstName || student?.name || "S").charAt(0).toUpperCase()}
                </div>
                <div className="identity-details">
                  <span className="identity-label">LOGGED IN AS</span>
                  <strong>{student?.name || "Student"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="myteam-content-shelf">
          {feedbackMsg && <div className="live-toast-alert">{feedbackMsg}</div>}

          {!currentProject ? (
            <section className="empty-workspace">
              <div className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="8" y="8" width="32" height="32" rx="8" />
                  <path d="M16 19h16M16 25h10M16 31h7" />
                  <path d="m31 30 3 3 6-7" />
                </svg>
              </div>

              <span className="section-eyebrow">PROJECT ALLOCATION</span>
              <h2>No active project assigned</h2>
              <p>You are available for algorithmic matching. When a company forms a squad matching your skills, it will appear here automatically.</p>

              <Link to="/student/applications" className="workspace-link">
                View my applications <span aria-hidden="true">↗</span>
              </Link>
            </section>
          ) : (
            <>
              {/* Direct Company Notice Banner */}
              {currentProject.notes && currentProject.notes.length > 0 && (
                <div className="company-note-banner">
                  <div className="cnb-header">
                    <span className="cnb-badge">📢 COMPANY NOTICE</span>
                    <span className="cnb-author">
                      Posted by <strong>{currentProject.notes[0].author || "Company Lead"}</strong> on {new Date(currentProject.notes[0].createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="cnb-text">{currentProject.notes[0].text}</p>
                </div>
              )}

              {/* Project Overview Card */}
              <section className="workspace-section project-section">
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">ACTIVE CAPSTONE</span>
                    <h2>Project Overview</h2>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`countdown-timer-pill ${countdown.statusClass}`}>
                      {countdown.text}
                    </span>

                    <span className={`project-status ${isCompleted ? "status-completed" : "status-active"}`}>
                      <span className="status-dot" />
                      {isCompleted ? "Completed" : currentProject.status || "In progress"}
                    </span>

                    {/* Automatic Real-Time Locked/Leave Switch */}
                    {!isCompleted && (
                      canStudentLeave ? (
                        <button
                          type="button"
                          className="btn-optout-project"
                          onClick={() => setIsLeaveModalOpen(true)}
                          title={`You have ${hoursLeftToLeave}h ${minsLeftToLeave}m left to opt-out`}
                        >
                          ✕ Leave Squad ({hoursLeftToLeave}h {minsLeftToLeave}m left)
                        </button>
                      ) : isLockedByCompany ? (
                        <span className="badge-leave-locked" title="Company has approved and locked this squad">
                          🔒 Squad Locked (Cannot Leave)
                        </span>
                      ) : (
                        <span className="badge-leave-expired" title="24-hour opt-out period has passed">
                          ⏱ Leave Window Expired
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="project-company-line">
                  <span className="company-symbol" aria-hidden="true">
                    {(currentProject.companyName || "E").charAt(0).toUpperCase()}
                  </span>

                  <div className="company-details">
                    <span className="detail-label">COMPANY</span>
                    <strong>{currentProject.companyName || "Enterprise Partner"}</strong>
                  </div>

                  <span className="project-type">{currentProject.type || "Industry Capstone"}</span>
                </div>

                <div className="project-description">
                  <h3>{currentProject.title}</h3>
                  <p>{currentProject.description || "No project description provided."}</p>
                </div>

                <div className="project-information">
                  <div className="information-item">
                    <span className="detail-label">YOUR ROLE</span>
                    <strong>{myMemberInfo?.role || "Not specified"}</strong>
                  </div>

                  <div className="information-item">
                    <span className="detail-label">TEAM SIZE</span>
                    <strong>{currentProject.matchedSquad?.length || 0} members</strong>
                  </div>

                  {myMemberInfo?.matchScore != null && (
                    <div className="information-item">
                      <span className="detail-label">YOUR MATCH</span>
                      <strong>{myMemberInfo.matchScore}%</strong>
                    </div>
                  )}

                  <div className="information-item">
                    <span className="detail-label">DELIVERABLES</span>
                    <strong style={{ color: isCompleted ? "#166534" : "#19432f" }}>
                      {finishedTasks} / {totalTasks} Tasks ({isCompleted ? "Completed" : "Pending"})
                    </strong>
                  </div>
                </div>

                {Array.isArray(currentProject.requiredSkills) && currentProject.requiredSkills.length > 0 && (
                  <div className="technology-section">
                    <span className="detail-label">TECHNOLOGIES</span>
                    <div className="technology-list">
                      {currentProject.requiredSkills.map((skill) => (
                        <span className="technology-item" key={skill}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {isCompleted ? (
                  <div className="completion-success-banner">
                    <span style={{ fontSize: "24px" }}>🎉</span>
                    <div>
                      <strong>Project Successfully Completed & Delivered!</strong>
                      <p>All 4 SDLC stages are checked and project deliverables are stored in the platform archive.</p>
                    </div>
                  </div>
                ) : (
                  <div className="completion-requirement-notice">
                    <span>ℹ️ <strong>One Active Project Rule:</strong> You cannot be allocated to another capstone until this project reaches completion or you opt out of this squad.</span>
                  </div>
                )}
              </section>

              {/* STAGES & TASKS SECTION */}
              <section className="workspace-section phases-section">
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">SDLC MILESTONES</span>
                    <h2>Project Stages & Deliverable Tasks</h2>
                    <p className="section-description">
                      Tick tasks as your squad finishes them. Checking all tasks across all 4 stages unlocks deliverable submission.
                    </p>
                  </div>

                  <div className="phase-progress-pill">
                    <span>{finishedTasks} of {totalTasks} Done</span>
                    <strong>{taskProgressPercent}%</strong>
                  </div>
                </div>

                <div className="phases-container">
                  {(currentProject.phases || []).map((phase, pIdx) => {
                    const phaseCompletedCount = (phase.tasks || []).filter((t) => t.completed).length;
                    const phaseTotalCount = (phase.tasks || []).length;
                    const isPhaseFinished = phaseTotalCount > 0 && phaseCompletedCount === phaseTotalCount;

                    return (
                      <div className={`phase-interactive-box ${isPhaseFinished ? "phase-box-finished" : ""}`} key={pIdx}>
                        <div className="pib-header">
                          <div className="pib-title-wrap">
                            <span className="pib-stage-num">0{pIdx + 1}</span>
                            <h4>{phase.title}</h4>
                          </div>
                          <span className={`pib-stage-badge ${isPhaseFinished ? "badge-done" : ""}`}>
                            {phaseCompletedCount} / {phaseTotalCount} Tasks
                          </span>
                        </div>

                        <div className="pib-tasks-list">
                          {(phase.tasks || []).map((task, tIdx) => {
                            const isTogglingThis = togglingTaskId === `${pIdx}-${tIdx}`;
                            return (
                              <label className={`task-checkbox-row ${task.completed ? "task-done" : ""}`} key={tIdx}>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTask(pIdx, tIdx)}
                                  disabled={isTogglingThis}
                                  className="custom-check"
                                />
                                <div className="task-content">
                                  <span className="task-text">{task.text}</span>
                                  {task.completed && (
                                    <span className="task-done-badge">
                                      ✓ Done {task.completedBy ? `by ${task.completedBy}` : ""}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 4. SUBMIT DELIVERABLES SECTION (Unlocks ONLY when all tasks are checked) */}
              <section className={`workspace-section submission-section ${allTasksDone ? "unlocked" : "locked-stage"}`}>
                <div className="section-heading">
                  <div>
                    <span className="section-eyebrow">FINAL HANDOVER</span>
                    <h2>📦 Submit Project Deliverables</h2>
                    <p className="section-description">
                      {allTasksDone 
                        ? "All phases are verified! Submit your GitHub repository and live preview link to complete the project."
                        : `Locked: Complete all remaining ${remainingCount} tasks across all 4 stages to unlock deliverable submission.`}
                    </p>
                  </div>
                  <span className={`submission-status-pill ${allTasksDone ? "ready" : "locked"}`}>
                    {allTasksDone ? (isCompleted ? "Delivered & Complete" : "Ready for Submission") : "Locked"}
                  </span>
                </div>

                {allTasksDone ? (
                  <form onSubmit={handleSubmitDeliverables} className="submission-form">
                    <div className="sub-field-row">
                      <div className="sub-field-unit">
                        <label>GitHub Repository URL *</label>
                        <input
                          type="url"
                          placeholder="https://github.com/your-team/project-repo"
                          value={submitForm.githubUrl}
                          onChange={(e) => setSubmitForm({ ...submitForm, githubUrl: e.target.value })}
                          required
                        />
                      </div>
                      <div className="sub-field-unit">
                        <label>Live Hosted Demo URL (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://yourproject.vercel.app"
                          value={submitForm.liveDemoUrl}
                          onChange={(e) => setSubmitForm({ ...submitForm, liveDemoUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="sub-field-unit">
                      <label>Handover Notes / Summary (Optional)</label>
                      <textarea
                        rows="2"
                        placeholder="Brief summary of deliverables for company review..."
                        value={submitForm.notes}
                        onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                      />
                    </div>

                    <div className="sub-actions-bar">
                      {isCompleted && currentProject.submission?.submittedAt && (
                        <span className="submission-audit">
                          Delivered on {new Date(currentProject.submission.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      <button type="submit" className="btn-submit-deliverables" disabled={submittingLinks}>
                        {submittingLinks ? "Submitting..." : isCompleted ? "Update Project Links ✓" : "Submit Deliverables & Complete Project 🚀"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="locked-submission-placeholder">
                    <span style={{ fontSize: "28px" }}>🔒</span>
                    <p>Deliverables submission form is currently locked. Complete all checklist tasks above to unlock this section.</p>
                  </div>
                )}
              </section>

              {/* 5. Team Roster */}
              <section className="workspace-section roster-section">
                <div className="section-heading roster-heading">
                  <div>
                    <span className="section-eyebrow">COLLABORATION</span>
                    <h2>Your Team Squad</h2>
                    <p className="section-description">Members allocated to your squad.</p>
                  </div>

                  <div className="team-count">
                    <strong>{currentProject.matchedSquad?.length || 0}</strong>
                    <span>Members</span>
                  </div>
                </div>

                <div className="roster-column-head">
                  <span>TEAM MEMBER</span>
                  <span>ROLE & COLLEGE</span>
                  <span>CONTACT</span>
                </div>

                <div className="teammates-roster-list">
                  {(currentProject.matchedSquad || []).map((member, idx) => {
                    const isSelf =
                      (member.studentId && member.studentId.toString() === (student?._id || userId)?.toString()) ||
                      (member.email && member.email.toLowerCase().trim() === normalizedEmail);

                    const displayName = member.name || "Squad Member";

                    return (
                      <div className={`teammate-row ${isSelf ? "self-row" : ""}`} key={member.studentId || member.email || idx}>
                        <div className="member-identity">
                          <div className="tm-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="member-name-details">
                            <span className="tm-name">{displayName}</span>
                            {isSelf && <span className="self-tag">YOU</span>}
                          </div>
                        </div>

                        <div className="member-academic-details">
                          <span className="tm-role">{member.role || "Not specified"}</span>
                          <span className="tm-college">{member.college || "College not specified"}</span>
                        </div>

                        <div className="member-contact-details">
                          {member.email ? (
                            <a className="tm-email" href={`mailto:${member.email}`} title={member.email}>
                              <span>✉</span>
                              {member.email}
                            </a>
                          ) : (
                            <span className="contact-unavailable">Not available</span>
                          )}

                          {member.matchScore != null && (
                            <span className="tm-score">{member.matchScore}% match</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* STUDENT OPT-OUT CONFIRMATION MODAL */}
      {isLeaveModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="student-leave-modal" onClick={(e) => e.stopPropagation()}>
            <div className="slm-header">
              <h3>Opt-out of Project Squad?</h3>
              <button className="slm-close" onClick={() => setIsLeaveModalOpen(false)}>✕</button>
            </div>
            <p className="slm-desc">
              If you opt out, you will be removed from <strong>{currentProject?.title}</strong> and become available for other squads. You have <strong>{hoursLeftToLeave}h {minsLeftToLeave}m</strong> remaining in your grace window.
            </p>
            <div className="slm-input-wrap">
              <label>Reason for Opting Out (Optional):</label>
              <textarea
                rows="2"
                placeholder="e.g. Schedule clash, preference for different stack..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>
            <div className="slm-actions">
              <button
                type="button"
                className="btn-cancel-leave"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={leavingProject}
              >
                Keep Project
              </button>
              <button
                type="button"
                className="btn-confirm-leave"
                onClick={handleConfirmLeaveProject}
                disabled={leavingProject}
              >
                {leavingProject ? "Removing..." : "Yes, Opt-out & Leave Squad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}