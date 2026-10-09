import React, { useState } from "react";

export default function TicketList({
  tickets,
  pagination,
  loading,
  user,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  onClearFilters,
  onPageChange,
  onLimitChange,
  onSelectTicket,
  onStatusChange,
  onDeleteTicket,
  onOpenNewTicket,
  updatingId,
  deletingId
}) {
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" | "desc"

  const isAdmin = user?.role === "admin";

  function handleSort(field) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  // Client-side sort for current page view
  const sortedTickets = [...tickets].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "id") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Export tickets to CSV
  function handleExportCSV() {
    if (!tickets.length) return;
    const headers = ["ID", "Customer", "Email", "Subject", "Category", "Priority", "Status", "Created At"];
    const rows = tickets.map((t) => [
      t.id,
      `"${(t.customer || "").replace(/"/g, '""')}"`,
      `"${(t.email || "").replace(/"/g, '""')}"`,
      `"${(t.subject || "").replace(/"/g, '""')}"`,
      `"${(t.category || "").replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      t.created_at
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `smartdesk_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const hasActiveFilters = search || statusFilter !== "All" || priorityFilter !== "All" || categoryFilter !== "All";

  return (
    <section className="ticket-list-container">
      {/* Search and Filters Toolbar */}
      <div className="toolbar-section">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by ID, customer, email, subject, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-group">
              <label htmlFor="filter-status" className="filter-label">Status:</label>
              <select
                id="filter-status"
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-priority" className="filter-label">Priority:</label>
              <select
                id="filter-priority"
                className="filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-category" className="filter-label">Category:</label>
              <select
                id="filter-category"
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Account Issue">Account Issue</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Delivery Issue">Delivery Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-text-filter"
                onClick={onClearFilters}
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              className="btn-secondary btn-export"
              onClick={handleExportCSV}
              disabled={tickets.length === 0}
              title="Download visible tickets as CSV spreadsheet"
            >
              📥 Export CSV
            </button>

            <button
              type="button"
              className="btn-primary btn-new-ticket"
              onClick={onOpenNewTicket}
            >
              + New Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Card & Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div>
            <h2 className="table-card-title">
              {isAdmin ? "All Customer Support Requests" : "My Support Requests"}
            </h2>
            <p className="table-card-subtitle">
              {pagination?.total !== undefined
                ? `Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total requests)`
                : `Showing ${tickets.length} requests`}
            </p>
          </div>

          <div className="page-size-selector">
            <label htmlFor="limit-select">Show:</label>
            <select
              id="limit-select"
              value={pagination?.limit || 10}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="tickets-table">
            <thead>
              <tr>
                <th
                  style={{ width: "80px", cursor: "pointer" }}
                  onClick={() => handleSort("id")}
                  title="Click to sort by ID"
                >
                  ID {sortField === "id" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("customer")}
                  title="Click to sort by customer"
                >
                  Customer {sortField === "customer" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("subject")}
                  title="Click to sort by subject"
                >
                  Subject & Details {sortField === "subject" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th>Category</th>
                <th
                  style={{ width: "120px", cursor: "pointer" }}
                  onClick={() => handleSort("priority")}
                  title="Click to sort by priority"
                >
                  Priority {sortField === "priority" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  style={{ width: "160px", cursor: "pointer" }}
                  onClick={() => handleSort("status")}
                  title="Click to sort by status"
                >
                  Status {sortField === "status" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th style={{ width: "150px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTickets.map((ticket) => (
                <tr key={ticket.id} className="ticket-row">
                  <td className="cell-id">
                    <button
                      type="button"
                      className="ticket-link-btn"
                      onClick={() => onSelectTicket(ticket)}
                      title="View ticket details and conversation"
                    >
                      #{ticket.id}
                    </button>
                  </td>

                  <td className="cell-customer">
                    <strong className="customer-name">{ticket.customer}</strong>
                    <small className="customer-email">{ticket.email}</small>
                  </td>

                  <td className="cell-subject">
                    <div className="subject-line-wrap">
                      <span
                        className="subject-title clickable"
                        onClick={() => onSelectTicket(ticket)}
                      >
                        {ticket.subject}
                      </span>
                      {ticket.ai_suggestions && (
                        <span className="badge-ai-ready" title="AI summary and response generated">
                          ✨ AI Ready
                        </span>
                      )}
                    </div>
                    {ticket.description && (
                      <div className="subject-description" title={ticket.description}>
                        {ticket.description}
                      </div>
                    )}
                  </td>

                  <td className="cell-category">
                    <span className="category-pill">{ticket.category || "Other"}</span>
                  </td>

                  <td className="cell-priority">
                    <PriorityBadge priority={ticket.priority} />
                  </td>

                  <td className="cell-status">
                    {isAdmin ? (
                      <select
                        className={`status-select status-select-${(ticket.status || "open").toLowerCase().replace(/\s+/g, "-")}`}
                        value={ticket.status}
                        onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                        disabled={updatingId === ticket.id}
                        title="Update status"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    ) : (
                      <StatusBadge status={ticket.status} />
                    )}
                  </td>

                  <td className="cell-actions" style={{ textAlign: "right" }}>
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="btn-action-view"
                        onClick={() => onSelectTicket(ticket)}
                        title="Open ticket details and conversation"
                      >
                        View Thread
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => onDeleteTicket(ticket.id)}
                          disabled={deletingId === ticket.id}
                          title="Delete this ticket"
                        >
                          {deletingId === ticket.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="table-loading-skeleton">
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedTickets.length === 0 && (
          <div className="table-state-box">
            <div className="empty-icon">📭</div>
            <h3 className="empty-title">No support tickets found</h3>
            <p className="empty-desc">
              {hasActiveFilters
                ? "No tickets match your filter and search criteria. Try clearing some filters."
                : "No support tickets have been submitted yet. Click '+ New Ticket' to create one."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onClearFilters}
                style={{ marginTop: "12px" }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
              >
                ‹ Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return (
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - pagination.page) <= 1
                  );
                })
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && <span className="pagination-ellipsis">…</span>}
                      <button
                        type="button"
                        className={`btn-page ${pagination.page === p ? "active" : ""}`}
                        onClick={() => onPageChange(p)}
                        disabled={loading}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="btn-page"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PriorityBadge({ priority }) {
  const p = (priority || "medium").toLowerCase();
  let badgeClass = "badge-priority-medium";
  if (p === "high" || p === "critical") {
    badgeClass = "badge-priority-high";
  } else if (p === "low") {
    badgeClass = "badge-priority-low";
  }
  return <span className={`badge ${badgeClass}`}>{priority || "Medium"}</span>;
}

function StatusBadge({ status }) {
  const s = (status || "open").toLowerCase().replace(/\s+/g, "-");
  return <span className={`badge badge-status badge-status-${s}`}>{status || "Open"}</span>;
}
