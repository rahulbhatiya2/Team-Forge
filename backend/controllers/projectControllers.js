const Project = require("../models/project");
const User = require("../models/user");
const mongoose = require("mongoose");

// ==========================================
// Standard Industry SDLC / Agile Capstone Stages
// ==========================================
const STANDARD_INDUSTRY_STAGES = [
  {
    title: "Stage 1: Discovery, SRS & System Architecture",
    tasks: [
      { text: "Requirement analysis, PRD breakdown & milestone scoping", completed: false },
      { text: "System architecture, high-level (HLD) & low-level (LLD) design", completed: false },
      { text: "Database schema normalization, indexing plan & ER diagram", completed: false },
      { text: "RESTful API contracts & payload specification", completed: false },
    ],
  },
  {
    title: "Stage 2: Core Sprint Development & API Integration",
    tasks: [
      { text: "Backend service routes, controllers & middleware authorization", completed: false },
      { text: "Frontend responsive interface & global state flow integration", completed: false },
      { text: "End-to-end API client integration & error handling boundaries", completed: false },
    ],
  },
  {
    title: "Stage 3: Testing, Code Quality & Security Audits",
    tasks: [
      { text: "Unit & integration testing with mock assertions", completed: false },
      { text: "Cross-browser validation, UI edge cases & responsive testing", completed: false },
      { text: "Security screening (CORS, auth tokens & environment secret audits)", completed: false },
    ],
  },
  {
    title: "Stage 4: Staging Deployment, Demo & Client Sign-off",
    tasks: [
      { text: "Production build optimization & staging environment deploy", completed: false },
      { text: "Sprint deliverable walkthrough demo & company lead review", completed: false },
      { text: "Final code review, repository documentation & artifact sign-off", completed: false },
    ],
  },
];

// Helper: Busy Students (Students currently in non-completed projects)
async function getBusyStudentIds(excludeProjectId = null) {
  const query = { status: { $ne: "Completed" } };
  if (excludeProjectId && mongoose.Types.ObjectId.isValid(excludeProjectId)) {
    query._id = { $ne: excludeProjectId };
  }

  const activeProjects = await Project.find(query).select("matchedSquad");
  const busyIds = new Set();

  activeProjects.forEach((proj) => {
    (proj.matchedSquad || []).forEach((member) => {
      if (member.studentId) {
        busyIds.add(String(member.studentId));
      }
    });
  });

  return Array.from(busyIds);
}

function merge(left, right) {
  let result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i].matchScore >= right[j].matchScore) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}

function customMergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  return merge(customMergeSort(arr.slice(0, mid)), customMergeSort(arr.slice(mid)));
}

function scoreStudentsForProject(students, project) {
  const targetSkillSet = new Set((project.requiredSkills || []).map((s) => s.toLowerCase().trim()));
  const targetRolesSet = new Set((project.requiredRoles || []).map((r) => r.toLowerCase().trim()));

  const evaluated = students.map((stu) => {
    const studentSkillSet = new Set(
      (stu.skills || []).map((s) => (s.name ? s.name.toLowerCase().trim() : ""))
    );

    let matchedCount = 0;
    targetSkillSet.forEach((reqSkill) => {
      if (studentSkillSet.has(reqSkill)) matchedCount++;
    });

    const skillMatchRatio = targetSkillSet.size > 0 ? matchedCount / targetSkillSet.size : 0;
    const studentRole = (stu.preferredRole || "").toLowerCase().trim();
    const roleBonus = targetRolesSet.has(studentRole) ? 10 : 0;

    let score = Math.round(skillMatchRatio * 55 + 35 + roleBonus);
    if (matchedCount > 0) score += 5;
    const finalScore = Math.min(Math.max(score, 65), 98);

    const fullName = `${stu.firstName || ""} ${stu.lastName || ""}`.trim() || stu.email.split("@")[0];

    return {
      studentId: stu._id,
      name: fullName,
      email: stu.email,
      college: stu.college || "University Student",
      role: stu.preferredRole || "Developer",
      skills: stu.skills || [],
      matchScore: finalScore,
      assignedAt: new Date(),
    };
  });

  return customMergeSort(evaluated);
}

