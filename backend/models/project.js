const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedBy: { type: String, default: "" },
  completedAt: { type: Date }
});

const PhaseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tasks: [TaskSchema]
});

const ProjectSchema = new mongoose.Schema(
  {
    companyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    companyName: { 
      type: String, 
      default: "Enterprise Partner" 
    },
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    type: { 
      type: String, 
      default: "Industry Capstone" 
    },
    description: { 
      type: String, 
      required: true 
    },
    requiredSkills: [{ 
      type: String 
    }],
    requiredRoles: [{ 
      type: String 
    }],
    teamSize: { 
      type: Number, 
      default: 4 
    },
    deadline: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    status: { 
      type: String, 
      enum: ["Open", "In Review", "Locked", "Completed"], 
      default: "Open" 
    },
    lockedAt: { 
      type: Date, 
      default: null 
    },
    submission: {
      githubUrl: { type: String, default: "" },
      liveDemoUrl: { type: String, default: "" },
      notes: { type: String, default: "" },
      submittedBy: { type: String, default: "" },
      submittedAt: { type: Date }
    },
    notes: [
      {
        text: { type: String, required: true },
        author: { type: String, default: "Company Lead" },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    phases: [PhaseSchema],
    matchedSquad: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String },
        role: { type: String },
        email: { type: String },
        college: { type: String },
        skills: [
          {
            name: { type: String },
            level: { type: String }
          }
        ],
        matchScore: { type: Number, default: 85 },
        assignedAt: { type: Date, default: Date.now } // 👈 24-hr timer tracking ke liye
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);