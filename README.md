# Browser Monitor

A Chrome/Edge extension that monitors CPU and memory usage of your browser in real time, with auto-capture and Excel export.

---

## Requirements

**This extension requires a Canary browser build.**

- [Chrome Canary](https://www.google.com/chrome/canary/) or [Edge Canary](https://www.microsoft.com/en-us/edge/download/insider)

The `chrome.processes` API used for accurate per-browser CPU tracking is only available in Canary builds. On stable Chrome/Edge, the extension falls back to system-wide CPU (which includes all running applications, not just the browser).

---

## Features

- **Total Memory** — JS heap size of the current tab via `performance.memory`
- **CPU Usage** — Total browser CPU across all processes (requires Canary)
- **Live sparklines** — Visual history of memory and CPU over time
- **Waveform** — Memory usage wave animation
- **Auto-capture** — Snapshot at a custom interval (seconds)
- **Persistent window** — Popout to a standalone window that follows tab switches
- **Export to Excel** — Memory and CPU charts with history log
- **Capture log** — Timestamped snapshots with memory and CPU per entry

---

## Installation

1. Clone or download this repository
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open your **Canary** browser and go to `edge://extensions` or `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select this project folder

---

## Development

```bash
npm install       # install dependencies
npm run build     # production build → dist/popup.js
```

Source files are in `src/`. The entry point is `src/index.js`. Webpack outputs to `dist/`.

---

## Permissions

| Permission | Purpose |
|---|---|
| `tabs` | Read active tab URL and title |
| `scripting` | Inject script to read `performance.memory` |
| `storage` | Persist capture history and settings |
| `alarms` | Schedule auto-capture |
| `processes` | Per-process CPU usage (Canary only) |
| `system.cpu` | System-wide CPU fallback |
| `host_permissions: <all_urls>` | Allow script injection on any page |
