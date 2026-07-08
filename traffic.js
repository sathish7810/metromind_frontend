/**
 * MetroMind Traffic Workspace Controller
 */

let allZones = [];

document.addEventListener("DOMContentLoaded", () => {
  const currentRole = Auth.getRole();
  if (!["CITY_ADMINISTRATOR", "TRAFFIC_CONTROLLER"].includes(currentRole)) return;

  setupHeaderActions(currentRole);
  setupModalBindings();
  loadTrafficData();
});

// Create 'Report Incident' button dynamically for authorized users
function setupHeaderActions(role) {
  const container = document.getElementById("action-header-btn");
  if (!container) return;

  container.innerHTML = `
    <button id="report-incident-trigger" class="btn btn-primary">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="vertical-align: middle;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      <span>Report Incident</span>
    </button>
  `;

  document.getElementById("report-incident-trigger").addEventListener("click", () => {
    openIncidentModal();
  });
}

function setupModalBindings() {
  const modal = document.getElementById("incident-modal");
  const closeBtn = document.getElementById("close-modal-btn");
  const cancelBtn = document.getElementById("cancel-modal-btn");
  const form = document.getElementById("incident-form");

  const closeModal = () => {
    modal.classList.remove("open");
    form.reset();
    document.getElementById("incident-id").value = "";
    document.getElementById("modal-title").textContent = "Report Incident";
    document.getElementById("save-incident-btn").textContent = "Submit Report";
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveIncident(closeModal);
  });
}

async function loadTrafficData() {
  await loadZones();
  await loadIncidents();
}

