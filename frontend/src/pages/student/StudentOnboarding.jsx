import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./StudentOnboarding.css";

const PREDEFINED_SKILLS = [
  "React", "JavaScript", "TypeScript", "Node.js", "Express.js",
  "MongoDB", "PostgreSQL", "MySQL", "Python", "Java", "C++",
  "Docker", "Kubernetes", "AWS", "Git & GitHub", "Tailwind CSS",
  "HTML5 & CSS3", "Next.js", "FastAPI", "Machine Learning", "Figma"
];

const PREDEFINED_INTERESTS = [
  "Web Development", "Cloud Architecture", "Distributed Systems",
  "Artificial Intelligence", "DevOps & CI/CD", "Cybersecurity",
  "UI/UX Design", "FinTech", "System Design"
];

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
    
  const userId =
    location.state?.userId ||
    localStorage.getItem("nexus_user_id") ||
    storedUser?._id ||
    storedUser?.id;

  const studentName = location.state?.firstName
    ? `${location.state.firstName} ${location.state.lastName || ""}`.trim()
    : storedUser?.firstName || "Student Candidate";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Academic & Contact State
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("MCA");
  const [semester, setSemester] = useState("3rd Semester");
  const [graduationYear, setGraduationYear] = useState("2027");
  const [scorePercentage, setScorePercentage] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Step 2: Role & Skills
  const [preferredRole, setPreferredRole] = useState("Frontend Developer");
  const [skills, setSkills] = useState([
    { name: "React", level: "Intermediate" },
    { name: "JavaScript", level: "Advanced" }
  ]);
  const [selectedPresetSkill, setSelectedPresetSkill] = useState("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState("Intermediate");

  // Step 3: Interests & Projects
  const [interests, setInterests] = useState(["Web Development"]);
  const [projects, setProjects] = useState([
    { title: "", tech: "", desc: "", link: "" }
  ]);

  const handleAddPresetSkill = (skillName) => {
    const targetSkill = skillName || selectedPresetSkill;
    if (!targetSkill) return;

    if (skills.some((s) => s.name.toLowerCase() === targetSkill.toLowerCase())) {
      setError(`"${targetSkill}" is already added.`);
      return;
    }

    setSkills([...skills, { name: targetSkill, level: selectedSkillLevel }]);
    setSelectedPresetSkill("");
    setError("");
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleToggleInterest = (item) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item));
    } else {
      setInterests([...interests, item]);
    }
  };

  const handleProjectChange = (index, field, value) => {
    const updated = [...projects];
    updated[index][field] = value;
    setProjects(updated);
  };

  const addProjectRow = () => {
    setProjects([...projects, { title: "", tech: "", desc: "", link: "" }]);
  };

  const removeProjectRow = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/complete-student-onboarding/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            college,
            course,
            semester,
            graduationYear,
            scorePercentage,
            githubUrl,
            linkedinUrl,
            preferredRole,
            skills,
            interests,
            previousProjects: projects.filter((p) => p.title.trim() !== ""),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Sync user data & nexus_user_id to prevent profile fetch issues
      if (userId) {
        localStorage.setItem("nexus_user_id", userId);
      }
      if (storedUser) {
        localStorage.setItem("user", JSON.stringify({ ...storedUser, isOnboarded: true }));
      }

      navigate("/student/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard-forest-shell">
      <header className="onboard-top-nav">
        <div className="onboard-top-inner">
          <div className="onboard-brand">
            <span className="onboard-brand-hex">⬡</span>
            <span className="onboard-brand-name">Team Forge</span>
            <span className="onboard-role-badge">STUDENT SETUP</span>
          </div>
          <span className="onboard-user-greet">Candidate: <strong>{studentName}</strong></span>
        </div>
      </header>

      <main className="onboard-container">
        <div className="onboard-card">
          <div className="onboard-header">
            <div className="stu-pill-live">
              <span className="pulse-dot" /> STEP {step} OF 3
            </div>
            <h1>Setup Your Workspace Profile</h1>
            <p className="onboard-subtext">
              Enter your verified academic credentials and technical stack to get matched with project squads.
            </p>

            <div className="step-bar">
              <div className={`step-segment ${step >= 1 ? "active" : ""}`} />
              <div className={`step-segment ${step >= 2 ? "active" : ""}`} />
              <div className={`step-segment ${step >= 3 ? "active" : ""}`} />
            </div>
          </div>

          {error && <div className="onboard-error">{error}</div>}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-title-wrap">
                <span className="step-kicker">ACADEMIC & PRESENCE</span>
                <h3>Educational Credentials</h3>
              </div>

              <div className="onboard-field">
                <label>College / University Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Guru Gobind Singh Indraprastha University"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                />
              </div>

              <div className="onboard-row">
                <div className="onboard-field">
                  <label>Course / Program *</label>
                  <select value={course} onChange={(e) => setCourse(e.target.value)}>
                    <option value="MCA">MCA</option>
                    <option value="B.Tech (CSE/IT)">B.Tech (CSE/IT)</option>
                    <option value="BCA">BCA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="B.Sc Computer Science">B.Sc Computer Science</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="onboard-field">
                  <label>Current Semester *</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="3rd Semester">3rd Semester</option>
                    <option value="4th Semester">4th Semester</option>
                    <option value="5th Semester">5th Semester</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>
              </div>

              <div className="onboard-row">
                <div className="onboard-field">
                  <label>Expected Passing Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2027"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />
                </div>

                <div className="onboard-field">
                  <label>Aggregate Score (%)</label>
                  <input
                    type="text"
                    placeholder="e.g. 74%"
                    value={scorePercentage}
                    onChange={(e) => setScorePercentage(e.target.value)}
                  />
                </div>
              </div>

              <div className="onboard-row">
                <div className="onboard-field">
                  <label>GitHub Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>

                <div className="onboard-field">
                  <label>LinkedIn Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="step-actions">
                <div />
                <button
                  type="button"
                  className="stu-btn-primary"
                  onClick={() => {
                    if (!college.trim()) {
                      setError("Please provide your college name.");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                >
                  Next: Role & Verified Skills →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="step-content">
              <div className="step-title-wrap">
                <span className="step-kicker">ENGINEERING TRACK</span>
                <h3>Target Role & Skill Inventory</h3>
              </div>

              <div className="onboard-field">
                <label>Target Role Track *</label>
                <select value={preferredRole} onChange={(e) => setPreferredRole(e.target.value)}>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                  <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                  <option value="AI / ML Engineer">AI / ML Engineer</option>
                </select>
              </div>

              <div className="onboard-field">
                <label>Add Skill to Profile</label>
                <div className="add-skill-row">
                  <select
                    value={selectedPresetSkill}
                    onChange={(e) => setSelectedPresetSkill(e.target.value)}
                  >
                    <option value="">-- Select from standard catalog --</option>
                    {PREDEFINED_SKILLS.map((skill) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSkillLevel}
                    onChange={(e) => setSelectedSkillLevel(e.target.value)}
                    style={{ width: "150px" }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>

                  <button
                    type="button"
                    className="stu-btn-primary"
                    style={{ padding: "8px 16px" }}
                    onClick={() => handleAddPresetSkill()}
                  >
                    + Add
                  </button>
                </div>
              </div>

              <label className="sub-field-lbl">Quick Add Technical Skills:</label>
              <div className="quick-suggestions-wrap">
                {PREDEFINED_SKILLS.slice(0, 10).map((skill) => {
                  const isAdded = skills.some((s) => s.name === skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      className={`suggestion-pill ${isAdded ? "added" : ""}`}
                      onClick={() => !isAdded && handleAddPresetSkill(skill)}
                      disabled={isAdded}
                    >
                      {isAdded ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>

              <label className="sub-field-lbl" style={{ marginTop: "16px" }}>
                Selected Skill Stack ({skills.length}):
              </label>
              <div className="tags-container">
                {skills.map((skill, index) => (
                  <div className="skill-chip-badge" key={index}>
                    <span>{skill.name}</span>
                    <small>({skill.level})</small>
                    <button type="button" onClick={() => handleRemoveSkill(index)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button type="button" className="stu-btn-ghost" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="stu-btn-primary"
                  onClick={() => {
                    if (skills.length === 0) {
                      setError("Please select at least 1 technical skill.");
                      return;
                    }
                    setError("");
                    setStep(3);
                  }}
                >
                  Next: Projects & Interests →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-title-wrap">
                <span className="step-kicker">SHOWCASE & ALIGNMENT</span>
                <h3>Specializations & Prior Projects</h3>
              </div>

              <div className="onboard-field">
                <label>Focus Areas & Interests</label>
                <div className="quick-suggestions-wrap">
                  {PREDEFINED_INTERESTS.map((interest) => {
                    const isSelected = interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        className={`suggestion-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => handleToggleInterest(interest)}
                      >
                        {isSelected ? `✓ ${interest}` : interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="project-group">
                <div className="group-title-row">
                  <label>Portfolio Projects</label>
                  <button type="button" className="btn-text-link" onClick={addProjectRow}>
                    + Add Another Project
                  </button>
                </div>

                {projects.map((proj, idx) => (
                  <div className="project-inputs-card" key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="proj-card-num">Project #{idx + 1}</span>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          className="btn-text-danger"
                          onClick={() => removeProjectRow(idx)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Project Title (e.g. Distributed Task Queue)"
                      value={proj.title}
                      onChange={(e) => handleProjectChange(idx, "title", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Tech Stack Used (e.g. React, Node.js, Redis)"
                      value={proj.tech}
                      onChange={(e) => handleProjectChange(idx, "tech", e.target.value)}
                    />
                    <input
                      type="url"
                      placeholder="GitHub Repository / Deployment Link"
                      value={proj.link}
                      onChange={(e) => handleProjectChange(idx, "link", e.target.value)}
                    />
                    <textarea
                      rows="2"
                      placeholder="Overview of scope, engineering challenges, and achievements..."
                      value={proj.desc}
                      onChange={(e) => handleProjectChange(idx, "desc", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button type="button" className="stu-btn-ghost" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="stu-btn-primary"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                >
                  {loading ? "Verifying & Saving..." : "Complete Setup & Open Dashboard →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}