(function () {
  "use strict";

  var status = document.getElementById("shopStatus");
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-model-slug]"));

  function readResponse(response) {
    return response.json().then(function (payload) {
      if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
      return payload;
    }).catch(function (error) {
      if (error instanceof SyntaxError) throw new Error("The server returned an unreadable response.");
      throw error;
    });
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(price));
  }

  function showSignedInAccount(user) {
    var accountLink = document.getElementById("accountLink");
    var accountIdentity = document.getElementById("accountIdentity");
    var dashboardLink = document.getElementById("dashboardLink");
    if (!accountLink || !user) return;
    var role = user.role === "admin" ? "Admin" : "Customer";
    var dashboardUrl = user.role === "admin" ? "admin.html" : "account.html";
    accountLink.hidden = true;
    accountIdentity.hidden = false;
    accountIdentity.textContent = user.name + " · " + role;
    accountIdentity.setAttribute("aria-label", "Signed in as " + user.name + " (" + user.email + ", " + role + ").");
    accountIdentity.title = "Signed in as " + user.name + " (" + user.email + ", " + role + ")";
    dashboardLink.href = dashboardUrl;
    dashboardLink.hidden = false;
  }

  function disableCard(card, message) {
    card.querySelector(".model-price").textContent = message;
    var button = card.querySelector(".order-button");
    button.textContent = "Unavailable";
    button.disabled = true;
  }

  function showModel(card, model, user) {
    var price = card.querySelector(".model-price");
    var button = card.querySelector(".order-button");
    if (model.price === null || !Number.isFinite(Number(model.price)) || Number(model.price) <= 0) {
      price.textContent = "Price available on inquiry";
      button.textContent = "Price not set";
      button.disabled = true;
      return;
    }

    price.textContent = "From " + formatPrice(model.price);
    button.disabled = false;
    if (user && user.role === "admin") {
      button.textContent = "Manage price";
    } else if (user) {
      button.textContent = "Request from dashboard";
    } else {
      button.textContent = "Sign in to request";
    }

    button.addEventListener("click", function () {
      if (user && user.role === "admin") {
        window.location.href = "admin.html";
        return;
      }
      window.location.href = "account.html?model=" + encodeURIComponent(model.slug);
    });
  }

  async function loadShop() {
    cards.forEach(function (card) {
      card.querySelector(".model-price").textContent = "Loading current price...";
      card.querySelector(".order-button").disabled = true;
    });
    try {
      var responses = await Promise.all([
        fetch("/api/auth/me", { credentials: "same-origin" }),
        fetch("/api/models", { credentials: "same-origin" })
      ]);
      var account = await readResponse(responses[0]);
      var catalog = await readResponse(responses[1]);
      showSignedInAccount(account.user);
      var modelBySlug = new Map(catalog.models.map(function (model) { return [model.slug, model]; }));
      cards.forEach(function (card) {
        var model = modelBySlug.get(card.dataset.modelSlug);
        if (!model) {
          disableCard(card, "Not currently available");
          return;
        }
        showModel(card, model, account.user);
      });
      status.textContent = account.user && account.user.role === "customer"
        ? "Prices are set by Suzuki Auto Silang. Submit purchase requests from your customer dashboard."
        : "Prices and availability come from Suzuki Auto Silang. Sign in to send a purchase request.";
    } catch (error) {
      cards.forEach(function (card) { disableCard(card, "Price unavailable"); });
      status.textContent = "The showroom service is unavailable. Please try again later or contact Suzuki Auto Silang.";
    }
  }

  loadShop();
})();
