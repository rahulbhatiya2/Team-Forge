const express = require("express");
const router = express.Router();

const {
  createProject,
  getAllProjects,
  getAvailableCandidates,
  updateProjectStatus,
  deleteProject,
  getCompanyDashboardStats,
  addProjectNote,
  toggleTaskStatus,
  submitDeliverables,
  leaveProjectSquad, // 👈 New Opt-Out Handler
} = require("../controllers/projectControllers");

router.post("/create", createProject);
router.get("/all", getAllProjects);
router.get("/dashboard-stats", getCompanyDashboardStats);
router.get("/candidates", getAvailableCandidates);
router.put("/:id/status", updateProjectStatus);
router.post("/:id/notes", addProjectNote);
router.put("/:id/tasks/toggle", toggleTaskStatus);
router.put("/:id/submit-deliverables", submitDeliverables);
router.put("/:id/leave", leaveProjectSquad); // 👈 New route
router.delete("/:id", deleteProject);

module.exports = router;