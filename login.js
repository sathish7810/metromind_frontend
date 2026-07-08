/**
 * MetroMind Login Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, redirect to index
  if (Auth.isAuthenticated()) {
    redirectUserByRole(Auth.getRole());
    return;
  }

  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showToast("Please fill in all credentials.", "error");
      return;
    }

    try {
      const data = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      if (data && data.token) {
        Auth.saveSession(data.token, data.username, data.role);
        showToast(`Welcome back, ${data.username}!`, "success");
        
        // Wait briefly for the toast, then redirect
        setTimeout(() => {
          redirectUserByRole(data.role);
        }, 800);
      } else {
        showToast("Authentication failed. Invalid response structure.", "error");
      }
    } catch (err) {
      // Errors are already handled/alerted by apiCall toast
      console.error("Login attempt failed:", err);
    }
  });
});

function redirectUserByRole(role) {
  if (role === "CITY_ADMINISTRATOR") {
    window.location.href = "dashboard.html";
  } else if (role === "TRAFFIC_CONTROLLER") {
    window.location.href = "traffic.html";
  } else if (role === "UTILITY_SUPERVISOR") {
    window.location.href = "utilities.html";
  } else {
    window.location.href = "alerts.html";
  }
}
