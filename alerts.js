/**
 * MetroMind Alert Center Controller
 */

let allAlerts = [];
let currentFilter = "unread"; // "unread" or "all"

document.addEventListener("DOMContentLoaded", () => {
  // If authenticated, load alerts
  if (!Auth.isAuthenticated()) return;

  setupFilterBindings();
  loadAlerts();
});

function setupFilterBindings() {
  const btnUnread = document.getElementById("btn-filter-unread");
  const btnAll = document.getElementById("btn-filter-all");

  btnUnread.addEventListener("click", () => {
    currentFilter = "unread";
    btnUnread.className = "btn btn-primary btn-sm";
    btnAll.className = "btn btn-secondary btn-sm";
    renderAlerts();
  });

  btnAll.addEventListener("click", () => {
    currentFilter = "all";
    btnUnread.className = "btn btn-secondary btn-sm";
    btnAll.className = "btn btn-primary btn-sm";
    renderAlerts();
  });
}

// Fetch alerts from API
async function loadAlerts() {
  const container = document.getElementById("alerts-inbox-list");
  try {
    allAlerts = await apiCall("/api/alerts");
    renderAlerts();
  } catch (err) {
    console.error("Failed to load alerts hub:", err);
    container.innerHTML = `<p class="badge-high" style="padding: 10px; border-radius: 4px; text-align: center;">Error loading alerts inbox.</p>`;
  }
}

// Render alerts based on active filters
function renderAlerts() {
  const container = document.getElementById("alerts-inbox-list");
  if (!container) return;

  // Filter alerts
  const filtered = currentFilter === "unread" 
    ? allAlerts.filter(a => !a.isRead) 
    : allAlerts;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 0; color: var(--text-muted);">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity: 0.3; margin-bottom: 12px;"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5 1.5-1.5 1.5v.68C7.63 4.88 6 7.46 6 10.5v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
        <p class="info-label">Your inbox is clear! No active alerts matching this filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(alert => {
    let severityClass = "badge-low";
    if (alert.severity === "MEDIUM") severityClass = "badge-moderate";
    if (alert.severity === "HIGH") severityClass = "badge-high";
    if (alert.severity === "CRITICAL") severityClass = "badge-critical";

    const isUnread = !alert.isRead;
    const itemClass = isUnread ? "alert-item unread" : "alert-item";

    // Mark as read button
    const markReadBtn = isUnread 
      ? `<button class="btn btn-secondary btn-sm" onclick="markAlertRead(${alert.alertId})">Mark Read</button>` 
      : `<span class="badge badge-read" style="font-size: 0.7rem;">Read</span>`;

    // Related entity links routing
    let entityLink = "";
    if (alert.relatedEntityType && alert.relatedEntityId) {
      const page = alert.relatedEntityType === "TrafficIncident" ? "traffic.html" : "utilities.html";
      const name = alert.relatedEntityType === "TrafficIncident" ? "Incident" : "Grid";
      entityLink = `
        <a href="${page}" class="auth-link" style="font-size: 0.75rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          Go to ${name} #${alert.relatedEntityId}
        </a>
      `;
    }

    return `
      <div class="${itemClass}">
        <div class="alert-item-content">
          <div class="alert-item-message">${alert.message}</div>
          <div class="alert-item-meta">
            <span class="badge ${severityClass}">${alert.severity}</span>
            <span>Alert ID: #${alert.alertId}</span>
            ${entityLink}
          </div>
        </div>
        <div style="flex-shrink: 0;">
          ${markReadBtn}
        </div>
      </div>
    `;
  }).join("");
}

// Mark Alert as Read
async function markAlertRead(alertId) {
  try {
    await apiCall(`/api/alerts/${alertId}/read`, {
      method: "PUT"
    });
    showToast("Notification marked as read", "success");
    
    // Reload alerts list
    await loadAlerts();
    
    // Update global notification badge count in the sidebar
    updateNavAlertCount();
  } catch (err) {
    console.error(`Failed to mark alert ${alertId} as read:`, err);
  }
}
