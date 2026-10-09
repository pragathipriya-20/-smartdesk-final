import React, { useState } from "react";
import { authApi } from "../services/api";

export default function ProfileModal({ user, onUserUpdated, onClose, showToast }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password"
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.updateProfile(profileForm);
      onUserUpdated(res.user, res.token);
      showToast("Profile details updated successfully.", "success");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast("Password updated successfully.", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-profile" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Account Settings</h2>
            <p className="modal-subtitle">Manage your personal profile and security credentials.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        {/* Tab selection */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("profile");
              setError("");
            }}
          >
            👤 Profile Details
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === "password" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("password");
              setError("");
            }}
          >
            🔑 Change Password
          </button>
        </div>

        {error && <div className="alert-box error">{error}</div>}

        {activeTab === "profile" ? (
          <form onSubmit={handleProfileSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-email">Email Address</label>
              <input
                id="prof-email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>

            <div className="account-role-info">
              <span>Account Role:</span>
              <span className={`badge-role role-${(user?.role || "user").toLowerCase()}`}>
                {user?.role === "admin" ? "System Administrator" : "Customer User"}
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="curr-pass">Current Password</label>
              <input
                id="curr-pass"
                type="password"
                placeholder="Enter your current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-pass">New Password</label>
              <input
                id="new-pass"
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="conf-pass">Confirm New Password</label>
              <input
                id="conf-pass"
                type="password"
                placeholder="Repeat new password"
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
