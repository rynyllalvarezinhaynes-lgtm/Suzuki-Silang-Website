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
    var heading = document.createElement("h2");
    heading.textContent = "Your purchase requests";
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
      empty.textContent = "No purchase requests yet. Choose a car above to get started.";
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
      details.textContent = "Request #" + order.id + " · " + formatPrice(order.price) + " · " +
        new Date(order.createdAt).toLocaleDateString("en-PH");
      var metadata = document.createElement("div");
      metadata.className = "order-meta";
      metadata.appendChild(details);
      if (order.status === "pending") {
        var removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "secondary-button";
        removeButton.textContent = "Remove request";
        removeButton.addEventListener("click", async function () {
          if (!window.confirm("Remove your pending request for " + order.modelName + "? This cannot be undone.")) return;
          removeButton.disabled = true;
          removeButton.textContent = "Removing...";
          $("#customerShopStatus").textContent = "";
          try {
            await request("/api/orders/" + order.id, { method: "DELETE" });
            removeButton.textContent = "Removed";
            try {
              await Promise.all([showOrders(), loadCustomerModels()]);
              $("#customerShopStatus").textContent = "Your pending request was removed.";
            } catch (error) {
              $("#customerShopStatus").textContent = "Your request was removed, but its history could not refresh. Reload the page to confirm.";
            }
          } catch (error) {
            removeButton.disabled = false;
            removeButton.textContent = "Remove request";
            $("#customerShopStatus").textContent = error.message;
          }
        });
        metadata.appendChild(removeButton);
      }
      row.append(modelName, state, metadata);
      container.appendChild(row);
    });
  }

  async function loadCustomerModels() {
    var status = $("#customerShopStatus");
    var container = $("#customerModels");
    container.replaceChildren();
    status.textContent = "Loading cars...";
    var result = await request("/api/models");
    if (!result.models.length) {
      status.textContent = "There are no cars available for requests right now. Please contact Suzuki Auto Silang.";
      return;
    }

    var requestedSlug = new URLSearchParams(window.location.search).get("model");
    result.models.forEach(function (model) {
      var card = document.createElement("article");
      card.className = "customer-model-card";
      if (model.slug === requestedSlug) card.classList.add("is-selected");

      var image = document.createElement("img");
      image.src = model.imagePath;
      image.alt = "Suzuki " + model.name;
      image.loading = "lazy";
      var details = document.createElement("div");
      details.className = "customer-model-details";
      var category = document.createElement("p");
      category.className = "customer-model-category";
      category.textContent = model.category;
      var title = document.createElement("h3");
      title.textContent = model.name;
      var price = document.createElement("p");
      price.className = "customer-model-price";
      price.textContent = model.price === null ? "Contact dealer for price" : "From " + formatPrice(model.price);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.textContent = model.price === null ? "Price not set" : "Request to buy";
      button.disabled = model.price === null;
      button.addEventListener("click", async function () {
        if (!window.confirm("Send a purchase request for " + model.name + "? The dealer will confirm availability and final pricing. No payment is taken online.")) return;
        button.disabled = true;
        button.textContent = "Sending request...";
        status.textContent = "";
        try {
          var response = await request("/api/orders", {
            method: "POST",
            body: JSON.stringify({ modelId: model.id })
          });
          button.textContent = "Request sent";
          button.disabled = true;
          status.textContent = "Request #" + response.order.id + " was sent. The dealer will contact you to confirm the details.";
          try {
            await showOrders();
          } catch (error) {
            profileStatus.textContent = "Your request was sent, but the history could not refresh. Reload the page to see its status.";
          }
        } catch (error) {
          button.disabled = false;
          button.textContent = "Request to buy";
          status.textContent = error.message;
        }
      });

      details.append(category, title, price, button);
      card.append(image, details);
      container.appendChild(card);
    });

    status.textContent = requestedSlug && !result.models.some(function (model) { return model.slug === requestedSlug; })
      ? "That car is not currently available for requests. Choose from the available cars below."
      : "Choose a car to send a purchase request. There is no online payment.";
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
    var isCustomer = user.role === "customer";
    $("#customerShop").hidden = !isCustomer;
    $("#dashboardSummary").hidden = !isCustomer;
    $("#orderHistory").hidden = !isCustomer;
    if (isCustomer) {
      try {
        await Promise.all([showOrders(), loadCustomerModels()]);
      } catch (error) {
        profileStatus.textContent = error.message;
      }
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
    var profileForm = event.currentTarget;
    var values = new FormData(profileForm);
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
      profileForm.reset();
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
