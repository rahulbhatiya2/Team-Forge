import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginForm({ onSwitch }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError("Please fill in both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please verify credentials.");
      }

      // Safe user id nikal kar nexus_user_id aur user dono store karein
      const resolvedUserId = data.user?._id || data.user?.id || data.userId || "";
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("nexus_user_id", resolvedUserId);

      if (data.user.role === "company") {
        navigate("/company/dashboard");
      } else if (data.user.role === "student") {
        if (!data.user.isOnboarded) {
          navigate("/student/onboarding");
        } else {
          navigate("/student/dashboard");
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-badge">⬡</div>
      <h1>Sign In</h1>
      <p className="auth-subtitle">Welcome back — log in to your account</p>

      {error && <div className="auth-error-msg">{error}</div>}

      <div className="field">
        <label>Email Address</label>
        <input
          type="email"
          name="email"
          placeholder="name@company.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
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
      </div>

      <div className="forgot-link">
        <a href="#forgot" onClick={(e) => e.preventDefault()}>
          Forgot password?
        </a>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? "Authenticating..." : "Sign In →"}
      </button>

      <p className="auth-switch-text">
        Don't have an account?
        <button type="button" className="auth-link-btn" onClick={onSwitch}>
          Create account
        </button>
      </p>
    </form>
  );
}