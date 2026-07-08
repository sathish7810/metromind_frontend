/**
 * MetroMind Utilities Workspace Controller
 */

let allGrids = [];

document.addEventListener("DOMContentLoaded", () => {
  const currentRole = Auth.getRole();
  if (!["CITY_ADMINISTRATOR", "UTILITY_SUPERVISOR"].includes(currentRole)) return;

  setupModalBindings();
  loadGrids();
  renderOutagesLog();
});

function setupModalBindings() {
  const modal = document.getElementById("outage-modal");
  const closeBtn = document.getElementById("close-modal-btn");
  const cancelBtn = document.getElementById("cancel-modal-btn");
  const form = document.getElementById("outage-form");

  const closeModal = () => {
    modal.classList.remove("open");
    form.reset();
    document.getElementById("outage-grid-id").value = "";
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveOutage(closeModal);
  });
}

// Fetch Grids list from API
async function loadGrids() {
  const container = document.getElementById("grids-grid");
  const currentRole = Auth.getRole();

  try {
    allGrids = await apiCall("/api/grids");

    if (allGrids.length === 0) {
      container.innerHTML = `<div class="card" style="grid-column: span 3; text-align: center; padding: 40px 0;"><p class="info-label">No utility grids found.</p></div>`;
      return;
    }

    container.innerHTML = allGrids.map(grid => {
      const capacity = grid.capacityUnits || 1;
      const currentLoad = grid.currentLoad || 0;
      const percentage = Math.min(Math.round((currentLoad / capacity) * 100), 100);
      
      let statusClass = "badge-operational";
      let progressClass = "";
      if (grid.status === "DEGRADED") {
        statusClass = "badge-moderate";
        progressClass = "degraded";
      } else if (grid.status === "OFFLINE") {
        statusClass = "badge-high";
        progressClass = "degraded";
      }

      // Check if role is supervisor to display actions
      let actionButtons = "";
      if (currentRole === "UTILITY_SUPERVISOR") {
        actionButtons = `
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn btn-primary btn-sm" onclick="triggerUpdateLoad(${grid.gridId}, ${currentLoad})">
              Update Load
            </button>
            <button class="btn btn-secondary btn-sm" style="border-color: var(--color-danger); color: var(--color-danger);" onclick="triggerOutageModal(${grid.gridId}, '${grid.gridName}')">
              File Outage
            </button>
          </div>
        `;
      }

      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700;">${grid.gridName}</h3>
              <span class="info-label" style="font-size: 0.75rem; text-transform: uppercase;">Type: ${grid.gridType}</span>
            </div>
            <span class="badge ${statusClass}">${grid.status}</span>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
            <div>District: <strong style="color: var(--text-main);">${grid.district}</strong></div>
            <div>Max Capacity: <strong style="color: var(--text-main);">${capacity} Units</strong></div>
          </div>

          <div class="progress-container" style="margin-top: 8px;">
            <div class="progress-header">
              <span class="info-label">Active Load</span>
              <strong style="color: var(--primary-cyan);">${currentLoad} / ${capacity} (${percentage}%)</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar ${progressClass}" style="width: ${percentage}%;"></div>
            </div>
          </div>

          ${actionButtons}
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Failed to load utility grids status:", err);
    container.innerHTML = `<div class="card" style="grid-column: span 3; text-align: center; border-color: var(--color-danger);"><p class="badge-high" style="padding: 10px;">Error loading utility grids.</p></div>`;
  }
}

// Supervisor Update Load action
async function triggerUpdateLoad(gridId, currentLoad) {
  const input = prompt("Enter new grid load (Units):", currentLoad);
  if (input === null) return; // cancelled

  const newLoad = parseFloat(input);
  if (isNaN(newLoad) || newLoad < 0) {
    showToast("Invalid load value. Please enter a positive number.", "error");
    return;
  }

  try {
    await apiCall(`/api/grids/${gridId}`, {
      method: "PUT",
      body: JSON.stringify({ newLoad })
    });

    showToast("Grid load updated successfully", "success");
    loadGrids();
    updateNavAlertCount(); // If load >= 90%, it triggers alerts
  } catch (err) {
    console.error(`Failed to update grid load for ${gridId}:`, err);
  }
}

// Modal triggers
function triggerOutageModal(gridId, gridName) {
  const modal = document.getElementById("outage-modal");
  document.getElementById("outage-grid-id").value = gridId;
  document.getElementById("outage-grid-name").value = gridName;
  modal.classList.add("open");
}

// Save Outage
async function saveOutage(onSuccess) {
  const gridId = document.getElementById("outage-grid-id").value;
  const gridName = document.getElementById("outage-grid-name").value;
  const outageType = document.getElementById("outageType").value;
  const severity = document.getElementById("severity").value;
  const affectedArea = document.getElementById("affectedArea").value.trim();
  const timeInput = document.getElementById("restorationTime").value;

  if (!gridId || !outageType || !severity || !affectedArea || !timeInput) {
    showToast("Please fill in all outage parameters.", "error");
    return;
  }

  // Format estimated restoration time to ISO: YYYY-MM-DDTHH:MM:SS
  // Input from datetime-local is YYYY-MM-DDTHH:MM
  const estimatedRestorationTime = timeInput.includes(":") && timeInput.split(":").length === 2 
    ? `${timeInput}:00` 
    : timeInput;

  try {
    const data = await apiCall(`/api/grids/${gridId}/outages`, {
      method: "POST",
      body: JSON.stringify({
        outageType,
        affectedArea,
        severity,
        estimatedRestorationTime
      })
    });

    showToast("Outage registered successfully. Grid status set to DEGRADED.", "success");
    
    // Save to local logs for rendering
    logOutageLocally(gridName, data);
    
    onSuccess();
    loadGrids();
    renderOutagesLog();
    updateNavAlertCount();
  } catch (err) {
    console.error("Failed to register utility outage:", err);
  }
}

// Outage localStorage logger
function logOutageLocally(gridName, outageData) {
  const logs = JSON.parse(localStorage.getItem("metromind_registered_outages") || "[]");
  logs.unshift({
    gridName,
    outageType: outageData.outageType,
    affectedArea: outageData.affectedArea,
    severity: outageData.severity,
    estimatedRestorationTime: outageData.estimatedRestorationTime,
    status: outageData.status || "ACTIVE"
  });
  localStorage.setItem("metromind_registered_outages", JSON.stringify(logs));
}

// Render local log list
function renderOutagesLog() {
  const tbody = document.getElementById("outages-log-body");
  if (!tbody) return;

  const logs = JSON.parse(localStorage.getItem("metromind_registered_outages") || "[]");

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="info-label" style="text-align: center; padding: 20px 0;">No outages reported in this session.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    let severityClass = "badge-low";
    if (log.severity === "MEDIUM") severityClass = "badge-moderate";
    if (log.severity === "HIGH") severityClass = "badge-high";
    if (log.severity === "CRITICAL") severityClass = "badge-critical";

    let statusClass = "badge-unread"; // ACTIVE
    if (log.status === "RESOLVING") statusClass = "badge-moderate";
    if (log.status === "RESTORED") statusClass = "badge-operational";

    const restorationDate = new Date(log.estimatedRestorationTime).toLocaleString();

    return `
      <tr>
        <td><strong>${log.gridName}</strong></td>
        <td>${log.outageType}</td>
        <td>${log.affectedArea}</td>
        <td><span class="badge ${severityClass}">${log.severity}</span></td>
        <td>${restorationDate}</td>
        <td><span class="badge ${statusClass}">${log.status}</span></td>
      </tr>
    `;
  }).join("");
}
