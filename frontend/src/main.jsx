import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

import Navbar from "./components/Navbar";
import StatsOverview from "./components/StatsOverview";
import TicketList from "./components/TicketList";
import TicketDetailModal from "./components/TicketDetailModal";
import NewTicketModal from "./components/NewTicketModal";
import ProfileModal from "./components/ProfileModal";
import AuthScreen from "./components/AuthScreen";
import Toast from "./components/Toast";

import {
  authApi,
  ticketApi,
  getAuthToken,
  saveAuthSession,
  clearAuthSession
} from "./services/api";

function App() {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("smartdesk_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Theme support: 'light' or 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("smartdesk_theme") || "light";
  });

  // Auth screen state
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Dashboard state
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });
  const [stats, setStats] = useState({ total: 0, open: 0, inprogress: 0, resolved: 0 });
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync theme with DOM and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("smartdesk_theme", theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleLogout() {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setTickets([]);
    setSelectedTicket(null);
    showToast("Signed out successfully.", "info");
  }

  function handleSaveAuth(newToken, authUser) {
    saveAuthSession(newToken, authUser);
    setToken(newToken);
    setUser(authUser);
  }

  // Validate session on mount
  useEffect(() => {
    if (!token) return;
    authApi.getMe()
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("smartdesk_user", JSON.stringify(data.user));
        }
      })
      .catch(() => {
        handleLogout();
      });
  }, [token]);

  // Load ticket stats
  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await ticketApi.getStats();
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, []);

  // Load tickets with pagination and filtering
  const fetchTickets = useCallback(
    async (pageToLoad = 1, currentLimit = pagination.limit) => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await ticketApi.getTickets({
          page: pageToLoad,
          limit: currentLimit,
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          search
        });

        const list = res.requests || [];
        setTickets(list);

        if (res.pagination) {
          setPagination(res.pagination);
        } else {
          setPagination({
            page: pageToLoad,
            limit: currentLimit,
            total: list.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          });
        }
      } catch (err) {
        showToast(err.message || "Failed to load tickets.", "error");
      } finally {
        setLoading(false);
      }
    },
    [token, statusFilter, priorityFilter, categoryFilter, search, pagination.limit, showToast]
  );

  // Trigger fetch when filters or token changes
  useEffect(() => {
    if (token) {
      fetchTickets(1, pagination.limit);
      fetchStats();
    }
  }, [token, statusFilter, priorityFilter, categoryFilter, search]);

  // Auth submission
  async function handleAuthSubmit(formData) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result =
        authMode === "login"
          ? await authApi.login(formData)
          : await authApi.register(formData);

      handleSaveAuth(result.token, result.user);
      showToast(`Welcome back, ${result.user.name}!`, "success");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // Update ticket status
  async function handleStatusChange(ticketId, newStatus) {
    setUpdatingId(ticketId);
    try {
      const res = await ticketApi.updateStatus(ticketId, newStatus);
      showToast(`Status updated to "${newStatus}"`, "success");

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
      }

      fetchStats();
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
      throw err;
    } finally {
      setUpdatingId(null);
    }
  }

  // Delete ticket
  async function handleDeleteTicket(ticketId) {
    if (!window.confirm(`Are you sure you want to permanently delete ticket #${ticketId}?`)) {
      return;
    }
    setDeletingId(ticketId);
    try {
      await ticketApi.deleteTicket(ticketId);
      showToast(`Ticket #${ticketId} deleted successfully`, "success");
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
      fetchTickets(pagination.page, pagination.limit);
      fetchStats();
    } catch (err) {
      showToast("Failed to delete ticket: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  // Create ticket
  async function handleCreateTicket(newTicketData) {
    const res = await ticketApi.createTicket(newTicketData);
    setShowNewTicketModal(false);
    showToast("Support ticket submitted successfully!", "success");
    fetchTickets(1, pagination.limit);
    fetchStats();
    return res;
  }

  // Reset filters
  function handleClearFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
  }

  if (!token || !user) {
    return (
      <div className="app-root">
        <Toast toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen
          mode={authMode}
          setMode={(m) => {
            setAuthMode(m);
            setAuthError("");
          }}
          onSubmit={handleAuthSubmit}
          loading={authLoading}
          error={authError}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>
    );
  }

  return (
    <div className="app-root">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Main Top Navigation */}
      <Navbar
        user={user}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
      />

      <main className="dashboard-content">
        {/* KPI Metrics */}
        <StatsOverview
          stats={stats}
          activeStatus={statusFilter}
          onSelectStatus={(status) => {
            setStatusFilter(status);
          }}
        />

        {/* Tickets Table & Toolbar */}
        <TicketList
          tickets={tickets}
          pagination={pagination}
          loading={loading}
          user={user}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onClearFilters={handleClearFilters}
          onPageChange={(newPage) => fetchTickets(newPage, pagination.limit)}
          onLimitChange={(newLimit) => fetchTickets(1, newLimit)}
          onSelectTicket={(ticket) => setSelectedTicket(ticket)}
          onStatusChange={handleStatusChange}
          onDeleteTicket={handleDeleteTicket}
          onOpenNewTicket={() => setShowNewTicketModal(true)}
          updatingId={updatingId}
          deletingId={deletingId}
        />
      </main>

      {/* Ticket Detail & Thread Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          currentUser={user}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
          onTicketUpdated={(updated) => {
            setSelectedTicket(updated);
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );
          }}
          showToast={showToast}
        />
      )}

      {/* Create Ticket Modal */}
      {showNewTicketModal && (
        <NewTicketModal
          user={user}
          onClose={() => setShowNewTicketModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}

      {/* Profile & Security Modal */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          onUserUpdated={(updatedUser, newToken) => {
            handleSaveAuth(newToken, updatedUser);
          }}
          onClose={() => setShowProfileModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
