import React, { useState } from "react";

export default function AuthScreen({
  mode,
  setMode,
  onSubmit,
  loading,
  error,
  theme,
  onToggleTheme
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "register" && !form.name.trim()) return;
    onSubmit(form);
  }

  function fillAdminDemo() {
    setForm({ name: "SmartDesk Admin", email: "admin@smartdesk.com", password: "Admin@123" });
    if (mode !== "login") setMode("login");
  }

  return (
    <div className="auth-container">
      <div className="auth-top-bar">
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-logo large">SD</div>
          <h1 className="brand-title">SmartDesk</h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to manage support tickets with AI copilot"
              : "Create an account to submit and track support requests"}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            Create Account
          </button>
        </div>

        {error && <div className="alert-box error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. Maya Patel"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@smartdesk.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="At least 6 characters"
              minLength={6}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? "Authenticating..." : mode === "login" ? "Sign In to Dashboard" : "Register Account"}
          </button>
        </form>

        <div className="demo-credentials-card">
          <div className="demo-credentials-header">
            <strong>Demo Administrator Account</strong>
            <button type="button" className="btn-text" onClick={fillAdminDemo}>
              Auto Fill
            </button>
          </div>
          <code>admin@smartdesk.com / Admin@123</code>
        </div>
      </div>
    </div>
  );
}
