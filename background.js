// background.js - Service Worker

const ALARM_NAME = "auto-capture";
const HISTORY_LIMIT = 100;
let CAPTURE_INTERVAL_MINUTES = 30; // default

// Load interval from storage
chrome.storage.local.get(['captureInterval'], (result) => {
  if (result.captureInterval) {
    CAPTURE_INTERVAL_MINUTES = result.captureInterval;
  }
});

// CPU tracking
let processCpuCache = null; // null = not yet populated by onUpdated
let prevCpuInfo = null;     // for system-wide fallback
const numCores = self.navigator?.hardwareConcurrency || 1;

// chrome.processes.onUpdated fires every ~1s with accurate per-process CPU.
// Registering a listener causes Chrome to start computing CPU deltas internally.
if (chrome.processes?.onUpdated) {
  chrome.processes.onUpdated.addListener(processes => {
    processCpuCache = processes;
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) await captureAndStore(tabs[0]);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getMemoryInfo") {
    getTabInfo(message.tabId).then(sendResponse);
    return true;
  }
  if (message.action === "startAutoCapture") {
    const interval = message.interval || CAPTURE_INTERVAL_MINUTES;
    CAPTURE_INTERVAL_MINUTES = interval;
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
    chrome.storage.local.set({ autoCapture: true, captureInterval: interval });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "stopAutoCapture") {
    chrome.alarms.clear(ALARM_NAME);
    chrome.storage.local.set({ autoCapture: false });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "getHistory") {
    chrome.storage.local.get(["captureHistory"], (r) => {
      sendResponse({ history: r.captureHistory || [] });
    });
    return true;
  }
  if (message.action === "clearHistory") {
    chrome.storage.local.set({ captureHistory: [] });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "updateInterval") {
    CAPTURE_INTERVAL_MINUTES = message.interval;
    chrome.storage.local.set({ captureInterval: message.interval });
    chrome.alarms.get(ALARM_NAME, (alarm) => {
      if (alarm) {
        chrome.alarms.clear(ALARM_NAME);
        chrome.alarms.create(ALARM_NAME, { periodInMinutes: CAPTURE_INTERVAL_MINUTES });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

function calcCpuUsage(prev, curr) {
  if (!prev || !curr) return null;
  let totalDelta = 0, idleDelta = 0;
  const n = Math.min(prev.processors.length, curr.processors.length);
  for (let i = 0; i < n; i++) {
    const p = prev.processors[i].usage;
    const c = curr.processors[i].usage;
    totalDelta += (c.user + c.kernel + c.idle) - (p.user + p.kernel + p.idle);
    idleDelta  += c.idle - p.idle;
  }
  if (totalDelta === 0) return null;
  return parseFloat((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(1));
}

async function getCpuUsage() {
  // Prefer browser-total CPU from onUpdated cache (Chrome/Edge Canary with processes API).
  // proc.cpu is % of one core, so divide by numCores to get % of all cores combined.
  if (processCpuCache !== null) {
    let total = 0;
    Object.values(processCpuCache).forEach(p => {
      if (typeof p.cpu === 'number') total += p.cpu;
    });
    return parseFloat((total / numCores).toFixed(1));
  }
  // Fallback: system-wide CPU via chrome.system.cpu
  try {
    const curr = await chrome.system.cpu.getInfo();
    const usage = calcCpuUsage(prevCpuInfo, curr);
    prevCpuInfo = curr;
    return usage;
  } catch (_) {
    return null;
  }
}

async function getTabInfo(tabId) {
  try {
    // executeScript returns InjectionResult[] — destructure the first result directly
    const [pageResult] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const legacyMem = performance.memory;
        const memory = legacyMem ? {
          totalBytes: legacyMem.totalJSHeapSize,
          source: 'legacy',
        } : null;
        const nav = performance.getEntriesByType("navigation")[0] || {};
        return {
          memory,
          resourceCount: performance.getEntriesByType("resource").length,
          loadTime:      nav.loadEventEnd || 0,
          domNodes:      document.querySelectorAll("*").length,
        };
      },
    });

    const cpuUsage = await getCpuUsage();
    return { success: true, data: { ...pageResult.result, cpuUsage, cpuType: 'system-wide' } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function captureAndStore(tab) {
  const info = await getTabInfo(tab.id);
  if (!info.success) return;
  const result = await chrome.storage.local.get(["captureHistory"]);
  const history = result.captureHistory || [];
  history.unshift({
    timestamp: Date.now(),
    tabId:     tab.id,
    tabUrl:    tab.url,
    tabTitle:  tab.title,
    data:      info.data,
  });
  if (history.length > HISTORY_LIMIT) history.splice(HISTORY_LIMIT);
  await chrome.storage.local.set({ captureHistory: history });
}
