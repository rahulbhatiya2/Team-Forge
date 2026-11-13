import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/company/Navbar";
import "./browsestudents.css";

function getInitials(name) {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function BrowseStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/projects/candidates");
        const data = await res.json();
        if (isMounted && res.ok && data.students) {
          setStudents(data.students);
        }
      } catch (err) {
        console.error("Failed to load students:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStudents();
    return () => { isMounted = false; };
  }, []);

  const getStudentSkillNames = (student) => {
    if (!student.skills || !Array.isArray(student.skills)) return [];
    return student.skills.map((s) => (typeof s === "object" && s.name ? s.name : String(s)));
  };

  const allSkills = useMemo(() => {
    return [
      "All",
      ...new Set(students.flatMap((s) => getStudentSkillNames(s)).filter(Boolean)),
    ];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email?.split("@")[0] || "";
      const studentSkills = getStudentSkillNames(student);
      const role = student.preferredRole || "";

      const matchesSearch =
        fullName.toLowerCase().includes(search.toLowerCase()) ||
        role.toLowerCase().includes(search.toLowerCase());

      const matchesSkill =
        skillFilter === "All" ||
        studentSkills.some((s) => s.toLowerCase() === skillFilter.toLowerCase());

      return matchesSearch && matchesSkill;
    });
  }, [students, search, skillFilter]);

  return (
    <div className="browse-container">
      <Navbar />

      <div className="browse-page">
        <div className="browse-header">
          <div className="browse-kicker">
            <span className="dot" /> Talent Directory
          </div>
          <h1>Browse Verified Students</h1>
          <p>Explore real registered candidates, verified skill proficiencies, and candidate availability.</p>
        </div>

        <div className="filters-bar">
          <div className="filters-left">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search candidates by name or target role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="skill-select"
            >
              {allSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill === "All" ? "All Skill Stacks" : skill}
                </option>
              ))}
            </select>
          </div>

          <div className="results-count">
            {filteredStudents.length} Available Profile{filteredStudents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div className="student-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="shimmer-card" />
            ))}
          </div>
        ) : (
          <div className="student-grid">
            {filteredStudents.length === 0 ? (
              <div className="no-results">
                <div style={{ fontSize: "28px" }}>🔍</div>
                <h3>No candidates found</h3>
                <p>Try searching for a different keyword or resetting your skill filter.</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const fullName =
                  `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
                  student.email?.split("@")[0] ||
                  "Student Candidate";
                const skillNames = getStudentSkillNames(student);

                return (
                  <div className="student-card" key={student._id}>
                    <div className="card-top-row">
                      <div className="avatar">{getInitials(fullName)}</div>
                      <span className="verified-badge">✓ Verified</span>
                    </div>

                    <div className="student-info">
                      <h3 className="student-name">{fullName}</h3>
                      <p className="student-role">
                        {student.preferredRole || "Software Developer"}
                      </p>
                      <p className="student-college">
                        {student.college || "University Student"}
                      </p>
                    </div>

                    <div className="skill-tags">
                      {skillNames.length > 0 ? (
                        skillNames.slice(0, 4).map((skill, idx) => (
                          <span className="tag" key={`${skill}-${idx}`}>
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="tag tag-empty">Core Stack</span>
                      )}
                      {skillNames.length > 4 && (
                        <span className="tag" style={{ background: "#edf3e9", color: "#28543e" }}>
                          +{skillNames.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}