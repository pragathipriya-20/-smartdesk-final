import React, { useState } from "react";

export default function AISuggestionCard({
  ticket,
  onGenerate,
  onApplyDraft,
  loading
}) {
  const [copied, setCopied] = useState(false);

  // Extract draft response if suggestions exist
  function extractDraft(suggestions) {
    if (!suggestions) return "";
    const marker = "### Suggested Customer Response:";
    if (suggestions.includes(marker)) {
      return suggestions.split(marker)[1]?.trim() || "";
    }
    return "";
  }

  const draftText = extractDraft(ticket?.ai_suggestions);

  function handleCopyDraft() {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleUseDraftInReply() {
    if (draftText && onApplyDraft) {
      onApplyDraft(draftText);
    }
  }

  const hasAIContent = Boolean(ticket?.ai_summary || ticket?.ai_suggestions);

  return (
    <div className="ai-suggestion-card">
      <div className="ai-card-header">
        <div className="ai-card-title-wrap">
          <span className="ai-sparkle-icon">✨</span>
          <h3 className="ai-card-title">SmartDesk AI Copilot</h3>
          <span className="ai-badge">AI Assistant</span>
        </div>

        <button
          type="button"
          className="btn-ai-action"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? "Analyzing Ticket..." : hasAIContent ? "🔄 Re-analyze Ticket" : "✨ Generate AI Suggestions"}
        </button>
      </div>

      {loading && (
        <div className="ai-loading-box">
          <div className="ai-spinner"></div>
          <p>AI Copilot is diagnosing the problem and drafting recommended steps...</p>
        </div>
      )}

      {!loading && !hasAIContent && (
        <div className="ai-empty-prompt">
          <p>
            Need assistance? Let AI summarize the issue, recommend troubleshooting steps, and draft a response.
          </p>
        </div>
      )}

      {!loading && hasAIContent && (
        <div className="ai-content-body">
          {ticket?.ai_summary && (
            <div className="ai-section">
              <h4 className="ai-section-title">📌 Issue Executive Summary</h4>
              <p className="ai-summary-text">{ticket.ai_summary}</p>
            </div>
          )}

          {ticket?.ai_suggestions && (
            <div className="ai-section">
              <h4 className="ai-section-title">💡 Actionable Triage & Recommended Draft</h4>
              <div className="ai-suggestions-content">
                <pre className="ai-markdown-block">{ticket.ai_suggestions}</pre>
              </div>

              {draftText && (
                <div className="ai-draft-actions">
                  <button
                    type="button"
                    className="btn-ai-draft btn-copy"
                    onClick={handleCopyDraft}
                  >
                    {copied ? "✓ Copied to Clipboard!" : "📋 Copy Draft Response"}
                  </button>
                  {onApplyDraft && (
                    <button
                      type="button"
                      className="btn-ai-draft btn-insert"
                      onClick={handleUseDraftInReply}
                    >
                      ✍️ Insert Draft into Reply Box
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
