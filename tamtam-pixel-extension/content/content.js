// content/content.js — injected into every page

let mapperActive = false;
let pixelId = null;
let hoveredElement = null;
let overlay = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "isInjected":
      sendResponse({ injected: !!window.__tamtamInjected });
      break;

    case "activateMapper":
      pixelId = message.pixelId;
      activateVisualMapper(message.mode);
      sendResponse({ ok: true });
      break;

    case "deactivateMapper":
      deactivateVisualMapper();
      sendResponse({ ok: true });
      break;

    case "refreshEvents":
      injectMappedEvents(message.events);
      sendResponse({ ok: true });
      break;

    case "autoInject":
      autoInjectPixel(message.pixelId);
      sendResponse({ ok: true });
      break;
  }
  return true;
});

function activateVisualMapper(mode) {
  if (mapperActive) return;
  mapperActive = true;

  const toolbar = document.createElement("div");
  toolbar.id = "tamtam-mapper-toolbar";
  toolbar.innerHTML = `
    <div class="tt-toolbar-inner">
      <div class="tt-logo">Tamtam Pixel Mapper</div>
      <div class="tt-instructions">
        Cliquez sur un element pour lui assigner un evenement
      </div>
      <button id="tt-mapper-close">Terminer</button>
    </div>
  `;
  document.body.appendChild(toolbar);

  overlay = document.createElement("div");
  overlay.id = "tamtam-highlight-overlay";
  document.body.appendChild(overlay);

  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleElementClick, true);
  document.addEventListener("keydown", handleEscKey, true);

  document.getElementById("tt-mapper-close")?.addEventListener("click", deactivateVisualMapper);
}

function handleEscKey(e) {
  if (e.key === "Escape") {
    deactivateVisualMapper();
  }
}

function handleMouseOver(e) {
  if (!mapperActive) return;
  if (e.target.closest("#tamtam-mapper-toolbar") || e.target.closest("#tamtam-event-modal")) return;

  hoveredElement = e.target;
  hoveredElement.classList.add("tt-hover");

  const rect = hoveredElement.getBoundingClientRect();
  if (overlay) {
    overlay.style.top = (rect.top + window.scrollY) + "px";
    overlay.style.left = (rect.left + window.scrollX) + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.display = "block";
  }
}

function handleMouseOut(e) {
  if (!mapperActive) return;
  if (hoveredElement) {
    hoveredElement.classList.remove("tt-hover");
  }
  if (overlay) {
    overlay.style.display = "none";
  }
}

function handleElementClick(e) {
  if (!mapperActive) return;
  if (document.getElementById("tamtam-event-modal")) return;
  if (e.target.closest("#tamtam-event-modal")) return;
  if (e.target.closest("#tamtam-mapper-toolbar")) return;

  e.preventDefault();
  e.stopPropagation();

  showEventAssignModal(e.target);
}

