const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["student", "company"], default: "student" },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // Onboarding status flag
    isOnboarded: { type: Boolean, default: false },

    // Student Academic Fields
    college: { type: String, default: "" },
    course: { type: String, default: "" },
    semester: { type: String, default: "" },
    graduationYear: { type: String, default: "" },
    scorePercentage: { type: String, default: "" },

    // Social & Profile Links
    githubUrl: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },

    // Role & Matching Data
    preferredRole: { type: String, default: "" },
    skills: [
      {
        name: { type: String, required: true },
        level: {
          type: String,
          enum: ["Beginner", "Intermediate", "Advanced"],
          default: "Intermediate",
        },
      },
    ],
    interests: [{ type: String }],
    previousProjects: [
      {
        title: { type: String },
        tech: { type: String },
        desc: { type: String },
        link: { type: String, default: "" },
      },
    ],
    certifications: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);