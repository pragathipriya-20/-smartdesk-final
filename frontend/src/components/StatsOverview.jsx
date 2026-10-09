import React from "react";

export default function StatsOverview({ stats, activeStatus, onSelectStatus }) {
  const cards = [
    {
      key: "All",
      label: "Total Tickets",
      value: stats?.total ?? 0,
      note: "All submitted requests",
      icon: "📋",
      className: "stat-total"
    },
    {
      key: "Open",
      label: "Open Tickets",
      value: stats?.open ?? 0,
      note: "Awaiting staff response",
      icon: "⚡",
      className: "stat-open"
    },
    {
      key: "In Progress",
      label: "In Progress",
      value: stats?.inprogress ?? 0,
      note: "Actively under resolution",
      icon: "⏳",
      className: "stat-inprogress"
    },
    {
      key: "Resolved",
      label: "Resolved",
      value: stats?.resolved ?? 0,
      note: "Successfully closed",
      icon: "✅",
      className: "stat-resolved"
    }
  ];

  return (
    <section className="stats-grid" aria-label="Support Ticket Overview">
      {cards.map((card) => {
        const isSelected = activeStatus === card.key;
        return (
          <div
            key={card.key}
            className={`stat-card ${card.className} ${isSelected ? "stat-card-active" : ""}`}
            onClick={() => onSelectStatus && onSelectStatus(card.key)}
            role="button"
            tabIndex={0}
            title={`Click to filter by ${card.label}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectStatus && onSelectStatus(card.key);
              }
            }}
          >
            <div className="stat-content">
              <span className="stat-label">{card.label}</span>
              <strong className="stat-value">{card.value}</strong>
              <span className="stat-note">{card.note}</span>
            </div>
            <div className="stat-icon-wrap" aria-hidden="true">{card.icon}</div>
          </div>
        );
      })}
    </section>
  );
}
