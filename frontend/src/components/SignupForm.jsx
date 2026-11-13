import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupForm({ onSwitch }) {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!agreed) {
      setError("Please accept the Terms of Service & Privacy Policy.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          firstName: role === "student" ? firstName : undefined,
          lastName: role === "student" ? lastName : undefined,
          companyName: role === "company" ? companyName : undefined,
          email,
          password,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Server configuration issue (Status ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Signup failed. Please try again.");
      }

      localStorage.setItem("nexus_user_id", data.userId);
      localStorage.setItem("nexus_user_role", data.role);
      localStorage.setItem("nexus_user_email", data.email);

      if (role === "student") {
        navigate("/student/onboarding", {
          state: { userId: data.userId, firstName, lastName, email },
        });
      } else {
        navigate("/company/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      
      <h1>Create Account</h1>

      {/* Role Pill Switch */}
      <div className="role-tabs">
        <button
          type="button"
          className={role === "student" ? "role-tab active" : "role-tab"}
          onClick={() => setRole("student")}
        >
          Student Candidate
        </button>
        <button
          type="button"
          className={role === "company" ? "role-tab active" : "role-tab"}
          onClick={() => setRole("company")}
        >
          Company
        </button>
      </div>

      {error && <div className="auth-error-msg">{error}</div>}

      {/* Dynamic Fields for Student */}
      {role === "student" && (
        <div className="form-row">
          <div className="field">
            <label>First Name</label>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
      )}

      {/* Dynamic Field for Company */}
      {role === "company" && (
        <div className="field">
          <label>Organization / Company Name</label>
          <input
            type="text"
            placeholder="e.g. Acme Technologies"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>
      )}

      <div className="field">
        <label>Email Address</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <small>Minimum 6 characters</small>
      </div>

      <div className="field">
        <label>Confirm Password</label>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{" "}
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </span>
      </label>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account →"}
      </button>

      <p className="auth-switch-text">
        Already have an account?
        <button type="button" className="auth-link-btn" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}