function showEventAssignModal(element) {
  document.getElementById("tamtam-event-modal")?.remove();

  const selector = getCssSelector(element);
  const elementPreview = (element.textContent?.trim().slice(0, 40) || element.tagName.toLowerCase());
  const tagName = element.tagName.toLowerCase();

  const modal = document.createElement("div");
  modal.id = "tamtam-event-modal";
  modal.innerHTML = `
    <div class="tt-modal-backdrop"></div>
    <div class="tt-modal-box">
      <div class="tt-modal-header">
        <span class="tt-modal-title">Assigner un evenement</span>
        <button id="tt-modal-close" class="tt-modal-close">x</button>
      </div>

      <div class="tt-modal-element">
        <span class="tt-modal-element-tag">${escapeHtml(tagName)}</span>
        <span class="tt-modal-element-text">"${escapeHtml(elementPreview)}"</span>
      </div>

      <div class="tt-modal-label">Type d'evenement</div>
      <div class="tt-event-options">
        <button class="tt-event-option" data-event="sign_up">sign_up</button>
        <button class="tt-event-option" data-event="activation">activation</button>
        <button class="tt-event-option" data-event="purchase">purchase</button>
        <button class="tt-event-option" data-event="lead">lead</button>
        <button class="tt-event-option" data-event="page_view">page_view</button>
        <button class="tt-event-option" data-event="subscription">subscription</button>
      </div>

      <div class="tt-modal-label" style="margin-top:12px">
        Valeur (FCFA, optionnel)
      </div>
      <input
        type="number"
        id="tt-event-value"
        placeholder="0"
        class="tt-modal-input"
      />

      <div class="tt-modal-actions">
        <button id="tt-modal-cancel" class="tt-btn-cancel">Annuler</button>
        <button id="tt-modal-save" class="tt-btn-save" disabled>
          Enregistrer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Suspend mapper listeners so they don't intercept modal clicks
  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("click", handleElementClick, true);
  if (hoveredElement) {
    hoveredElement.classList.remove("tt-hover");
  }
  if (overlay) {
    overlay.style.display = "none";
  }

  function resumeMapper() {
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);
  }

  function closeModal() {
    modal.remove();
    resumeMapper();
  }

  let selectedEvent = null;

  modal.querySelectorAll(".tt-event-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".tt-event-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedEvent = btn.dataset.event;
      document.getElementById("tt-modal-save").disabled = false;
    });
  });

  document.getElementById("tt-modal-save")?.addEventListener("click", async () => {
    if (!selectedEvent) return;

    const value = parseFloat(document.getElementById("tt-event-value").value) || 0;
    const eventConfig = {
      selector,
      eventType: selectedEvent,
      value,
      pixelId,
      domain: window.location.hostname,
    };

    const data = await chrome.storage.local.get("mappedEvents");
    const events = data.mappedEvents || [];
    events.push(eventConfig);
    await chrome.storage.local.set({ mappedEvents: events });

    attachEventListener(element, eventConfig);

    modal.remove();
    resumeMapper();
    showMapperToast('Evenement "' + selectedEvent + '" mappe');
  });

  document.getElementById("tt-modal-close")?.addEventListener("click", closeModal);
  document.getElementById("tt-modal-cancel")?.addEventListener("click", closeModal);
  modal.querySelector(".tt-modal-backdrop")?.addEventListener("click", closeModal);
}

function attachEventListener(element, config) {
  element.setAttribute("data-tamtam-event", config.eventType);

  element.addEventListener("click", () => {
    const tmRef =
      sessionStorage.getItem("tamtam_tm_ref") ||
      new URLSearchParams(window.location.search).get("tm_ref");

    fetch("https://tamma.me/api/pixel/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tamtam-Key": config.pixelId,
      },
      body: JSON.stringify({
        event: config.eventType,
        tm_ref: tmRef || undefined,
        value: config.value,
        currency: "XOF",
        event_id: config.eventType + "_" + Date.now(),
        source: "chrome_extension_mapper",
        page_url: window.location.href,
      }),
    }).then(() => {
      chrome.runtime.sendMessage({
        action: "pixelEventFired",
        event: {
          type: config.eventType,
          value: config.value,
          selector: config.selector,
          page: window.location.href,
        },
      });
    }).catch(() => {});
  });
}

function injectMappedEvents(events) {
  document.querySelectorAll("[data-tamtam-event]").forEach((el) => {
    el.removeAttribute("data-tamtam-event");
  });

  events.forEach((config) => {
    try {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach((el) => attachEventListener(el, config));
    } catch {
      // invalid selector
    }
  });
}

function deactivateVisualMapper() {
  mapperActive = false;
  document.getElementById("tamtam-mapper-toolbar")?.remove();
  document.getElementById("tamtam-highlight-overlay")?.remove();
  document.getElementById("tamtam-event-modal")?.remove();
  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("click", handleElementClick, true);
  document.removeEventListener("keydown", handleEscKey, true);
  if (hoveredElement) {
    hoveredElement.classList.remove("tt-hover");
    hoveredElement = null;
  }
  overlay = null;
}

function autoInjectPixel(pxId) {
  if (window.__tamtamInjected) return;

  const script = document.createElement("script");
  script.id = "tamtam-pixel-script";
  script.src = "https://tamma.me/api/pixel/pixel.js";
  script.setAttribute("data-pixel-id", pxId);
  script.async = true;
  document.head.appendChild(script);

  window.__tamtamInjected = true;
  window.__tamtamPixelId = pxId;
}

function showMapperToast(message) {
  document.getElementById("tamtam-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "tamtam-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function getCssSelector(element) {
  if (element.id) return "#" + CSS.escape(element.id);

  const path = [];
  let el = element;
  while (el && el !== document.body) {
    let selector = el.tagName.toLowerCase();

    if (el.id) {
      path.unshift("#" + CSS.escape(el.id));
      break;
    }

    if (el.className && typeof el.className === "string") {
      const classes = el.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith("tt-"))
        .slice(0, 2);
      if (classes.length > 0) {
        selector += "." + classes.map((c) => CSS.escape(c)).join(".");
      }
    }

    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === el.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += ":nth-of-type(" + index + ")";
      }
    }

    path.unshift(selector);
    el = el.parentElement;
  }

  return path.join(" > ");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// On page load: capture tm_ref and restore mapped events
(async () => {
  const params = new URLSearchParams(window.location.search);
  const tmRef = params.get("tm_ref");
  if (tmRef) {
    sessionStorage.setItem("tamtam_tm_ref", tmRef);
    sessionStorage.setItem("tamtam_tm_ref_ts", Date.now().toString());
  }

  const domain = window.location.hostname;
  const data = await chrome.storage.local.get([
    "autoInjectDomains",
    "mappedEvents",
    "pixelId",
  ]);

  if (data.autoInjectDomains?.includes(domain) && data.pixelId) {
    autoInjectPixel(data.pixelId);
  }

  if (data.mappedEvents?.length) {
    const domainEvents = data.mappedEvents.filter((e) => e.domain === domain);
    if (domainEvents.length > 0) {
      injectMappedEvents(domainEvents);
    }
  }
})();
