// popup.js

const TAMTAM_DOMAIN = "https://tamma.me";

let pixelId = null;
let currentTab = null;
let mappedEvents = [];
let isMapperActive = false;
let isInjected = false;
let pixelTestPassed = false;

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
  const data = await chrome.storage.local.get(["pixelId", "mappedEvents", "mapperActive", "pixelTestPassed"]);
  pixelId = data.pixelId || null;
  mappedEvents = data.mappedEvents || [];
  isMapperActive = data.mapperActive || false;
  pixelTestPassed = data.pixelTestPassed || false;
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
  updateMapperButton();
  loadAutoInjectToggle();
  renderEventsList();
}

async function updateInjectionStatus() {
  const statusEl = document.getElementById("injectionStatus");
  const dotEl = document.getElementById("statusDot");

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: "isInjected",
    });
    isInjected = !!response?.injected;
  } catch {
    isInjected = false;
  }

  if (isInjected) {
    statusEl.textContent = "Injecte";
    statusEl.className = "injection-status injected";
    statusEl.title = "Pixel actif sur cette page";
    dotEl.className = "status-dot active";
  } else if (pixelTestPassed) {
    statusEl.textContent = "Integre";
    statusEl.className = "injection-status injected";
    statusEl.title = "Pixel actif via integration externe";
    dotEl.className = "status-dot injected";
  } else {
    statusEl.textContent = "Non injecte";
    statusEl.className = "injection-status not-injected";
    statusEl.title = "Cliquez sur Script > Injecter maintenant";
    dotEl.className = "status-dot";
  }

  updateStatusBar();
}

function updateMapperButton() {
  const btn = document.getElementById("btnActivateMapper");
  if (!btn) return;

  if (isMapperActive) {
    btn.innerHTML = '<span class="pulse-dot"></span> Mapper actif';
    btn.className = "btn btn-mapper-active";
  } else {
    btn.textContent = "Activer le mapper";
    btn.className = "btn btn-primary";
  }
}

function updateStatusBar() {
  const domain = getDomain();
  const domainEvents = mappedEvents.filter((e) => e.domain === domain);

  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step2icon = document.getElementById("step2icon");
  const step3 = document.getElementById("step3");
  const step3icon = document.getElementById("step3icon");

  if (!step1) return;

  step1.className = "status-step done";

  if (isInjected || pixelTestPassed) {
    step2.className = "status-step done";
    step2icon.textContent = "✓";
  } else {
    step2.className = "status-step";
    step2icon.textContent = "○";
  }

  if (domainEvents.length > 0) {
    step3.className = "status-step done";
    step3icon.textContent = "✓";
  } else {
    step3.className = "status-step";
    step3icon.textContent = "○";
  }
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
      <p style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center;padding:16px 0;line-height:1.6;">
        Aucun evenement configure.<br>
        Cliquez "+ Mapper un element" pour commencer.
      </p>
    `;
    updateStatusBar();
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
      }).catch(() => {});
    });
  });

  updateStatusBar();
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

  // Activate / deactivate visual mapper
  document.getElementById("btnActivateMapper")?.addEventListener("click", async () => {
    if (isMapperActive) {
      chrome.tabs.sendMessage(currentTab.id, { action: "deactivateMapper" }).catch(() => {});
      isMapperActive = false;
      await chrome.storage.local.set({ mapperActive: false });
      updateMapperButton();
    } else {
      chrome.tabs.sendMessage(currentTab.id, {
        action: "activateMapper",
        pixelId,
      }).catch(() => {});
      isMapperActive = true;
      await chrome.storage.local.set({ mapperActive: true });
      updateMapperButton();
    }
  });

  // Add event (opens mapper)
  document.getElementById("btnAddEvent")?.addEventListener("click", async () => {
    chrome.tabs.sendMessage(currentTab.id, {
      action: "activateMapper",
      pixelId,
      mode: "selectElement",
    }).catch(() => {});
    isMapperActive = true;
    await chrome.storage.local.set({ mapperActive: true });
    updateMapperButton();
  });

  // Inject now
  document.getElementById("btnInjectNow")?.addEventListener("click", async () => {
    await injectPixel();
    showTestResult("success", "Pixel injecte sur cette page.");
    setTimeout(() => updateInjectionStatus(), 500);
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
  document.getElementById("btnChangePixel")?.addEventListener("click", async () => {
    pixelId = null;
    pixelTestPassed = false;
    await chrome.storage.local.set({ pixelTestPassed: false });
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
    func: (pxId) => {
      const params = new URLSearchParams(window.location.search);
      const tmRef = params.get("tm_ref");
      if (tmRef) {
        sessionStorage.setItem("tamtam_tm_ref", tmRef);
        sessionStorage.setItem("tamtam_tm_ref_ts", Date.now().toString());
      }

      window.__tamtamInjected = true;
      window.__tamtamPixelId = pxId;
    },
    args: [pixelId],
  });
}

async function testPixel() {
  try {
    const response = await fetch(TAMTAM_DOMAIN + "/api/v1/pixel-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixel_id: pixelId }),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      showTestResult("error", "Reponse inattendue du serveur (" + response.status + ")");
      return;
    }

    const data = await response.json();

    if (response.ok && data.success) {
      pixelTestPassed = true;
      await chrome.storage.local.set({ pixelTestPassed: true });
      showTestResult("success", "Pixel actif - Latence: " + data.latency_ms + "ms");
      updateInjectionStatus();
    } else {
      pixelTestPassed = false;
      await chrome.storage.local.set({ pixelTestPassed: false });
      showTestResult("error", data.error || "Pixel ID invalide");
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
