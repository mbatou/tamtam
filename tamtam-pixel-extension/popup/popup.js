// popup.js

const TAMTAM_DOMAIN = "https://tamma.me";

let pixelId = null;
let currentTab = null;
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
  const data = await chrome.storage.local.get(["pixelId", "pixelTestPassed"]);
  pixelId = data.pixelId || null;
  pixelTestPassed = data.pixelTestPassed || false;

  // Clean up state left behind by the removed visual event mapper.
  chrome.storage.local.remove([
    "mappedEvents",
    "mapperActive",
    "eventHistory",
    "autoInjectDomains",
  ]);
}

async function saveState() {
  await chrome.storage.local.set({ pixelId });
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
}

async function updateInjectionStatus() {
  const statusEl = document.getElementById("injectionStatus");
  const dotEl = document.getElementById("statusDot");

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => !!window.__tamtamInjected,
    });
    isInjected = !!result?.result;
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
    statusEl.title = "Cliquez sur Injecter maintenant";
    dotEl.className = "status-dot";
  }

  updateStatusBar();
}

function updateStatusBar() {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step2icon = document.getElementById("step2icon");

  if (!step1) return;

  step1.className = "status-step done";

  if (isInjected || pixelTestPassed) {
    step2.className = "status-step done";
    step2icon.textContent = "✓";
  } else {
    step2.className = "status-step";
    step2icon.textContent = "○";
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
