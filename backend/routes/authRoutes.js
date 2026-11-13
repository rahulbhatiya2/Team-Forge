const express = require("express");
const router = express.Router();
const {
  register,
  login,
  completeStudentOnboarding,
  getStudentProfile,
  updateStudentProfile,
} = require("../controllers/authController");

// Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.put("/complete-student-onboarding/:id", completeStudentOnboarding);

// Student Dashboard Routes
router.get("/student/:id", getStudentProfile);
router.put("/student/update/:id", updateStudentProfile);

module.exports = router;