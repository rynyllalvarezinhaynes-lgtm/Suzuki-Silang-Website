(function () {
  "use strict";

  var status = document.getElementById("shopStatus");
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-model-slug]"));
  var csrfToken = "";
  var currentUser = null;

  function setStatus(message) {
    status.textContent = message;
  }

  async function readResponse(response) {
    var payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(price));
  }

  function showModel(model) {
    var card = cards.find(function (item) { return item.dataset.modelSlug === model.slug; });
    if (!card) return;
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
    if (!currentUser) {
      button.textContent = "Sign in to order";
      button.addEventListener("click", function () {
        window.location.href = "account.html?model=" + encodeURIComponent(model.slug);
      }, { once: true });
    } else if (currentUser.role === "admin") {
      button.textContent = "Manage prices";
      button.addEventListener("click", function () {
        window.location.href = "admin.html";
      }, { once: true });
    } else {
      button.textContent = "Place order";
      button.addEventListener("click", async function () {
        if (!window.confirm("Submit an order request for " + model.name + "? The dealer will confirm availability.")) return;
        button.disabled = true;
        button.textContent = "Submitting…";
        try {
          var response = await fetch("/api/orders", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
            body: JSON.stringify({ modelId: model.id })
          });
          var result = await readResponse(response);
          setStatus("Order request #" + result.order.id + " was submitted. Suzuki Auto Silang will confirm availability.");
          button.textContent = "Request sent";
        } catch (error) {
          setStatus(error.message);
          button.disabled = false;
          button.textContent = "Place order";
        }
      });
    }
  }

  async function loadShop() {
    try {
      var csrf = await readResponse(await fetch("/api/auth/csrf", { credentials: "same-origin" }));
      var account = await readResponse(await fetch("/api/auth/me", { credentials: "same-origin" }));
      var catalog = await readResponse(await fetch("/api/models", { credentials: "same-origin" }));
      csrfToken = csrf.csrfToken;
      currentUser = account.user;
      catalog.models.forEach(showModel);
    } catch (error) {
      setStatus("Online prices and ordering are unavailable right now. Please contact Suzuki Auto Silang for current prices.");
    }
  }

  loadShop();
})();
