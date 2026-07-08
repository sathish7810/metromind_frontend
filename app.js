/**
 * MetroMind Core Application Driver
 * Contains shared API wrapper, auth state, router security, 
 * dynamic navigation builder, and custom toast notification system.
 */

const API_BASE = "https://metromind-backend.onrender.com";

// Standard Toast Alert System
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#00e676"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff1744"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto remove toast after 4s
  setTimeout(() => {
    toast.style.animation = "slide-in 0.3s reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Authentication & Token Management
const Auth = {
  getToken() {
    return localStorage.getItem("metromind_token");
  },
  getUsername() {
    return localStorage.getItem("metromind_username") || "Guest";
  },
  getRole() {
    return localStorage.getItem("metromind_role");
  },
  saveSession(token, username, role) {
    localStorage.setItem("metromind_token", token);
    localStorage.setItem("metromind_username", username);
    localStorage.setItem("metromind_role", role);
  },
  clearSession() {
    localStorage.removeItem("metromind_token");
    localStorage.removeItem("metromind_username");
    localStorage.removeItem("metromind_role");
    window.location.href = "login.html";
  },
  isAuthenticated() {
    return !!this.getToken();
  }
};

// API Fetch Helper wrapping standard headers and JWT authorization
async function apiCall(endpoint, options = {}) {
  const token = Auth.getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Check if token is expired/invalid
    if (response.status === 401) {
      showToast("Session expired. Please log in again.", "error");
      setTimeout(() => Auth.clearSession(), 1000);
      throw new Error("Unauthorized");
    }
    
    if (response.status === 403) {
      showToast("Access Denied: You do not have permission for this action.", "error");
      throw new Error("Forbidden");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.error || `HTTP error! Status: ${response.status}`;
      throw new Error(errMsg);
    }

    // Try parsing as JSON, fallback to text/empty
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    if (err.message !== "Unauthorized" && err.message !== "Forbidden") {
      showToast(err.message, "error");
    }
    throw err;
  }
}

// Map roles to user-friendly titles
function formatRoleName(role) {
  if (!role) return "";
  return role.replace("ROLE_", "").replace("_", " ");
}

// Build Navigation Sidebar Dynamically
function buildSidebar() {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  const currentRole = Auth.getRole();
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  // Check if current page is allowed for this role. Redirect if not.
  const pagePermissions = {
    "dashboard.html": ["CITY_ADMINISTRATOR"],
    "traffic.html": ["CITY_ADMINISTRATOR", "TRAFFIC_CONTROLLER"],
    "utilities.html": ["CITY_ADMINISTRATOR", "UTILITY_SUPERVISOR"],
    "alerts.html": ["CITY_ADMINISTRATOR", "TRAFFIC_CONTROLLER", "UTILITY_SUPERVISOR", "FIELD_TECHNICIAN", "CIVIC_ANALYST"]
  };

  if (pagePermissions[currentPath] && !pagePermissions[currentPath].includes(currentRole)) {
    // Redirect unauthorized user to their respective default page
    if (currentRole === "CITY_ADMINISTRATOR") {
      window.location.href = "dashboard.html";
    } else if (currentRole === "TRAFFIC_CONTROLLER") {
      window.location.href = "traffic.html";
    } else if (currentRole === "UTILITY_SUPERVISOR") {
      window.location.href = "utilities.html";
    } else {
      window.location.href = "alerts.html";
    }
    return;
  }

  // Sidebar SVG Icons Definition
  const icons = {
    logo: `<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99zM13 16h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>`,
    dashboard: `<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`,
    traffic: `<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.24-3.72c.1-.29.37-.28.37-.28h10.77s.28-.01.37.28L19 11H5z"/></svg>`,
    utilities: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>`,
    alerts: `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 4.88 6 7.46 6 10.5v5l-2 2v1h16v-1l-2-2z"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`
  };

  // Modify grid icon to bolt/electric tower style
  icons.utilities = `<svg viewBox="0 0 24 24"><path d="M11.5 2L3 13h7v9l8.5-11h-7z"/></svg>`;

  let menuHtml = "";

  // Dashboard Stats (CITY_ADMINISTRATOR only)
  if (currentRole === "CITY_ADMINISTRATOR") {
    menuHtml += `
      <li class="menu-item ${currentPath === "dashboard.html" ? "active" : ""}">
        <a href="dashboard.html">
          ${icons.dashboard}
          <span>Dashboard</span>
        </a>
      </li>
    `;
  }

  // Traffic Management (CITY_ADMINISTRATOR & TRAFFIC_CONTROLLER)
  if (["CITY_ADMINISTRATOR", "TRAFFIC_CONTROLLER"].includes(currentRole)) {
    menuHtml += `
      <li class="menu-item ${currentPath === "traffic.html" ? "active" : ""}">
        <a href="traffic.html">
          ${icons.traffic}
          <span>Traffic Zones</span>
        </a>
      </li>
    `;
  }

  // Utility Grids (CITY_ADMINISTRATOR & UTILITY_SUPERVISOR)
  if (["CITY_ADMINISTRATOR", "UTILITY_SUPERVISOR"].includes(currentRole)) {
    menuHtml += `
      <li class="menu-item ${currentPath === "utilities.html" ? "active" : ""}">
        <a href="utilities.html">
          ${icons.utilities}
          <span>Utility Grids</span>
        </a>
      </li>
    `;
  }

  // Alerts inbox (All authenticated roles)
  menuHtml += `
    <li class="menu-item ${currentPath === "alerts.html" ? "active" : ""}">
      <a href="alerts.html" style="position: relative;">
        ${icons.alerts}
        <span>Alert Notifications</span>
        <span id="nav-alert-badge" class="badge badge-high" style="display: none; position: absolute; right: 16px; padding: 2px 6px; font-size: 0.7rem;">0</span>
      </a>
    </li>
  `;

  const sidebarHtml = `
    <aside class="sidebar">
      <div class="sidebar-header">
        ${icons.logo}
        <span class="logo-text">MetroMind</span>
      </div>
      <div class="user-profile-badge">
        <span class="profile-name">${Auth.getUsername()}</span>
        <span class="profile-role">${formatRoleName(currentRole)}</span>
      </div>
      <ul class="sidebar-menu">
        ${menuHtml}
      </ul>
      <div class="menu-footer">
        <button id="logout-btn" class="btn-logout">
          ${icons.logout}
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  `;

  sidebarContainer.innerHTML = sidebarHtml;

  // Bind logout action
  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.clearSession();
  });

  // Load alert notification count
  updateNavAlertCount();
}

// Update alert counts dynamically on navigation items
async function updateNavAlertCount() {
  const navBadge = document.getElementById("nav-alert-badge");
  if (!navBadge) return;
  
  try {
    const alerts = await apiCall("/api/alerts");
    const unreadCount = alerts.filter(a => !a.isRead).length;
    if (unreadCount > 0) {
      navBadge.textContent = unreadCount;
      navBadge.style.display = "inline-flex";
    } else {
      navBadge.style.display = "none";
    }
  } catch (err) {
    console.error("Failed to load nav alert count", err);
  }
}

// Ensure route security and navbar render on load
if (window.location.pathname.split("/").pop() !== "login.html" && 
    window.location.pathname.split("/").pop() !== "register.html") {
  
  if (!Auth.isAuthenticated()) {
    window.location.href = "login.html";
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      buildSidebar();
    });
  }
}