// 1. Create Project (Assigns ONLY free students)
exports.createProject = async (req, res) => {
  try {
    const { 
      companyId, 
      companyName, 
      title, 
      type, 
      description, 
      requiredSkills, 
      requiredRoles, 
      teamSize,
      deadline,
    } = req.body;

    if (!title || !description || !requiredSkills || requiredSkills.length === 0) {
      return res.status(400).json({ error: "Title, description and required skills are required." });
    }

    // Step A: Find students who are NOT in any active project
    const busyIds = await getBusyStudentIds();
    const availableStudents = await User.find({
      role: "student",
      _id: { $nin: busyIds },
    }).select("-password");

    const sorted = scoreStudentsForProject(availableStudents, { requiredSkills, requiredRoles });

    const targetSize = Number(teamSize) || 4;
    const finalSquad = sorted.slice(0, targetSize).map(m => ({
      ...m,
      assignedAt: new Date()
    }));

    const newProject = new Project({
      companyId: mongoose.Types.ObjectId.isValid(companyId) ? companyId : undefined,
      companyName: companyName || "Company",
      title,
      type: type || "Industry Capstone",
      description,
      requiredSkills,
      requiredRoles: requiredRoles || ["Frontend Developer", "Backend Developer"],
      teamSize: targetSize,
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "Open",
      phases: STANDARD_INDUSTRY_STAGES,
      notes: [],
      matchedSquad: finalSquad,
    });

    const savedProject = await newProject.save();
    return res.status(201).json({ message: "Project deployed!", project: savedProject });
  } catch (err) {
    console.error("Create Project Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 2. Get All Projects
exports.getAllProjects = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = {};

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }

    let projects = await Project.find(filter).sort({ createdAt: -1 });

    for (let proj of projects) {
      if (!proj.phases || proj.phases.length === 0) {
        proj.phases = STANDARD_INDUSTRY_STAGES;
        await proj.save();
      }
    }

    return res.status(200).json({ projects });
  } catch (err) {
    console.error("Get Projects Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 3. Get Available Candidates (Excludes busy students)
exports.getAvailableCandidates = async (req, res) => {
  try {
    const { currentProjectId } = req.query;
    const busyIds = await getBusyStudentIds(currentProjectId);

    const students = await User.find({ 
      role: "student",
      _id: { $nin: busyIds }
    }).select("-password");

    return res.status(200).json({ students });
  } catch (err) {
    console.error("Get Candidates Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 4. Update Status / Squad / Auto-Fill
exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, matchedSquad, autoFill } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Project ID format." });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    let finalSquad = matchedSquad !== undefined ? matchedSquad : project.matchedSquad;

    if (autoFill && finalSquad.length < project.teamSize) {
      const neededCount = project.teamSize - finalSquad.length;
      
      const busyInOtherProjects = await getBusyStudentIds(project._id);
      const currentSquadIds = finalSquad.map((m) => String(m.studentId));
      const allExcludedIds = Array.from(new Set([...busyInOtherProjects, ...currentSquadIds]));

      const candidateUsers = await User.find({ 
        role: "student", 
        _id: { $nin: allExcludedIds } 
      }).select("-password");
      
      const scoredReplacements = scoreStudentsForProject(candidateUsers, project);
      if (scoredReplacements.length > 0) {
        const topReplacements = scoredReplacements.slice(0, neededCount).map((cand) => ({
          ...cand,
          assignedAt: new Date()
        }));
        finalSquad = [...finalSquad, ...topReplacements];
      }
    }

    if (status === "Locked" && project.status !== "Locked") {
      project.lockedAt = new Date();
    } else if (status === "Open") {
      project.lockedAt = null;
    }

    project.status = status || project.status;
    project.matchedSquad = finalSquad;

    const updated = await project.save();
    return res.status(200).json({
      message: "Squad status updated successfully!",
      project: updated,
    });
  } catch (err) {
    console.error("Status Update Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 5. Add Note
exports.addProjectNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Note text is required." });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    project.notes.unshift({
      text: text.trim(),
      author: author || "Company Lead",
      createdAt: new Date(),
    });

    const saved = await project.save();
    return res.status(200).json({ message: "Note shared with squad!", project: saved });
  } catch (err) {
    console.error("Add Note Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 6. Toggle Task Status
exports.toggleTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { phaseIndex, taskIndex, studentName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Project ID format." });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (!project.phases || !project.phases[phaseIndex] || !project.phases[phaseIndex].tasks[taskIndex]) {
      return res.status(400).json({ error: "Stage task not found." });
    }

    const task = project.phases[phaseIndex].tasks[taskIndex];
    task.completed = !task.completed;
    task.completedBy = task.completed ? (studentName || "Student") : "";
    task.completedAt = task.completed ? new Date() : null;

    let allFinished = true;
    for (let phase of project.phases) {
      for (let t of phase.tasks) {
        if (!t.completed) {
          allFinished = false;
          break;
        }
      }
      if (!allFinished) break;
    }

    const hasSubmission = Boolean(project.submission && project.submission.githubUrl);
    if (allFinished && hasSubmission) {
      project.status = "Completed";
    } else if (!allFinished && project.status === "Completed") {
      project.status = "Open";
    }

    project.markModified("phases");
    const saved = await project.save();

    return res.status(200).json({
      message: allFinished
        ? "All stages finished! Submit final project links below to complete the project."
        : "Task status updated!",
      project: saved,
    });
  } catch (err) {
    console.error("Toggle Task Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 7. Submit Deliverables
exports.submitDeliverables = async (req, res) => {
  try {
    const { id } = req.params;
    const { githubUrl, liveDemoUrl, notes, studentName } = req.body;

    if (!githubUrl || !githubUrl.trim()) {
      return res.status(400).json({ error: "GitHub repository URL is required." });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    let allFinished = true;
    for (let phase of (project.phases || [])) {
      for (let t of (phase.tasks || [])) {
        if (!t.completed) {
          allFinished = false;
          break;
        }
      }
      if (!allFinished) break;
    }

    if (!allFinished) {
      return res.status(400).json({ error: "Please complete all stage tasks before submitting deliverables." });
    }

    project.submission = {
      githubUrl: githubUrl.trim(),
      liveDemoUrl: liveDemoUrl ? liveDemoUrl.trim() : "",
      notes: notes ? notes.trim() : "",
      submittedBy: studentName || "Student Candidate",
      submittedAt: new Date(),
    };

    project.status = "Completed";

    const saved = await project.save();
    return res.status(200).json({
      message: "Deliverables submitted! Project is now marked as Completed.",
      project: saved,
    });
  } catch (err) {
    console.error("Submit Deliverables Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 8. Leave Project Squad (With Company Lock & 24hr Window Rules)
exports.leaveProjectSquad = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, studentEmail, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Project ID." });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ error: "Project not found." });

    if (project.status === "Completed") {
      return res.status(400).json({ error: "Completed project se opt-out nahi kar sakte." });
    }

    // Rule 1: Squad Lock check
    if (project.status === "Locked") {
      return res.status(403).json({ 
        error: "Yeh squad officially Company dwara Lock ho chuki hai. Ab aap opt-out nahi kar sakte." 
      });
    }

    const targetStudent = project.matchedSquad.find(
      (m) =>
        (m.studentId && String(m.studentId) === String(studentId)) ||
        (m.email && m.email.toLowerCase().trim() === String(studentEmail).toLowerCase().trim())
    );

    if (!targetStudent) {
      return res.status(404).json({ error: "Aap is squad ke member nahi hain." });
    }

    // Rule 2: 24 Hours grace period check
    const assignedTime = targetStudent.assignedAt ? new Date(targetStudent.assignedAt).getTime() : new Date(project.createdAt).getTime();
    const currentTime = Date.now();
    const hoursElapsed = (currentTime - assignedTime) / (1000 * 60 * 60);

    if (hoursElapsed > 24) {
      return res.status(403).json({
        error: "Opt-out window expire ho chuki hai! Candidate allocation ke 24 ghante ke andar hi leave kar sakta hai."
      });
    }

    const studentName = targetStudent?.name || "A candidate";

    project.matchedSquad = project.matchedSquad.filter(
      (m) =>
        String(m.studentId) !== String(studentId) &&
        m.email?.toLowerCase().trim() !== String(studentEmail).toLowerCase().trim()
    );

    project.notes.unshift({
      text: `⚠️ Candidate Opt-Out: ${studentName} ne squad se opt-out kar liya hai.${reason ? ` Reason: "${reason}"` : ""} Slot vacant ho gaya hai.`,
      author: "System Dispatcher",
      createdAt: new Date(),
    });

    await project.save();

    return res.status(200).json({
      message: "Aap successfully is squad se opt-out ho chuke hain.",
    });
  } catch (err) {
    console.error("Leave Project Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 9. Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Project ID format." });
    }
    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Project not found" });
    return res.status(200).json({ message: "Project deleted successfully!" });
  } catch (err) {
    console.error("Delete Project Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 10. Dashboard Stats
exports.getCompanyDashboardStats = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = {};
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }

    const totalStudents = await User.countDocuments({ role: "student" });
    const projects = await Project.find(filter);
    const activeProjectsCount = projects.filter((p) => p.status !== "Completed").length;

    let totalScoreSum = 0;
    let totalAssignedMembers = 0;

    const roleCounts = { Frontend: 0, Backend: 0, Design: 0, Testing: 0 };

    projects.forEach((proj) => {
      (proj.matchedSquad || []).forEach((member) => {
        if (member.matchScore) {
          totalScoreSum += member.matchScore;
          totalAssignedMembers++;
        }
        const roleStr = (member.role || "").toLowerCase();
        if (roleStr.includes("front") || roleStr.includes("react") || roleStr.includes("web")) roleCounts.Frontend++;
        else if (roleStr.includes("back") || roleStr.includes("node") || roleStr.includes("api")) roleCounts.Backend++;
        else if (roleStr.includes("design") || roleStr.includes("ui") || roleStr.includes("ux")) roleCounts.Design++;
        else if (roleStr.includes("test") || roleStr.includes("qa")) roleCounts.Testing++;
      });
    });

    const avgMatchScore = totalAssignedMembers > 0
      ? Math.round(totalScoreSum / totalAssignedMembers)
      : (totalStudents > 0 ? 88 : 0);

    const maxReference = Math.max(totalAssignedMembers, 5);
    const synergyBreakdown = [
      { label: "Frontend", value: Math.min(Math.round((roleCounts.Frontend / maxReference) * 100) + 30, 95) },
      { label: "Backend", value: Math.min(Math.round((roleCounts.Backend / maxReference) * 100) + 35, 96) },
      { label: "Design", value: Math.min(Math.round((roleCounts.Design / maxReference) * 100) + 25, 90) },
      { label: "QA/Testing", value: Math.min(Math.round((roleCounts.Testing / maxReference) * 100) + 20, 85) },
    ];

    const lowestSynergy = [...synergyBreakdown].sort((a, b) => a.value - b.value)[0];

    return res.status(200).json({
      stats: {
        totalTalent: totalStudents,
        activeRequisitions: activeProjectsCount,
        avgMatchScore: `${avgMatchScore}%`,
        timeToStaff: totalStudents > 0 ? "1.8 Days" : "N/A",
      },
      synergyData: synergyBreakdown,
      skillGap: lowestSynergy.value < 55
        ? `Critically low on ${lowestSynergy.label} talent in current squads.`
        : `Balanced squad distribution across all domains.`,
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    return res.status(500).json({ error: err.message });
  }
};