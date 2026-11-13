import React, { useState } from "react";
import SignupForm from "../components/SignupForm";
import LoginForm from "../components/LoginForm";
import "./mainsignup.css";

export default function Signup() {
  const [mode, setMode] = useState("signup");

  const isSignup = mode === "signup";

  return (
    <div className="auth-page">
      {/* Left Editorial Branding Panel */}
      <div className="auth-left-panel">
        <div className="auth-brand-logo">
          <span className="auth-brand-hex">⬡</span>
          <span className="auth-brand-title">Team Forge</span>
          <span className="auth-brand-badge">PRO</span>
        </div>

        <div className="auth-left-content">
          <div className="auth-eyebrow">
            <span className="dot" />
            {isSignup ? "START ASSEMBLING" : "WELCOME BACK"}
          </div>

          <h1>
            {isSignup ? "Build your team.\nDo your best work." : "Continue where you left off."}
          </h1>

          <p>
            {isSignup
              ? "Join the automated talent matching ecosystem connecting companies and student project teams."
              : "Access real-time squad matching, active project briefs, and candidate management."}
          </p>

          <div className="auth-bullets">
            <div className="auth-bullet-item">
              <span className="bullet-icon">✓</span>
              <span>Algorithmic skill & role matching engine</span>
            </div>
            <div className="auth-bullet-item">
              <span className="bullet-icon">✓</span>
              <span>Verified university candidate profiles</span>
            </div>
            <div className="auth-bullet-item">
              <span className="bullet-icon">✓</span>
              <span>One-click squad locks & invites dispatch</span>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          © {new Date().getFullYear()} Team Forge Inc. Thoughtfully organized teams.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-right-panel">
        {isSignup ? (
          <SignupForm onSwitch={() => setMode("login")} />
        ) : (
          <LoginForm onSwitch={() => setMode("signup")} />
        )}
      </div>
    </div>
  );
}