(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };
  var authPanel = $("#authPanel");
  var profilePanel = $("#profilePanel");
  var accountStatus = $("#accountStatus");
  var profileStatus = $("#profileStatus");
  var csrfToken = "";

  async function request(url, options) {
    var settings = options || {};
    var headers = Object.assign({ Accept: "application/json" }, settings.headers || {});
    if (settings.body) headers["Content-Type"] = "application/json";
    if (settings.method && settings.method !== "GET") headers["X-CSRF-Token"] = csrfToken;
    var response = await fetch(url, Object.assign({}, settings, { credentials: "same-origin", headers: headers }));
    if (response.status === 204) return null;
    var payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }

  function setMode(mode) {
    var loginMode = mode === "login";
    $("#loginForm").hidden = !loginMode;
    $("#registerForm").hidden = loginMode;
    $("#loginTab").classList.toggle("active", loginMode);
    $("#registerTab").classList.toggle("active", !loginMode);
    $("#loginTab").setAttribute("aria-selected", String(loginMode));
    $("#registerTab").setAttribute("aria-selected", String(!loginMode));
    accountStatus.textContent = "";
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
  }

  function setProfileView(view) {
    var dashboardVisible = view === "dashboard";
    $("#dashboardView").hidden = !dashboardVisible;
    $("#profileSettings").hidden = dashboardVisible;
    document.querySelectorAll("[data-profile-view]").forEach(function (tab) {
      var selected = tab.dataset.profileView === view;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
  }

  async function showOrders() {
    var container = $("#orderHistory");
    var summary = $("#dashboardSummary");
    container.replaceChildren();
    summary.replaceChildren();
    if ($("#profileEmail").dataset.role === "admin") {
      summary.hidden = true;
      container.hidden = true;
      return;
    }
    summary.hidden = false;
    container.hidden = false;
    var heading = document.createElement("h2");
    heading.textContent = "Your order requests";
    container.appendChild(heading);
    var result = await request("/api/orders");
    ["pending", "confirmed", "declined", "completed"].forEach(function (state) {
      var card = document.createElement("div");
      card.className = "summary-card";
      var count = document.createElement("strong");
      count.textContent = String(result.orders.filter(function (order) { return order.status === state; }).length);
      var label = document.createElement("span");
      label.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      card.append(count, label);
      summary.appendChild(card);
    });
    if (!result.orders.length) {
      var empty = document.createElement("p");
      empty.className = "intro";
      empty.textContent = "No order requests yet.";
      container.appendChild(empty);
      return;
    }
    result.orders.forEach(function (order) {
      var row = document.createElement("div");
      row.className = "order-row";
      var modelName = document.createElement("strong");
      modelName.textContent = order.modelName;
      var state = document.createElement("span");
      state.className = "order-state";
      state.textContent = order.status;
      var details = document.createElement("small");
      details.textContent = "Request #" + order.id + " · " + formatPrice(order.price);
      row.append(modelName, state, details);
      container.appendChild(row);
    });
  }

  async function showProfile(user) {
    authPanel.hidden = true;
    profilePanel.hidden = false;
    $("#profileName").textContent = user.name;
    $("#profileEmail").textContent = user.email;
    $("#profileEmail").dataset.role = user.role;
    $("#profileSettings").querySelector('[name="name"]').value = user.name;
    $("#profileSettings").querySelector('[name="email"]').value = user.email;
    $("#adminLink").hidden = user.role !== "admin";
    try {
      await showOrders();
    } catch (error) {
      profileStatus.textContent = error.message;
    }
    if (new URLSearchParams(window.location.search).has("model")) {
      profileStatus.textContent = "You’re signed in. Return to the model list to place your order request.";
    }
  }

  async function load() {
    try {
      var csrf = await request("/api/auth/csrf");
      csrfToken = csrf.csrfToken;
      var account = await request("/api/auth/me");
      if (account.user) await showProfile(account.user);
    } catch (error) {
      accountStatus.textContent = "Account service is unavailable. Please try again when the site server is running.";
    }
  }

  $("#loginTab").addEventListener("click", function () { setMode("login"); });
  $("#registerTab").addEventListener("click", function () { setMode("register"); });
  document.querySelectorAll("[data-profile-view]").forEach(function (tab) {
    tab.addEventListener("click", function () { setProfileView(tab.dataset.profileView); });
  });

  $("#loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    accountStatus.textContent = "";
    var values = new FormData(event.currentTarget);
    try {
      var result = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") })
      });
      csrfToken = result.csrfToken;
      await showProfile(result.user);
    } catch (error) {
      accountStatus.textContent = error.message;
    }
  });

  $("#registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    accountStatus.textContent = "";
    var values = new FormData(event.currentTarget);
    try {
      var result = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: values.get("name"), email: values.get("email"), password: values.get("password") })
      });
      csrfToken = result.csrfToken;
      await showProfile(result.user);
    } catch (error) {
      accountStatus.textContent = error.message;
    }
  });

  $("#profileSettings").addEventListener("submit", async function (event) {
    event.preventDefault();
    profileStatus.textContent = "";
    var values = new FormData(event.currentTarget);
    try {
      var result = await request("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          currentPassword: values.get("currentPassword"),
          newPassword: values.get("newPassword"),
          confirmPassword: values.get("confirmPassword")
        })
      });
      csrfToken = result.csrfToken;
      event.currentTarget.reset();
      await showProfile(result.user);
      setProfileView("settings");
      profileStatus.textContent = "Profile settings saved.";
    } catch (error) {
      profileStatus.textContent = error.message;
    }
  });

  $("#logoutButton").addEventListener("click", async function () {
    profileStatus.textContent = "";
    try {
      await request("/api/auth/logout", { method: "POST" });
      window.location.href = "account.html";
    } catch (error) {
      profileStatus.textContent = error.message;
    }
  });

  load();
})();