// Load Zones
async function loadZones() {
  const listContainer = document.getElementById("zones-list");
  const selectDropdown = document.getElementById("zoneId");
  const currentRole = Auth.getRole();

  try {
    allZones = await apiCall("/api/zones");

    // Populate Modal Dropdown
    selectDropdown.innerHTML = `<option value="" disabled selected>Select location zone</option>` + 
      allZones.map(zone => `<option value="${zone.zoneId}">${zone.zoneName} (${zone.zoneCode})</option>`).join("");

    if (allZones.length === 0) {
      listContainer.innerHTML = `<p class="info-label" style="text-align: center; padding: 20px 0;">No traffic zones found in database.</p>`;
      return;
    }

    listContainer.innerHTML = allZones.map(zone => {
      let congestionClass = "badge-low";
      if (zone.currentCongestionLevel === "MODERATE") congestionClass = "badge-moderate";
      if (zone.currentCongestionLevel === "HIGH") congestionClass = "badge-high";
      if (zone.currentCongestionLevel === "CRITICAL") congestionClass = "badge-critical";

      // Admin delete zone button
      const deleteBtn = currentRole === "CITY_ADMINISTRATOR" 
        ? `<button class="btn btn-secondary btn-sm" style="padding: 4px 8px; border-color: var(--color-danger); color: var(--color-danger);" onclick="deleteZone(${zone.zoneId})">Delete</button>`
        : "";

      return `
        <div class="card" style="padding: 16px; margin: 0; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="font-weight: 700; font-size: 0.95rem;">${zone.zoneName}</div>
            <span class="badge ${congestionClass}">${zone.currentCongestionLevel}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            <div>Code: <strong style="color: var(--text-main);">${zone.zoneCode}</strong></div>
            <div>District: <span style="color: var(--text-main);">${zone.district}</span></div>
            <div style="margin-top: 4px;">Signal Cycle: <strong style="color: var(--primary-cyan);">${zone.signalCycleSeconds}s</strong></div>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
            ${deleteBtn}
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Failed to load traffic zones:", err);
    listContainer.innerHTML = `<p class="badge-high" style="padding: 10px; border-radius: 4px; text-align: center;">Error loading traffic zones.</p>`;
  }
}

// Load Incidents
async function loadIncidents() {
  const tbody = document.getElementById("incidents-table-body");
  const currentRole = Auth.getRole();

  try {
    const incidents = await apiCall("/api/incidents");

    if (incidents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="info-label" style="text-align: center; padding: 40px 0;">No active incidents reported.</td></tr>`;
      return;
    }

    tbody.innerHTML = incidents.map(incident => {
      let severityClass = "badge-low";
      if (incident.severity === "MEDIUM") severityClass = "badge-moderate";
      if (incident.severity === "HIGH") severityClass = "badge-high";
      if (incident.severity === "CRITICAL") severityClass = "badge-critical";

      let statusClass = "badge-reported";
      if (incident.status === "DISPATCHED") statusClass = "badge-moderate";
      if (incident.status === "RESOLVED") statusClass = "badge-operational";
      if (incident.status === "CLOSED") statusClass = "badge-read";

      // Determine allowed actions based on role and status
      let actionButtons = "";

      // Traffic Controllers can dispatch incidents if they are REPORTED
      if (currentRole === "TRAFFIC_CONTROLLER" && incident.status === "REPORTED") {
        actionButtons += `<button class="btn btn-primary btn-sm" onclick="dispatchIncident(${incident.incidentId})">Dispatch</button> `;
      }

      // Both Admins and Controllers can edit/update incidents
      actionButtons += `<button class="btn btn-secondary btn-sm" onclick="editIncident(${incident.incidentId})">Edit</button> `;

      // Only Admin can delete incidents
      if (currentRole === "CITY_ADMINISTRATOR") {
        actionButtons += `<button class="btn btn-secondary btn-sm" style="border-color: var(--color-danger); color: var(--color-danger);" onclick="deleteIncident(${incident.incidentId})">Delete</button>`;
      }

      const reportedDate = new Date(incident.reportedAt).toLocaleString();

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${incident.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${incident.description}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
              Type: <strong>${incident.incidentType}</strong> | By: <strong>${incident.reportedBy ? incident.reportedBy.fullName : 'System'}</strong> | ${reportedDate}
            </div>
          </td>
          <td>
            <div style="font-weight: 600;">${incident.zone ? incident.zone.zoneName : 'Unknown'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${incident.zone ? incident.zone.zoneCode : ''}</div>
          </td>
          <td><span class="badge ${severityClass}">${incident.severity}</span></td>
          <td><span class="badge ${statusClass}">${incident.status}</span></td>
          <td><div style="display: flex; gap: 4px; flex-wrap: wrap;">${actionButtons}</div></td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Failed to load traffic incidents:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="badge-high" style="padding: 20px 0; text-align: center;">Error loading traffic incidents logs.</td></tr>`;
  }
}

// Modal open actions
function openIncidentModal(incident = null) {
  const modal = document.getElementById("incident-modal");
  const modalTitle = document.getElementById("modal-title");
  const saveBtn = document.getElementById("save-incident-btn");

  if (incident) {
    modalTitle.textContent = "Edit Incident Info";
    saveBtn.textContent = "Save Changes";
    document.getElementById("incident-id").value = incident.incidentId;
    document.getElementById("title").value = incident.title;
    document.getElementById("incidentType").value = incident.incidentType;
    document.getElementById("severity").value = incident.severity;
    document.getElementById("zoneId").value = incident.zone ? incident.zone.zoneId : "";
    document.getElementById("description").value = incident.description;
  } else {
    modalTitle.textContent = "Report Traffic Incident";
    saveBtn.textContent = "Submit Report";
    document.getElementById("incident-id").value = "";
  }

  modal.classList.add("open");
}

// Save Incident (Create / Update)
async function saveIncident(onSuccess) {
  const id = document.getElementById("incident-id").value;
  const title = document.getElementById("title").value.trim();
  const incidentType = document.getElementById("incidentType").value;
  const severity = document.getElementById("severity").value;
  const zoneId = Number(document.getElementById("zoneId").value);
  const description = document.getElementById("description").value.trim();

  if (!title || !incidentType || !severity || !zoneId || !description) {
    showToast("Please fill out all incident details.", "error");
    return;
  }

  const payload = { title, incidentType, severity, zoneId, description };

  try {
    if (id) {
      // Edit
      await apiCall(`/api/incidents/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showToast("Incident report updated successfully", "success");
    } else {
      // Create
      await apiCall("/api/incidents", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Incident reported successfully", "success");
    }

    onSuccess();
    loadTrafficData();
    updateNavAlertCount(); // Incident severity high/crit triggers alerts
  } catch (err) {
    console.error("Failed to save incident detail:", err);
  }
}

// Dispatch Incident (Controller action)
async function dispatchIncident(incidentId) {
  try {
    await apiCall(`/api/incidents/${incidentId}/dispatch`, {
      method: "PUT"
    });
    showToast("Incident dispatched to field units", "success");
    loadIncidents();
  } catch (err) {
    console.error(`Failed to dispatch incident ${incidentId}:`, err);
  }
}

// Load single incident for editing
async function editIncident(incidentId) {
  try {
    const incident = await apiCall(`/api/incidents/${incidentId}`);
    openIncidentModal(incident);
  } catch (err) {
    console.error(`Failed to fetch incident details for ID ${incidentId}:`, err);
  }
}

// Delete Incident (Admin action)
async function deleteIncident(incidentId) {
  if (!confirm("Are you sure you want to delete this incident record?")) return;

  try {
    await apiCall(`/api/incidents/${incidentId}`, {
      method: "DELETE"
    });
    showToast("Incident record deleted", "success");
    loadIncidents();
  } catch (err) {
    console.error(`Failed to delete incident ${incidentId}:`, err);
  }
}

// Delete Zone (Admin action)
async function deleteZone(zoneId) {
  if (!confirm("Are you sure you want to delete this traffic zone? Warning: All associated incidents may become invalid.")) return;

  try {
    await apiCall(`/api/zones/${zoneId}`, {
      method: "DELETE"
    });
    showToast("Traffic zone deleted", "success");
    loadTrafficData();
  } catch (err) {
    console.error(`Failed to delete zone ${zoneId}:`, err);
  }
}
