import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/company/Navbar";
import "./postProject.css";

const PRESET_SKILLS = [
  "React", "Node.js", "MongoDB", "Express.js", "Python", 
  "TypeScript", "Docker", "AWS", "Tailwind CSS", "Figma", "PostgreSQL"
];

const PRESET_ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", 
  "UI/UX Designer", "DevOps Engineer", "AI/ML Engineer"
];

export default function PostProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Industry Capstone");
  const [teamSize, setTeamSize] = useState(4);
  const [description, setDescription] = useState("");

  // Default Deadline: 30 days from today
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  const [deadline, setDeadline] = useState(defaultDate.toISOString().split("T")[0]);

  const [requiredSkills, setRequiredSkills] = useState(["React", "Node.js"]);
  const [requiredRoles, setRequiredRoles] = useState(["Frontend Developer", "Backend Developer"]);
  const [customSkill, setCustomSkill] = useState("");

  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
  const companyId = localStorage.getItem("nexus_user_id") || storedUser?._id || storedUser?.id;
  const companyName = storedUser?.companyName || localStorage.getItem("companyName") || "Company";

  const toggleSkill = (skill) => {
    if (requiredSkills.includes(skill)) {
      setRequiredSkills(requiredSkills.filter((s) => s !== skill));
    } else {
      setRequiredSkills([...requiredSkills, skill]);
    }
  };

  const toggleRole = (role) => {
    if (requiredRoles.includes(role)) {
      setRequiredRoles(requiredRoles.filter((r) => r !== role));
    } else {
      setRequiredRoles([...requiredRoles, role]);
    }
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setCustomSkill("");
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (requiredSkills.length === 0) {
      setError("Please select at least one required skill for algorithmic matching.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          companyName,
          title,
          type,
          description,
          requiredSkills,
          requiredRoles,
          teamSize: Number(teamSize),
          deadline: new Date(deadline),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to post project");

      navigate("/company/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-proj-shell">
      <Navbar />

      <div className="post-proj-container">
        <div className="post-header">
          <div className="ai-pill">✨ Automated Squad Match Engine</div>
          <h1>Deploy Project Requisition</h1>
          <p>Define requirements, timeline and target dates to assemble student squads.</p>
        </div>

        {error && <div className="post-alert-error">{error}</div>}

        <form onSubmit={handlePostSubmit} className="post-card">
          <div className="form-grid">
            <div className="form-col-left">
              <div className="field-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Analytics Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="row-fields">
                <div className="field-group">
                  <label>Project Classification</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Industry Capstone">Industry Capstone</option>
                    <option value="Research & MVP">Research & MVP</option>
                    <option value="Production Micro-Service">Production Micro-Service</option>
                    <option value="Hackathon Fast-Track">Hackathon Fast-Track</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Squad Capacity</label>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                    <option value={2}>2 Members</option>
                    <option value={3}>3 Members</option>
                    <option value={4}>4 Members</option>
                    <option value={5}>5 Members</option>
                  </select>
                </div>
              </div>

              {/* Target Deadline Date Picker */}
              <div className="field-group">
                <label>Target Delivery Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label>Problem Statement & Deliverables *</label>
                <textarea
                  rows="5"
                  placeholder="Describe technical scope, architectural needs, key deliverables and milestone objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="requisition-summary">
                <div className="summary-title">Engine Summary</div>
                <div className="summary-content">
                  Forming a squad of <strong>{teamSize}</strong> for <strong>{title || "Untitled Project"}</strong> due on <strong>{new Date(deadline).toLocaleDateString()}</strong>.
                </div>
              </div>
            </div>

            <div className="form-col-right">
              <div className="field-group">
                <label>Target Squad Roles Required ({requiredRoles.length})</label>
                <div className="pills-grid">
                  {PRESET_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`pill-btn ${requiredRoles.includes(role) ? "active" : ""}`}
                      onClick={() => toggleRole(role)}
                    >
                      {requiredRoles.includes(role) ? `✓ ${role}` : `+ ${role}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label>Required Technical Skills ({requiredSkills.length})</label>
                <div className="pills-grid">
                  {PRESET_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={`pill-btn ${requiredSkills.includes(skill) ? "active" : ""}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {requiredSkills.includes(skill) ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  ))}
                </div>

                <div className="custom-tag-row">
                  <input
                    type="text"
                    placeholder="Add custom skill (e.g. Redis, GraphQL)..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                  />
                  <button type="button" className="btn-add-custom" onClick={addCustomSkill}>
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-submit-bar">
            <button type="button" className="btn-cancel" onClick={() => navigate("/company/dashboard")}>
              Discard
            </button>
            <button type="submit" className="btn-post-deploy" disabled={loading}>
              {loading ? "Matching Squad & Deploying..." : "⚡ Launch Project & Assemble Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}