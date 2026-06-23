const CONFIG = {
  // Replace with the boutique WhatsApp number in international format without +, spaces or hyphens.
  // Example: "919052588888"
  whatsappNumber: "919000000000",

  // Step 3: Paste Google Apps Script Web App URL here after lead-sheet setup.
  googleSheetEndpoint: "",
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function trackEvent(eventName, payload = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
}

function buildWhatsAppUrl(message) {
  const number = CONFIG.whatsappNumber || "919000000000";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  return fields.reduce((acc, field) => {
    acc[field] = params.get(field) || "";
    return acc;
  }, {});
}

function applyUtmToForm(form) {
  const utm = getUtmParams();
  Object.entries(utm).forEach(([key, value]) => {
    const input = form.elements[key];
    if (input) input.value = value;
  });
  if (form.elements.page_url) form.elements.page_url.value = window.location.href;
}

function formDataToObject(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function buildLeadMessage(data) {
  return [
    "Hi Kalpvastra Boutique, I want a consultation.",
    "",
    `Name: ${data.name || ""}`,
    `Phone: ${data.phone || ""}`,
    `Location: ${data.location || ""}`,
    `Occasion: ${data.occasion || ""}`,
    `Event Date: ${data.event_date || ""}`,
    `Requirement: ${data.requirement || ""}`,
    `Budget: ${data.budget || ""}`,
    `Dream Look: ${data.message || ""}`,
  ].join("\n");
}

async function submitLead(form, data) {
  const endpoint = form.dataset.endpoint || CONFIG.googleSheetEndpoint;
  if (!endpoint) {
    localStorage.setItem("kalpvastra_last_lead", JSON.stringify({ ...data, submitted_at: new Date().toISOString() }));
    return { storedLocally: true };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, submitted_at: new Date().toISOString() }),
  });

  return response;
}

function initNavigation() {
  const toggle = qs(".nav-toggle");
  const menu = qs("#nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  qsa("a", menu).forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initWhatsAppLinks() {
  const defaultMessage = "Hi Kalpvastra Boutique, I want to book a bridal outfit consultation.";
  qsa(".whatsapp-link").forEach((link) => {
    link.href = buildWhatsAppUrl(defaultMessage);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.addEventListener("click", () => trackEvent("whatsapp_click", { location: link.textContent.trim() }));
  });
}

function initTrackedClicks() {
  qsa("[data-track]").forEach((el) => {
    el.addEventListener("click", () => trackEvent(el.dataset.track));
  });
}

function initLeadForm() {
  const form = qs("#lead-form");
  if (!form) return;

  applyUtmToForm(form);
  const status = qs("#form-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = qs("button[type='submit']", form);
    const data = formDataToObject(form);
    trackEvent("lead_form_submit", {
      requirement: data.requirement,
      location: data.location,
      budget: data.budget,
    });

    try {
      if (submitButton) submitButton.disabled = true;
      if (status) {
        status.className = "form-status";
        status.textContent = "Submitting your request...";
      }

      await submitLead(form, data);
      const message = buildLeadMessage(data);
      sessionStorage.setItem("kalpvastra_whatsapp_message", message);

      if (!CONFIG.googleSheetEndpoint && !form.dataset.endpoint) {
        window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
      }

      const redirectUrl = new URL(form.action, window.location.href);
      redirectUrl.searchParams.set("lead", "success");
      window.location.href = redirectUrl.toString();
    } catch (error) {
      console.error(error);
      if (status) {
        status.className = "form-status error";
        status.textContent = "Something went wrong. Please try WhatsApp.";
      }
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function initThankYouPage() {
  const savedMessage = sessionStorage.getItem("kalpvastra_whatsapp_message");
  if (!savedMessage) return;
  qsa(".thank-you-page .whatsapp-link").forEach((link) => {
    link.href = buildWhatsAppUrl(savedMessage);
  });
  trackEvent("generate_lead", { source: "thank_you_page" });
}

initNavigation();
initWhatsAppLinks();
initTrackedClicks();
initLeadForm();
initThankYouPage();
