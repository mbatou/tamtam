// popup.js

const TAMTAM_DOMAIN = "https://tamma.me";

let pixelId = null;
let currentTab = null;
let mappedEvents = [];

document.addEventListener("DOMContentLoaded", async () => {
  currentTab = await getCurrentTab();
  await loadState();
  updateUI();
  setupEventListeners();
});

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadState() {
  const data = await chrome.storage.local.get(["pixelId", "mappedEvents"]);
  pixelId = data.pixelId || null;
  mappedEvents = data.mappedEvents || [];
}

async function saveState() {
  await chrome.storage.local.set({ pixelId, mappedEvents });
}

function updateUI() {
  if (!pixelId) {
    showView("viewSetup");
    return;
  }

  showView("viewMain");

  try {
    const domain = new URL(currentTab.url).hostname;
    document.getElementById("siteDomain").textContent = domain;
  } catch {
    document.getElementById("siteDomain").textContent = "—";
  }
  document.getElementById("pixelIdDisplay").textContent = pixelId;

  updateInjectionStatus();
  loadAutoInjectToggle();
  renderEventsList();
}

function updateInjectionStatus() {
  chrome.tabs.sendMessage(currentTab.id, { action: "isInjected" }, (response) => {
    const statusEl = document.getElementById("injectionStatus");
    const dotEl = document.getElementById("statusDot");

    if (chrome.runtime.lastError || !response) {
      statusEl.textContent = "Non injecte";
      statusEl.className = "injection-status not-injected";
      dotEl.className = "status-dot";
      return;
    }

    if (response.injected) {
      statusEl.textContent = "Injecte";
      statusEl.className = "injection-status injected";
      dotEl.className = "status-dot injected";
    } else {
      statusEl.textContent = "Non injecte";
      statusEl.className = "injection-status not-injected";
      dotEl.className = "status-dot";
    }
  });
}

async function loadAutoInjectToggle() {
  try {
    const domain = new URL(currentTab.url).hostname;
    const data = await chrome.storage.local.get("autoInjectDomains");
    const domains = data.autoInjectDomains || [];
    document.getElementById("toggleAutoInject").checked = domains.includes(domain);
  } catch {
    // non-http tab
  }
}

function renderEventsList() {
  const list = document.getElementById("eventsList");
  const domain = getDomain();

  const domainEvents = mappedEvents.filter((e) => e.domain === domain);

  if (domainEvents.length === 0) {
    list.innerHTML = `
      <p style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center;padding:16px 0;">
        Aucun evenement configure.<br>
        Cliquez sur "Mapper un element".
      </p>
    `;
    return;
  }

  list.innerHTML = domainEvents
    .map((event, i) => {
      const globalIndex = mappedEvents.indexOf(event);
      return `
    <div class="event-item">
      <div class="event-item-left">
        <span class="event-item-name">${escapeHtml(event.eventType)}</span>
        <span class="event-item-selector">${escapeHtml(event.selector)}</span>
      </div>
      <button class="event-item-delete" data-index="${globalIndex}">x</button>
    </div>
  `;
    })
    .join("");

  list.querySelectorAll(".event-item-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      mappedEvents.splice(index, 1);
      saveState();
      renderEventsList();
      chrome.tabs.sendMessage(currentTab.id, {
        action: "refreshEvents",
        events: mappedEvents.filter((e) => e.domain === domain),
      });
    });
  });
}

function getDomain() {
  try {
    return new URL(currentTab.url).hostname;
  } catch {
    return "";
  }
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(viewId)?.classList.remove("hidden");
}

