import React, { useEffect, useState, useRef } from "react";
import AISuggestionCard from "./AISuggestionCard";
import { ticketApi } from "../services/api";

export default function TicketDetailModal({
  ticket,
  currentUser,
  onClose,
  onStatusChange,
  onTicketUpdated,
  showToast
}) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(ticket);

  const commentsEndRef = useRef(null);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    setCurrentTicket(ticket);
    loadComments(ticket.id);
  }, [ticket]);

  async function loadComments(ticketId) {
    setCommentsLoading(true);
    try {
      const data = await ticketApi.getComments(ticketId);
      setComments(data.comments || []);
    } catch (err) {
      showToast(err.message || "Failed to load ticket comments.", "error");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await ticketApi.addComment(currentTicket.id, {
        body: replyBody.trim(),
        is_internal: isAdmin ? isInternal : false
      });

      setComments((prev) => [...prev, res.comment]);
      setReplyBody("");
      setIsInternal(false);
      showToast(
        isAdmin && isInternal ? "Internal staff note added." : "Public response posted.",
        "success"
      );

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      showToast(err.message || "Failed to post comment.", "error");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleGenerateAI() {
    setAiLoading(true);
    try {
      const res = await ticketApi.generateAiSuggestion(currentTicket.id);
      setCurrentTicket(res.ticket);
      if (onTicketUpdated) onTicketUpdated(res.ticket);
      showToast("AI Copilot generated ticket analysis and draft.", "success");
    } catch (err) {
      showToast(err.message || "Failed to generate AI suggestions.", "error");
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplyDraft(draftText) {
    setReplyBody((prev) => (prev ? `${prev}\n\n${draftText}` : draftText));
    showToast("AI response inserted into reply box.", "info");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-large" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="ticket-detail-title-wrap">
            <span className="ticket-id-tag">#{currentTicket.id}</span>
            <div>
              <h2 className="modal-title">{currentTicket.subject}</h2>
              <div className="modal-meta-pills">
                <span className="meta-pill category-pill">{currentTicket.category}</span>
                <span className={`meta-pill priority-pill priority-${(currentTicket.priority || "medium").toLowerCase()}`}>
                  {currentTicket.priority} Priority
                </span>
                <span className={`meta-pill status-pill status-${(currentTicket.status || "open").toLowerCase().replace(/\s+/g, "-")}`}>
                  {currentTicket.status}
                </span>
                <span className="meta-pill meta-date">Created {formatDate(currentTicket.created_at)}</span>
              </div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="modal-scroll-body">
          {/* Top Info Grid */}
          <div className="ticket-info-grid">
            <div className="info-item">
              <span className="info-label">Customer Name</span>
              <span className="info-val strong">{currentTicket.customer}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Customer Email</span>
              <span className="info-val">{currentTicket.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Ticket Status</span>
              {isAdmin ? (
                <select
                  className={`status-select status-select-${(currentTicket.status || "open").toLowerCase().replace(/\s+/g, "-")}`}
                  value={currentTicket.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      await onStatusChange(currentTicket.id, newStatus);
                      setCurrentTicket((prev) => ({ ...prev, status: newStatus }));
                    } catch (err) {
                      showToast("Could not update status: " + err.message, "error");
                    }
                  }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              ) : (
                <span className={`badge badge-status badge-status-${(currentTicket.status || "open").toLowerCase().replace(/\s+/g, "-")}`}>
                  {currentTicket.status}
                </span>
              )}
            </div>
          </div>

          {/* Issue Description */}
          <div className="ticket-description-box">
            <h4 className="detail-section-title">Description & Problem Details</h4>
            <div className="ticket-description-text">{currentTicket.description}</div>
          </div>

          {/* AI Copilot Card */}
          <AISuggestionCard
            ticket={currentTicket}
            onGenerate={handleGenerateAI}
            onApplyDraft={handleApplyDraft}
            loading={aiLoading}
          />

          {/* Comment / Response Thread */}
          <div className="comments-section">
            <div className="comments-header">
              <h4 className="detail-section-title">
                Conversation Thread ({comments.length})
              </h4>
              {isAdmin && (
                <span className="staff-indicator-badge">
                  Staff View: Internal notes visible
                </span>
              )}
            </div>

            <div className="comments-stream">
              {commentsLoading ? (
                <div className="comments-loading">Loading responses...</div>
              ) : comments.length === 0 ? (
                <div className="comments-empty">
                  No responses yet. Start the conversation using the reply box below.
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthorAdmin = comment.author_role === "admin";
                  const isMe = comment.user_id === currentUser.id;

                  return (
                    <div
                      key={comment.id}
                      className={`comment-bubble ${
                        comment.is_internal ? "comment-internal" : isAuthorAdmin ? "comment-staff" : "comment-user"
                      }`}
                    >
                      <div className="comment-bubble-header">
                        <div className="comment-author-wrap">
                          <div className="comment-avatar">
                            {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="comment-author-name">
                              {comment.author_name || "Support User"}
                              {isMe && <span className="comment-you-tag"> (You)</span>}
                            </span>
                            <span className={`comment-role-pill role-${comment.author_role || "user"}`}>
                              {comment.author_role === "admin" ? "Staff Agent" : "Customer"}
                            </span>
                          </div>
                        </div>

                        <div className="comment-meta-right">
                          {Boolean(comment.is_internal) && (
                            <span className="badge-internal-note" title="Only visible to administrators and support agents">
                              🔒 Internal Note
                            </span>
                          )}
                          <span className="comment-time">{formatDate(comment.created_at)}</span>
                        </div>
                      </div>

                      <div className="comment-body-text">{comment.body}</div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="reply-form">
              <div className="form-group">
                <label htmlFor="reply-body" className="reply-label">
                  {isAdmin ? "Post a Reply or Internal Note" : "Add a Response"}
                </label>
                <textarea
                  id="reply-body"
                  className="reply-textarea"
                  rows={3}
                  placeholder={
                    isAdmin
                      ? "Write a public response to the customer or internal note for staff..."
                      : "Provide additional details or reply to support staff..."
                  }
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  required
                />
              </div>

              <div className="reply-form-footer">
                {isAdmin && (
                  <label className="checkbox-internal-note">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      🔒 Make this an internal note (Staff only, hidden from customer)
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  className={`btn-primary ${isInternal ? "btn-internal-submit" : ""}`}
                  disabled={submittingReply || !replyBody.trim()}
                >
                  {submittingReply
                    ? "Posting..."
                    : isInternal
                    ? "Post Internal Note"
                    : "Post Response"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="modal-actions-bar">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
