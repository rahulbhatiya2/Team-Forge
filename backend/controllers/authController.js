const User = require("../models/user");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// @route   POST /api/auth/register
// @desc    Register initial account
exports.register = async (req, res) => {
  try {
    const { role, firstName, lastName, companyName, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      role: role || "student",
      firstName: role === "student" ? firstName?.trim() : undefined,
      lastName: role === "student" ? lastName?.trim() : undefined,
      companyName: role === "company" ? companyName?.trim() : undefined,
      email: normalizedEmail,
      password: hashedPassword,
      isOnboarded: false,
    });

    const savedUser = await newUser.save();

    return res.status(201).json({
      message: "Account created successfully",
      userId: savedUser._id,
      role: savedUser.role,
      email: savedUser.email,
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & redirect based on role
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        name:
          user.role === "student"
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : user.companyName,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// @route   PUT /api/auth/complete-student-onboarding/:id
// @desc    Update student skills & details right after signup
exports.completeStudentOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid User ID format." });
    }

    const {
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
      previousProjects,
      certifications,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        college,
        course,
        semester,
        graduationYear: graduationYear || "",
        scorePercentage: scorePercentage || "",
        githubUrl: githubUrl || "",
        linkedinUrl: linkedinUrl || "",
        preferredRole,
        skills: Array.isArray(skills) ? skills : [],
        interests: Array.isArray(interests) ? interests : [],
        previousProjects: Array.isArray(previousProjects) ? previousProjects : [],
        certifications: Array.isArray(certifications) ? certifications : [],
        isOnboarded: true,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile onboarded successfully",
      student: updatedUser,
      user: updatedUser,
    });
  } catch (err) {
    console.error("Onboarding Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// @route   GET /api/auth/student/:id
// @desc    Fetch student profile for dashboard
exports.getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid User ID format." });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.status(200).json({ student: user });
  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// @route   PUT /api/auth/student/update/:id
// @desc    Edit and update profile from Student Dashboard
exports.updateStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid User ID format." });
    }

    const {
      firstName,
      lastName,
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
      previousProjects,
      certifications,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        firstName,
        lastName,
        college,
        course,
        semester,
        graduationYear: graduationYear || "",
        scorePercentage: scorePercentage || "",
        githubUrl: githubUrl || "",
        linkedinUrl: linkedinUrl || "",
        preferredRole,
        skills: Array.isArray(skills) ? skills : [],
        interests: Array.isArray(interests) ? interests : [],
        previousProjects: Array.isArray(previousProjects) ? previousProjects : [],
        certifications: Array.isArray(certifications) ? certifications : [],
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      student: updatedUser,
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ error: err.message });
  }
};