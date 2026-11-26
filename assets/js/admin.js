(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };
  var status = $("#adminStatus");
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

  function makeCell(tag, text) {
    var cell = document.createElement(tag);
    cell.textContent = text;
    return cell;
  }

  async function loadModels() {
    var result = await request("/api/admin/models");
    var container = $("#modelPrices");
    container.replaceChildren();
    result.models.forEach(function (model) {
      var form = document.createElement("form");
      form.className = "price-card";
      var title = document.createElement("h3");
      title.textContent = model.name;
      var priceLabel = document.createElement("label");
      priceLabel.textContent = "Starting price (PHP)";
      var priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.name = "price";
      priceInput.min = "0.01";
      priceInput.step = "0.01";
      priceInput.value = model.price === null ? "" : model.price;
      priceInput.placeholder = "Not set";
      priceLabel.appendChild(priceInput);
      var activeLabel = document.createElement("label");
      activeLabel.className = "availability-label";
      var activeInput = document.createElement("input");
      activeInput.type = "checkbox";
      activeInput.name = "active";
      activeInput.checked = Boolean(model.active);
      activeLabel.append(activeInput, document.createTextNode("Available for order"));
      var saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.className = "primary-button";
      saveButton.textContent = "Save price";
      form.append(title, priceLabel, activeLabel, saveButton);
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        status.textContent = "";
        saveButton.disabled = true;
        try {
          await request("/api/admin/models/" + model.id + "/price", {
            method: "PUT",
            body: JSON.stringify({ price: priceInput.value, active: activeInput.checked })
          });
          status.textContent = model.name + " price saved.";
        } catch (error) {
          status.textContent = error.message;
        } finally {
          saveButton.disabled = false;
        }
      });
      container.appendChild(form);
    });
  }

  async function loadOrders() {
    var result = await request("/api/admin/orders");
    var container = $("#adminOrders");
    container.replaceChildren();
    if (!result.orders.length) {
      container.textContent = "No order requests yet.";
      return;
    }
    var table = document.createElement("table");
    var head = document.createElement("thead");
    var headerRow = document.createElement("tr");
    ["Request", "Customer", "Model", "Price", "Status", "Update"].forEach(function (label) {
      headerRow.appendChild(makeCell("th", label));
    });
    head.appendChild(headerRow);
    var body = document.createElement("tbody");
    result.orders.forEach(function (order) {
      var row = document.createElement("tr");
      row.appendChild(makeCell("td", "#" + order.id));
      var customerCell = document.createElement("td");
      customerCell.appendChild(makeCell("div", order.customerName));
      var emailLink = document.createElement("a");
      emailLink.href = "mailto:" + order.customerEmail.split("@").map(encodeURIComponent).join("@") + "?subject=" + encodeURIComponent("Suzuki Auto Silang order #" + order.id);
      emailLink.textContent = order.customerEmail;
      customerCell.appendChild(emailLink);
      row.appendChild(customerCell);
      row.appendChild(makeCell("td", order.modelName));
      row.appendChild(makeCell("td", new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(order.price))));
      var statusCell = document.createElement("td");
      var select = document.createElement("select");
      ["pending", "confirmed", "declined", "completed"].forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === order.status;
        select.appendChild(option);
      });
      statusCell.appendChild(select);
      row.appendChild(statusCell);
      var actionCell = document.createElement("td");
      var saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "secondary-button";
      saveButton.textContent = "Update";
      saveButton.addEventListener("click", async function () {
        status.textContent = "";
        saveButton.disabled = true;
        try {
          await request("/api/admin/orders/" + order.id + "/status", {
            method: "PATCH",
            body: JSON.stringify({ status: select.value })
          });
          status.textContent = "Order #" + order.id + " updated.";
        } catch (error) {
          status.textContent = error.message;
        } finally {
          saveButton.disabled = false;
        }
      });
      actionCell.appendChild(saveButton);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
    table.append(head, body);
    container.appendChild(table);
  }

  async function loadInquiries() {
    var result = await request("/api/admin/inquiries");
    var container = $("#adminInquiries");
    container.replaceChildren();
    if (!result.inquiries.length) {
      container.textContent = "No test-drive or quote inquiries yet.";
      return;
    }

    var table = document.createElement("table");
    var head = document.createElement("thead");
    var headerRow = document.createElement("tr");
    ["Submitted", "Customer", "Model", "Inquiry", "Message", "Status", "Update"].forEach(function (label) {
      headerRow.appendChild(makeCell("th", label));
    });
    head.appendChild(headerRow);
    var body = document.createElement("tbody");
    result.inquiries.forEach(function (inquiry) {
      var row = document.createElement("tr");
      row.appendChild(makeCell("td", new Date(inquiry.createdAt).toLocaleString("en-PH")));

      var contactCell = document.createElement("td");
      contactCell.appendChild(makeCell("div", inquiry.name));
      var phoneLink = document.createElement("a");
      phoneLink.href = "tel:" + inquiry.phone.replace(/[^\d+]/g, "");
      phoneLink.textContent = inquiry.phone;
      contactCell.appendChild(phoneLink);
      if (inquiry.email) {
        var emailLink = document.createElement("a");
        emailLink.href = "mailto:" + inquiry.email;
        emailLink.textContent = inquiry.email;
        contactCell.appendChild(document.createElement("br"));
        contactCell.appendChild(emailLink);
      }
      row.appendChild(contactCell);
      row.appendChild(makeCell("td", inquiry.modelName));
      row.appendChild(makeCell("td", {
        test_drive: "Book a test drive",
        quote: "Get a quote",
        financing: "Ask about financing"
      }[inquiry.intent] || inquiry.intent));
      var messageCell = makeCell("td", inquiry.message || "—");
      messageCell.className = "inquiry-message";
      row.appendChild(messageCell);

      var statusCell = document.createElement("td");
      var select = document.createElement("select");
      ["new", "contacted", "closed"].forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === inquiry.status;
        select.appendChild(option);
      });
      statusCell.appendChild(select);
      row.appendChild(statusCell);

      var actionCell = document.createElement("td");
      var saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "secondary-button";
      saveButton.textContent = "Update";
      saveButton.addEventListener("click", async function () {
        status.textContent = "";
        saveButton.disabled = true;
        try {
          await request("/api/admin/inquiries/" + inquiry.id + "/status", {
            method: "PATCH",
            body: JSON.stringify({ status: select.value })
          });
          status.textContent = "Inquiry #" + inquiry.id + " updated.";
        } catch (error) {
          status.textContent = error.message;
        } finally {
          saveButton.disabled = false;
        }
      });
      actionCell.appendChild(saveButton);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
    table.append(head, body);
    container.appendChild(table);
  }

  async function initialize() {
    try {
      var csrf = await request("/api/auth/csrf");
      csrfToken = csrf.csrfToken;
      var account = await request("/api/auth/me");
      if (!account.user || account.user.role !== "admin") {
        window.location.href = "account.html";
        return;
      }
      await Promise.all([loadModels(), loadOrders(), loadInquiries()]);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  $("#logoutButton").addEventListener("click", async function () {
    try {
      await request("/api/auth/logout", { method: "POST" });
      window.location.href = "account.html";
    } catch (error) {
      status.textContent = error.message;
    }
  });

  initialize();
})();