function setupEventListeners() {
  // Save Pixel ID
  document.getElementById("btnSavePixelId")?.addEventListener("click", async () => {
    const input = document.getElementById("pixelIdInput").value.trim();
    if (!input.startsWith("px_")) {
      showTestResult("error", "ID invalide. Format: px_xxxxxxxxxxxxxxxx");
      return;
    }
    pixelId = input;
    await saveState();
    updateUI();
  });

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
      tab.classList.add("active");
      const tabId = "tab" + capitalize(tab.dataset.tab);
      document.getElementById(tabId)?.classList.remove("hidden");
    });
  });

  // Activate visual mapper
  document.getElementById("btnActivateMapper")?.addEventListener("click", async () => {
    chrome.tabs.sendMessage(currentTab.id, {
      action: "activateMapper",
      pixelId,
    });
    window.close();
  });

  // Add event (opens mapper)
  document.getElementById("btnAddEvent")?.addEventListener("click", async () => {
    chrome.tabs.sendMessage(currentTab.id, {
      action: "activateMapper",
      pixelId,
      mode: "selectElement",
    });
    window.close();
  });

  // Inject now
  document.getElementById("btnInjectNow")?.addEventListener("click", async () => {
    await injectPixel();
    setTimeout(() => updateInjectionStatus(), 500);
    showTestResult("success", "Pixel injecte sur cette page.");
  });

  // Test pixel
  document.getElementById("btnTestPixel")?.addEventListener("click", async () => {
    await testPixel();
  });

  // Auto inject toggle
  document.getElementById("toggleAutoInject")?.addEventListener("change", async (e) => {
    try {
      const domain = new URL(currentTab.url).hostname;
      const data = await chrome.storage.local.get("autoInjectDomains");
      const autoInjectDomains = data.autoInjectDomains || [];

      if (e.target.checked) {
        if (!autoInjectDomains.includes(domain)) {
          autoInjectDomains.push(domain);
        }
      } else {
        const idx = autoInjectDomains.indexOf(domain);
        if (idx > -1) autoInjectDomains.splice(idx, 1);
      }

      await chrome.storage.local.set({ autoInjectDomains });
    } catch {
      // non-http tab
    }
  });

  // Change pixel ID
  document.getElementById("btnChangePixel")?.addEventListener("click", () => {
    pixelId = null;
    saveState();
    showView("viewSetup");
  });

  // Open dashboard
  document.getElementById("btnOpenDashboard")?.addEventListener("click", () => {
    chrome.tabs.create({ url: TAMTAM_DOMAIN + "/dashboard/developers" });
  });
}

async function injectPixel() {
  await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: (pxId, domain) => {
      document.querySelector("#tamtam-pixel-script")?.remove();

      const script = document.createElement("script");
      script.id = "tamtam-pixel-script";
      script.src = domain + "/api/pixel/pixel.js";
      script.setAttribute("data-pixel-id", pxId);
      script.async = true;
      document.head.appendChild(script);

      const params = new URLSearchParams(window.location.search);
      const tmRef = params.get("tm_ref");
      if (tmRef) {
        sessionStorage.setItem("tamtam_tm_ref", tmRef);
        sessionStorage.setItem("tamtam_tm_ref_ts", Date.now().toString());
      }

      window.__tamtamInjected = true;
      window.__tamtamPixelId = pxId;
    },
    args: [pixelId, TAMTAM_DOMAIN],
  });
}

async function testPixel() {
  const testEventId = "ext_test_" + Date.now();
  const startTime = Date.now();

  try {
    const response = await fetch(TAMTAM_DOMAIN + "/api/pixel/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tamtam-Key": pixelId,
      },
      body: JSON.stringify({
        event: "test",
        event_id: testEventId,
        value: 0,
        currency: "XOF",
        source: "chrome_extension",
      }),
    });

    const latency = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.success) {
      showTestResult("success", "Pixel actif - Latence: " + latency + "ms");
    } else {
      showTestResult("error", "Erreur: " + (data.error || "Pixel ID invalide"));
    }
  } catch (err) {
    showTestResult("error", "Erreur reseau: " + err.message);
  }
}

function showTestResult(type, message) {
  const el = document.getElementById("testResult");
  el.className = "test-result " + type;
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
