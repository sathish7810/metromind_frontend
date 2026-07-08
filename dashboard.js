/**
 * MetroMind Dashboard Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Only CITY_ADMINISTRATOR should run this code. Role checks are handled by app.js.
  if (Auth.getRole() !== "CITY_ADMINISTRATOR") return;

  loadDashboardData();
});

async function loadDashboardData() {
  try {
    // 1. Fetch Stats from API
    const stats = await apiCall("/api/dashboard/stats");
    
    // Update numerical counters
    document.getElementById("stat-incidents").textContent = stats.totalIncidents || 0;
    document.getElementById("stat-outages").textContent = stats.activeOutages || 0;
    document.getElementById("stat-zones").textContent = stats.congestedZones || 0;
    document.getElementById("stat-alerts").textContent = stats.criticalAlerts || 0;

    // 2. Render dynamic bar heights for metrics chart
    const vals = [
      stats.totalIncidents || 0,
      stats.activeOutages || 0,
      stats.congestedZones || 0,
      stats.criticalAlerts || 0
    ];
    const maxVal = Math.max(...vals, 1); // Avoid division by zero

    document.getElementById("bar-incidents").style.height = `${(vals[0] / maxVal) * 100}%`;
    document.getElementById("bar-outages").style.height = `${(vals[1] / maxVal) * 100}%`;
    document.getElementById("bar-zones").style.height = `${(vals[2] / maxVal) * 100}%`;
    document.getElementById("bar-alerts").style.height = `${(vals[3] / maxVal) * 100}%`;

    // 3. Fetch latest Alerts for role
    const alerts = await apiCall("/api/alerts");
    renderDashboardAlerts(alerts);
  } catch (err) {
    console.error("Failed to load dashboard statistics:", err);
  }
}

function renderDashboardAlerts(alerts) {
  const container = document.getElementById("dashboard-alerts");
  if (!container) return;

  // Filter unread alerts and show maximum 3
  const unreadAlerts = alerts.filter(a => !a.isRead).slice(0, 3);

  if (unreadAlerts.length === 0) {
    container.innerHTML = `<p class="info-label" style="text-align: center; padding: 20px 0;">No active alerts matching your level.</p>`;
    return;
  }

  container.innerHTML = unreadAlerts.map(alert => {
    let severityClass = "badge-low";
    if (alert.severity === "MEDIUM") severityClass = "badge-moderate";
    if (alert.severity === "HIGH") severityClass = "badge-high";
    if (alert.severity === "CRITICAL") severityClass = "badge-critical";

    return `
      <div class="alert-item unread" style="padding: 10px; margin-bottom: 8px;">
        <div class="alert-item-content">
          <div class="alert-item-message" style="font-size: 0.85rem; margin-bottom: 2px;">${alert.message}</div>
          <div class="alert-item-meta" style="font-size: 0.75rem;">
            <span class="badge ${severityClass}" style="font-size: 0.65rem; padding: 2px 6px;">${alert.severity}</span>
            <span>ID: #${alert.alertId}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;" onclick="dismissAlert(${alert.alertId})">
          Read
        </button>
      </div>
    `;
  }).join("");
}

// Global action called from inline click handler
async function dismissAlert(alertId) {
  try {
    await apiCall(`/api/alerts/${alertId}/read`, { method: "PUT" });
    showToast("Alert marked as read", "success");
    // Reload dashboard numbers and update global nav notifications badge
    loadDashboardData();
    updateNavAlertCount();
  } catch (err) {
    console.error(`Failed to dismiss alert ${alertId}:`, err);
  }
}
