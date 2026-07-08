/**
 * MetroMind Register Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, redirect
  if (Auth.isAuthenticated()) {
    redirectUserByRole(Auth.getRole());
    return;
  }

  const form = document.getElementById("register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("fullName").value.trim();
    const role = document.getElementById("role").value;
    const district = document.getElementById("district").value.trim();
    const badgeNumber = document.getElementById("badgeNumber").value.trim();

    if (!username || !password || !fullName || !role || !district || !badgeNumber) {
      showToast("All fields are required.", "error");
      return;
    }

    try {
      const data = await apiCall("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          fullName,
          role,
          district,
          badgeNumber
        })
      });

      if (data && data.token) {
        Auth.saveSession(data.token, data.username, data.role);
        showToast("Registration successful! Logging you in...", "success");
        
        setTimeout(() => {
          redirectUserByRole(data.role);
        }, 1000);
      } else {
        showToast("Registration failed. Invalid response structure.", "error");
      }
    } catch (err) {
      // Errors are already handled by apiCall
      console.error("Registration attempt failed:", err);
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
