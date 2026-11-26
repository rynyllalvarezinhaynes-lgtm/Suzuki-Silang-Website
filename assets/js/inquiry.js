(function () {
  "use strict";

  var form = document.getElementById("inquiryForm");
  if (!form) return;

  var modelSelect = document.getElementById("inquiryModel");
  var status = document.getElementById("inquiryStatus");
  var submitButton = form.querySelector('button[type="submit"]');
  var csrfToken = "";

  async function readResponse(response) {
    var payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("The server returned an unreadable response.");
    }
    if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }

  function showError(message) {
    status.textContent = message;
    status.classList.add("form-error");
  }

  async function loadForm() {
    try {
      var responses = await Promise.all([
        fetch("/api/auth/csrf", { credentials: "same-origin", headers: { Accept: "application/json" } }),
        fetch("/api/models", { credentials: "same-origin", headers: { Accept: "application/json" } })
      ]);
      var csrf = await readResponse(responses[0]);
      var catalog = await readResponse(responses[1]);
      if (!catalog.models.length) throw new Error("There are no Suzuki models available for quote requests right now.");

      csrfToken = csrf.csrfToken;
      var requestedModel = new URLSearchParams(window.location.search).get("model");
      modelSelect.replaceChildren(new Option("Select a Suzuki model", ""));
      catalog.models.forEach(function (model) {
        modelSelect.add(new Option(model.name, model.slug));
      });
      if (requestedModel && catalog.models.some(function (model) { return model.slug === requestedModel; })) {
        modelSelect.value = requestedModel;
      }

      modelSelect.disabled = false;
      submitButton.disabled = false;
      status.textContent = "";
      status.classList.remove("form-error");
    } catch (error) {
      showError(error.message || "The quote request service is unavailable. Please call or email Suzuki Auto Silang.");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    status.classList.remove("form-error");
    status.textContent = "Sending your quote request...";
    var values = new FormData(form);

    try {
      var response = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          name: values.get("name"),
          phone: values.get("phone"),
          email: values.get("email"),
          modelSlug: values.get("modelSlug"),
          intent: "quote",
          message: "Quote request submitted from the Suzuki Auto Silang homepage."
        })
      });
      await readResponse(response);
      form.reset();
      status.textContent = "Thank you. Your quote request has been sent to Suzuki Auto Silang.";
    } catch (error) {
      showError(error.message || "Your request could not be sent. Please try again or contact Suzuki Auto Silang.");
    } finally {
      submitButton.disabled = false;
    }
  });

  loadForm();
})();
