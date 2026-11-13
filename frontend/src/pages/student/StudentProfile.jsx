import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "../../components/students/StudentNavbar";
import "./StudentProfile.css";

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

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  college: "",
  course: "MCA",
  semester: "3rd Semester",
  graduationYear: "2027",
  scorePercentage: "",
  githubUrl: "",
  linkedinUrl: "",
  preferredRole: "Frontend Developer",
  skills: [],
  interests: [],
  previousProjects: [],
};

export default function StudentProfile() {
  const storedUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  const userId =
    localStorage.getItem("nexus_user_id") ||
    storedUser?._id ||
    storedUser?.id;

  const [student, setStudent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [projectDraft, setProjectDraft] = useState({ title: "", tech: "", desc: "", link: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/auth/student/${userId}`);
        const data = await response.json();

        if (response.ok && isMounted) {
          const s = data.student || data.user || data;

          if (!s || (!s._id && !s.email && !s.college)) {
            throw new Error("Student data format invalid");
          }

          const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || storedUser?.firstName || "Student Candidate";

          const loadedProjects = Array.isArray(s.previousProjects)
            ? s.previousProjects
            : Array.isArray(s.projects)
            ? s.projects
            : [];

          let score = 25;
          if (s.college) score += 15;
          if (s.preferredRole) score += 15;
          if (s.graduationYear) score += 10;
          if (s.githubUrl || s.linkedinUrl) score += 10;
          if (s.skills && s.skills.length > 0) score += 15;
          if (loadedProjects.length > 0) score += 10;

          setStudent({ ...s, name: fullName, previousProjects: loadedProjects, profileScore: Math.min(score, 100) });
          setFormData({
            firstName: s.firstName || storedUser?.firstName || "",
            lastName: s.lastName || storedUser?.lastName || "",
            college: s.college || "",
            course: s.course || "MCA",
            semester: s.semester || "3rd Semester",
            graduationYear: s.graduationYear || "2027",
            scorePercentage: s.scorePercentage || "",
            githubUrl: s.githubUrl || "",
            linkedinUrl: s.linkedinUrl || "",
            preferredRole: s.preferredRole || "Frontend Developer",
            skills: Array.isArray(s.skills) ? s.skills : [],
            interests: Array.isArray(s.interests) ? s.interests : [],
            previousProjects: loadedProjects,
          });
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setErrorMsg("Failed to load profile details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => { isMounted = false; };
  }, [userId]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (!selectedSkill) return;
    if (formData.skills.some((s) => s.name?.toLowerCase() === selectedSkill.toLowerCase())) {
      setErrorMsg(`"${selectedSkill}" already added.`);
      return;
    }
    updateField("skills", [...formData.skills, { name: selectedSkill, level: skillLevel }]);
    setSelectedSkill("");
    setErrorMsg("");
  };

  const removeSkill = (index) => {
    updateField("skills", formData.skills.filter((_, i) => i !== index));
  };

  const toggleInterest = (item) => {
    if (formData.interests.includes(item)) {
      updateField("interests", formData.interests.filter((i) => i !== item));
    } else {
      updateField("interests", [...formData.interests, item]);
    }
  };

  const addProject = () => {
    if (!projectDraft.title.trim()) {
      setErrorMsg("Please add project title.");
      return;
    }
    updateField("previousProjects", [...formData.previousProjects, { ...projectDraft }]);
    setProjectDraft({ title: "", tech: "", desc: "", link: "" });
    setErrorMsg("");
  };

  const removeProject = (index) => {
    updateField("previousProjects", formData.previousProjects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`http://localhost:5000/api/auth/student/update/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profile update failed.");

      const updated = data.student || data.user || data;
      const fullName = `${updated.firstName || ""} ${updated.lastName || ""}`.trim() || "Student Candidate";

      setStudent((prev) => ({ ...prev, ...updated, name: fullName }));
      setIsEditing(false);
      setSuccessMsg("Profile credentials successfully updated!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-shell profile-loading">
        <div className="profile-spinner" />
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  const s = student || {};

  return (
    <div className="profile-shell">
      <StudentNavbar activeTab="profile" student={student} />

      <main className="profile-container">
        {/* Top Hero Section */}
        <section className="profile-hero">
          <div className="profile-hero-inner">
            <div className="pill-live">
              <span className="dot" /> VERIFIED TALENT CREDENTIALS
            </div>
            <div className="profile-hero-row">
              <div>
                <h1>Candidate Profile</h1>
                <p className="profile-hero-sub">
                  Your academic records, skill competencies, and project portfolio — verified for company matching.
                </p>
              </div>

              <div className="profile-hero-actions">
                <Link to="/student/dashboard" className="btn-outline-back">
                  ← Dashboard
                </Link>
                {!isEditing && (
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => {
                      setErrorMsg("");
                      setIsEditing(true);
                    }}
                  >
                    ✏️ Edit Credentials
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Shelf */}
        <div className="profile-content-shelf">
          {errorMsg && <div className="profile-alert error">{errorMsg}</div>}
          {successMsg && <div className="profile-alert success">{successMsg}</div>}

          {/* Header Card (Identity Ribbon with Dark Forest Tint) */}
          <div className="profile-identity-card">
            <div className="profile-avatar-large">
              {(s.name || "ST")
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="profile-identity-info">
              <div className="pi-row">
                <h2>{s.name || "Student Candidate"}</h2>
                <span className="pi-track-badge">{s.preferredRole || "Developer"}</span>
              </div>
              <p className="pi-meta">
                🏛️ <strong>{s.college || "University / College not specified"}</strong> · 🎓 {s.course} ({s.semester})
              </p>
              <p className="pi-email">✉️ {s.email}</p>
            </div>

            <div className="profile-metrics-pill-wrap">
              <div className="metric-box-card">
                <span className="mb-num">{s.profileScore || 85}%</span>
                <span className="mb-lbl">Profile Strength</span>
              </div>
              <div className="metric-box-card">
                <span className="mb-num">{s.skills?.length || 0}</span>
                <span className="mb-lbl">Skills Logged</span>
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="profile-studio-grid">
              {/* Academic Info */}
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">01 / ENROLLMENT</span>
                    <h3>Academic Information</h3>
                  </div>
                </div>

                <div className="info-kv-grid">
                  <div className="kv-item">
                    <span className="kv-lbl">College / University</span>
                    <p>{s.college || "Not provided"}</p>
                  </div>
                  <div className="kv-item">
                    <span className="kv-lbl">Degree & Stream</span>
                    <p>{s.course || "MCA"}</p>
                  </div>
                  <div className="kv-item">
                    <span className="kv-lbl">Current Semester</span>
                    <p>{s.semester || "Semester not set"}</p>
                  </div>
                  <div className="kv-item">
                    <span className="kv-lbl">Expected Graduation</span>
                    <p>{s.graduationYear || "Batch year not set"}</p>
                  </div>
                  <div className="kv-item">
                    <span className="kv-lbl">Aggregate Score</span>
                    <p>{s.scorePercentage ? `${s.scorePercentage}` : "Not listed"}</p>
                  </div>
                  <div className="kv-item highlight-tile">
                    <span className="kv-lbl">Target Role Track</span>
                    <p className="highlight-role">{s.preferredRole || "Developer"}</p>
                  </div>
                </div>
              </div>

              {/* Verified Technical Skills */}
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">02 / COMPETENCIES</span>
                    <h3>Technical Skills ({s.skills?.length || 0})</h3>
                  </div>
                </div>

                {s.skills && s.skills.length > 0 ? (
                  <div className="skills-badge-grid">
                    {s.skills.map((skill, idx) => (
                      <div className="skill-tile" key={idx}>
                        <div className="st-left">
                          <span className="st-dot" />
                          <strong>{skill.name}</strong>
                        </div>
                        <span className="st-level">{skill.level || "Intermediate"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No technical skills added yet.</p>
                )}
              </div>

              {/* Featured Projects */}
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">03 / SHOWCASE</span>
                    <h3>Featured Projects ({s.previousProjects?.length || 0})</h3>
                  </div>
                </div>

                {s.previousProjects && s.previousProjects.length > 0 ? (
                  <div className="projects-record-list">
                    {s.previousProjects.map((p, idx) => (
                      <div className="proj-record-item" key={idx}>
                        <div className="pri-head">
                          <h4>{p.title}</h4>
                          {p.tech && <span className="pri-tech">{p.tech}</span>}
                        </div>
                        <p className="pri-desc">{p.desc || "No description provided."}</p>
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noreferrer" className="pri-link">
                            Project Link ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No previous projects showcased yet.</p>
                )}
              </div>

              {/* Profiles & Links */}
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">04 / CONNECTIONS</span>
                    <h3>Profiles & Social Links</h3>
                  </div>
                </div>

                <div className="links-row-grid">
                  <div className="link-status-box">
                    <span className="lsb-lbl">GitHub Repository</span>
                    {s.githubUrl ? (
                      <a href={s.githubUrl} target="_blank" rel="noreferrer" className="lsb-link">
                        {s.githubUrl} ↗
                      </a>
                    ) : (
                      <span className="lsb-none">No GitHub URL added</span>
                    )}
                  </div>
                  <div className="link-status-box">
                    <span className="lsb-lbl">LinkedIn Network</span>
                    {s.linkedinUrl ? (
                      <a href={s.linkedinUrl} target="_blank" rel="noreferrer" className="lsb-link">
                        {s.linkedinUrl} ↗
                      </a>
                    ) : (
                      <span className="lsb-none">No LinkedIn URL added</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Focus Areas */}
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">05 / DOMAINS</span>
                    <h3>Areas of Interest</h3>
                  </div>
                </div>

                {s.interests && s.interests.length > 0 ? (
                  <div className="chips-cloud">
                    {s.interests.map((item, idx) => (
                      <span className="cloud-chip" key={idx}>{item}</span>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">No interest areas selected yet.</p>
                )}
              </div>
            </div>
          ) : (
            /* EDIT FORM */
            <form onSubmit={handleSubmit} className="profile-edit-studio">
              <div className="profile-card">
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">EDIT PROFILE</span>
                    <h3>Academic & Basic Details</h3>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-unit">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-unit">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-unit" style={{ marginTop: "18px" }}>
                  <label>College / University Name *</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => updateField("college", e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2" style={{ marginTop: "18px" }}>
                  <div className="field-unit">
                    <label>Course / Program</label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => updateField("course", e.target.value)}
                    />
                  </div>
                  <div className="field-unit">
                    <label>Current Semester</label>
                    <input
                      type="text"
                      value={formData.semester}
                      onChange={(e) => updateField("semester", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: "18px" }}>
                  <div className="field-unit">
                    <label>Graduation Year</label>
                    <input
                      type="text"
                      value={formData.graduationYear}
                      onChange={(e) => updateField("graduationYear", e.target.value)}
                    />
                  </div>
                  <div className="field-unit">
                    <label>Aggregate Score (%)</label>
                    <input
                      type="text"
                      placeholder="e.g. 74%"
                      value={formData.scorePercentage}
                      onChange={(e) => updateField("scorePercentage", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: "18px" }}>
                  <div className="field-unit">
                    <label>Target Role Track</label>
                    <select
                      value={formData.preferredRole}
                      onChange={(e) => updateField("preferredRole", e.target.value)}
                    >
                      <option value="Frontend Developer">Frontend Developer</option>
                      <option value="Backend Developer">Backend Developer</option>
                      <option value="Full Stack Developer">Full Stack Developer</option>
                      <option value="UI/UX Designer">UI/UX Designer</option>
                      <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                      <option value="AI / ML Engineer">AI / ML Engineer</option>
                      <option value="Software Developer">Software Developer</option>
                    </select>
                  </div>
                  <div className="field-unit">
                    <label>GitHub Profile URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={formData.githubUrl}
                      onChange={(e) => updateField("githubUrl", e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-unit" style={{ marginTop: "18px" }}>
                  <label>LinkedIn Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedinUrl}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                  />
                </div>
              </div>

              {/* Skills Editor */}
              <div className="profile-card" style={{ marginTop: "24px" }}>
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">SKILLS INVENTORY</span>
                    <h3>Manage Technical Skills</h3>
                  </div>
                </div>

                <div className="skill-input-row">
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="skill-select"
                  >
                    <option value="">-- Choose skill from catalog --</option>
                    {PREDEFINED_SKILLS.map((sk) => (
                      <option key={sk} value={sk}>{sk}</option>
                    ))}
                  </select>

                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className="level-select"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>

                  <button type="button" className="btn-add-inline" onClick={addSkill}>
                    + Add Skill
                  </button>
                </div>

                <div className="tags-flex-wrap">
                  {formData.skills.map((s, idx) => (
                    <span className="editable-tag" key={idx}>
                      {s.name} <small>({s.level})</small>
                      <button type="button" onClick={() => removeSkill(idx)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Interests Editor */}
              <div className="profile-card" style={{ marginTop: "24px" }}>
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">SPECIALIZATIONS</span>
                    <h3>Areas of Interest</h3>
                  </div>
                </div>

                <div className="interest-pills-row">
                  {PREDEFINED_INTERESTS.map((int) => {
                    const active = formData.interests.includes(int);
                    return (
                      <button
                        type="button"
                        key={int}
                        className={`toggle-interest-pill ${active ? "active" : ""}`}
                        onClick={() => toggleInterest(int)}
                      >
                        {active ? `✓ ${int}` : `+ ${int}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Projects Editor */}
              <div className="profile-card" style={{ marginTop: "24px" }}>
                <div className="card-header">
                  <div>
                    <span className="kicker-lbl">PORTFOLIO</span>
                    <h3>Showcase Projects</h3>
                  </div>
                </div>

                <div className="draft-project-form">
                  <input
                    type="text"
                    placeholder="Project Title (e.g. Distributed Analytics Engine)"
                    value={projectDraft.title}
                    onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack Used (e.g. React, Node.js, Redis)"
                    value={projectDraft.tech}
                    onChange={(e) => setProjectDraft({ ...projectDraft, tech: e.target.value })}
                  />
                  <input
                    type="url"
                    placeholder="Project / Demo URL (Optional)"
                    value={projectDraft.link}
                    onChange={(e) => setProjectDraft({ ...projectDraft, link: e.target.value })}
                  />
                  <textarea
                    rows="2"
                    placeholder="Short description of your contribution and deliverables..."
                    value={projectDraft.desc}
                    onChange={(e) => setProjectDraft({ ...projectDraft, desc: e.target.value })}
                  />
                  <button type="button" className="btn-add-inline" onClick={addProject}>
                    + Add to Showcase
                  </button>
                </div>

                <div className="added-projects-list">
                  {formData.previousProjects.map((p, idx) => (
                    <div className="added-project-row" key={idx}>
                      <div>
                        <strong>{p.title}</strong>
                        <span className="ap-tech">{p.tech}</span>
                        <p>{p.desc}</p>
                      </div>
                      <button type="button" className="btn-del-proj" onClick={() => removeProject(idx)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="profile-form-footer">
                <button
                  type="button"
                  className="btn-outline-back"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Credentials ✓"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}