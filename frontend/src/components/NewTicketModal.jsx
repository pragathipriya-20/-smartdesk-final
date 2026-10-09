import React, { useState } from "react";

const CATEGORY_PRESETS = [
  {
    category: "Technical Issue",
    icon: "⚙️",
    suggestedSubject: "Error encountered on dashboard",
    placeholderDesc: "Describe what actions triggered the bug, the expected behavior, and error messages shown."
  },
  {
    category: "Account Issue",
    icon: "👤",
    suggestedSubject: "Unable to access account credentials",
    placeholderDesc: "State whether this is related to 2FA, password reset, or unauthorized access warnings."
  },
  {
    category: "Payment Issue",
    icon: "💳",
    suggestedSubject: "Payment deducted without receipt confirmation",
    placeholderDesc: "Include the transaction reference ID, payment method, and deduction timestamp."
  },
  {
    category: "Delivery Issue",
    icon: "📦",
    suggestedSubject: "Tracking information not updating",
    placeholderDesc: "Provide order number and shipment tracking number."
  },
  {
    category: "Other",
    icon: "💬",
    suggestedSubject: "General customer support inquiry",
    placeholderDesc: "Provide detailed background on what you need assistance with."
  }
];

export default function NewTicketModal({ user, onClose, onSubmit }) {
  const [form, setForm] = useState({
    customer: user.name || "",
    email: user.email || "",
    subject: "",
    description: "",
    category: "Technical Issue",
    priority: "Medium"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectCategory(preset) {
    setForm((prev) => ({
      ...prev,
      category: preset.category,
      subject: prev.subject ? prev.subject : preset.suggestedSubject
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Please provide both a subject and problem description.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || "Failed to submit ticket.");
      setSubmitting(false);
    }
  }

  const currentPreset = CATEGORY_PRESETS.find((p) => p.category === form.category) || CATEGORY_PRESETS[0];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create Support Request</h2>
            <p className="modal-subtitle">Submit your ticket for immediate triage by our support team.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        {error && <div className="alert-box error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Category Quick Presets */}
          <div className="form-group">
            <label className="form-section-label">Select Issue Category</label>
            <div className="category-chips-grid">
              {CATEGORY_PRESETS.map((preset) => (
                <button
                  key={preset.category}
                  type="button"
                  className={`category-chip ${form.category === preset.category ? "active" : ""}`}
                  onClick={() => handleSelectCategory(preset)}
                >
                  <span className="category-chip-icon">{preset.icon}</span>
                  <span className="category-chip-text">{preset.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ticket-customer">Contact Name</label>
              <input
                id="ticket-customer"
                type="text"
                value={form.customer}
                onChange={(e) => handleChange("customer", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ticket-email">Contact Email</label>
              <input
                id="ticket-email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="ticket-subject">
                Subject Line <span className="required-star">*</span>
              </label>
              <input
                id="ticket-subject"
                type="text"
                placeholder="Brief summary of the issue..."
                value={form.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                value={form.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ticket-desc">
              Problem Description <span className="required-star">*</span>
            </label>
            <textarea
              id="ticket-desc"
              rows={5}
              placeholder={currentPreset.placeholderDesc}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting Ticket..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
