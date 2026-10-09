import React from "react";

export default function Navbar({ user, theme, onToggleTheme, onOpenProfile, onLogout }) {
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const role = (user?.role || "user").toLowerCase();

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">SD</div>
        <div>
          <div className="brand-title">SmartDesk</div>
          <div className="brand-subtitle">AI-Powered Support Desk</div>
        </div>
      </div>

      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        {/* User Profile Pill */}
        <div
          className="user-profile-badge"
          onClick={onOpenProfile}
          title="Click to manage account settings"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpenProfile();
          }}
        >
          <div className="user-avatar">{initial}</div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className={`user-role-tag role-${role}`}>
              {user?.role === "admin" ? "Admin" : "Customer"}
            </span>
          </div>
        </div>

        {/* Profile Settings Quick Button */}
        <button
          type="button"
          className="btn-profile-settings"
          onClick={onOpenProfile}
          title="Account Settings"
          aria-label="Account Settings"
        >
          ⚙️
        </button>

        {/* Logout */}
        <button
          type="button"
          className="btn-logout"
          onClick={onLogout}
          title="Sign out of your session"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
