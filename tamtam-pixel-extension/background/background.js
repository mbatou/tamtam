// background/background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pixelEventFired") {
    chrome.storage.local.get("eventHistory", (data) => {
      const history = data.eventHistory || [];
      history.unshift({
        ...message.event,
        timestamp: new Date().toISOString(),
        tabUrl: sender.tab?.url,
      });
      chrome.storage.local.set({ eventHistory: history.slice(0, 50) });
    });
  }
  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const url = new URL(tab.url);
    if (!url.protocol.startsWith("http")) return;

    const domain = url.hostname;
    const data = await chrome.storage.local.get(["autoInjectDomains", "pixelId", "mappedEvents"]);

    if (data.pixelId && data.autoInjectDomains?.includes(domain)) {
      chrome.tabs.sendMessage(tabId, {
        action: "autoInject",
        pixelId: data.pixelId,
      }).catch(() => {});
    }

    if (data.mappedEvents?.length) {
      const domainEvents = data.mappedEvents.filter((e) => e.domain === domain);
      if (domainEvents.length > 0) {
        chrome.tabs.sendMessage(tabId, {
          action: "refreshEvents",
          events: domainEvents,
        }).catch(() => {});
      }
    }
  } catch {
    // non-http URL
  }
});
