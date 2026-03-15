import React, { useState, useEffect, useRef } from 'react';
import './App.css';

import Header from './components/Header.jsx';
import TabStrip from './components/TabStrip.jsx';
import Metric from './components/Metric.jsx';
import WaveRow from './components/WaveRow.jsx';
import StatsStrip from './components/StatsStrip.jsx';
import Actions from './components/Actions.jsx';
import AutoCapture from './components/AutoCapture.jsx';
import ErrorRow from './components/ErrorRow.jsx';
import History from './components/History.jsx';

import { toMB, fmtMB, push } from './utils/formatters.js';
import { HISTORY_LIMIT, DEFAULT_CAPTURE_INTERVAL } from './utils/constants.js';
import { drawSpark, drawWave } from './utils/canvasUtils.js';
import { useMetricsData } from './hooks/useMetricsData.js';

const isStandalone = new URLSearchParams(window.location.search).get('mode') === 'standalone';

function App() {
  const [tab, setTab] = useState(null);
  const [paused, setPaused] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [startTs] = useState(Date.now());
  const [history, setHistory] = useState([]);
  const [prevTotal, setPrevTotal] = useState(null);
  const [prevCpu, setPrevCpu] = useState(null);
  const [totalHist, setTotalHist] = useState([]);
  const [waveHist, setWaveHist] = useState([]);
  const [cpuHist, setCpuHist] = useState([]);
  const [status, setStatus] = useState('—');
  const [error, setError] = useState('');
  const [autoToggle, setAutoToggle] = useState(false);
  const [cdVal, setCdVal] = useState('—');
  const [currentData, setCurrentData] = useState({});
  const [captureInterval, setCaptureInterval] = useState(DEFAULT_CAPTURE_INTERVAL);
  const [toast, setToast] = useState('');

  const sparkTotalRef = useRef();
  const sparkCpuRef = useRef();
  const waveCanvasRef = useRef();
  const countdownRef = useRef(null);
  const toastTimerRef = useRef(null);
  const autoCaptureRef = useRef(null);
  const handleCaptureRef = useRef(null);

  // Fetch metrics
  const fetchMetrics = async () => {
    if (!tab || paused) return null;
    return new Promise(res => chrome.runtime.sendMessage({ action: 'getMemoryInfo', tabId: tab.id }, res));
  };

  // Render metrics
  const render = (data) => {
    setError('');
    setStatus('live');
    setCurrentData(data);

    if (!data.memory) {
      return;
    }

    const totalMB = toMB(data.memory.totalBytes);

    setTotalHist(prev => { const newArr = [...prev]; push(newArr, totalMB); return newArr; });
    setWaveHist(prev => { const newArr = [...prev]; push(newArr, totalMB); return newArr; });

    // CPU
    const cpu = data.cpuUsage;
    if (cpu !== null && cpu !== undefined) {
      setCpuHist(prev => { const newArr = [...prev]; push(newArr, cpu); return newArr; });
      setPrevCpu(cpu);
    }

    setPrevTotal(totalMB);
  };

  // Tick
  const tick = async () => {
    if (paused) return;
    setTicks(prev => prev + 1);
    const r = await fetchMetrics();
    if (!r || !r.success) {
      setStatus('error');
      setError(r?.error || 'cannot access this tab');
      return;
    }
    render(r.data);
  };

  // Init tab
  useEffect(() => {
    const initTab = async () => {
      if (isStandalone) {
        // In a detached window, currentWindow is the popup itself — query last focused normal browser window
        const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
        const active = win?.tabs?.find(t => t.active);
        setTab(active || null);
      } else {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        setTab(tabs[0] || null);
      }
    };
    initTab();

    if (!isStandalone) return;

    // In standalone mode, follow the user as they switch tabs/windows
    const onTabActivated = async ({ tabId }) => {
      try {
        const t = await chrome.tabs.get(tabId);
        if (!t.url?.startsWith('chrome-extension://')) setTab(t);
      } catch (_) {}
    };

    const onWindowFocused = async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      try {
        const win = await chrome.windows.get(windowId, { populate: true });
        if (win.type !== 'normal') return;
        const active = win.tabs?.find(t => t.active);
        if (active) setTab(active);
      } catch (_) {}
    };

    chrome.tabs.onActivated.addListener(onTabActivated);
    chrome.windows.onFocusChanged.addListener(onWindowFocused);
    return () => {
      chrome.tabs.onActivated.removeListener(onTabActivated);
      chrome.windows.onFocusChanged.removeListener(onWindowFocused);
    };
  }, []);

  // Load history
  useEffect(() => {
    const loadHist = () => {
      chrome.runtime.sendMessage({ action: 'getHistory' }, r => {
        setHistory(r?.history || []);
      });
    };
    loadHist();
  }, []);

  // Auto toggle
  useEffect(() => {
    chrome.storage.local.get(['autoCapture', 'autoCaptureStarted', 'captureInterval'], r => {
      if (r.autoCapture) {
        setAutoToggle(true);
        startCd(r.autoCaptureStarted || Date.now(), r.captureInterval || DEFAULT_CAPTURE_INTERVAL);
      }
      if (r.captureInterval) {
        setCaptureInterval(r.captureInterval);
      }
    });
  }, []);

  // Interval for ticks
  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tab, paused]);

  // Auto-capture via setInterval (supports second-level intervals, unlike chrome.alarms)
  useEffect(() => {
    if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    autoCaptureRef.current = null;
    if (autoToggle && captureInterval >= 1) {
      autoCaptureRef.current = setInterval(() => {
        handleCaptureRef.current?.();
      }, captureInterval * 1000);
    }
    return () => {
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    };
  }, [autoToggle, captureInterval]);

  // Cleanup countdown, toast, and auto-capture timers on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    };
  }, []);

  // Draw canvases when data changes
  useEffect(() => {
    // Always draw the wave (shows baseline when no data)
    drawWave(waveCanvasRef.current, waveHist);

    if (currentData.memory) {
      drawSpark(sparkTotalRef.current, totalHist, '#2563eb');
    }

    // CPU spark is independent of memory data
    if (currentData.cpuUsage !== null && currentData.cpuUsage !== undefined) {
      const cpu = currentData.cpuUsage;
      drawSpark(sparkCpuRef.current, cpuHist, cpu > 80 ? '#dc2626' : cpu > 50 ? '#d97706' : '#111111');
    }
  }, [totalHist, waveHist, cpuHist, currentData]);

  // Countdown (interval is in seconds)
  const startCd = (since, interval) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const intervalMs = interval * 1000;
    countdownRef.current = setInterval(() => {
      const rem = intervalMs - ((Date.now() - since) % intervalMs);
      const m = Math.floor(rem / 60000), s = Math.floor((rem % 60000) / 1000);
      setCdVal(m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`);
    }, 1000);
  };

  const stopCd = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCdVal('—');
  };

  // Handlers
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2000);
  };

  const handleCapture = () => {
    if (!tab || Object.keys(currentData).length === 0) return;
    const newHistory = [{ timestamp: Date.now(), tabId: tab.id, tabUrl: tab.url, tabTitle: tab.title, data: currentData }, ...history];
    if (newHistory.length > HISTORY_LIMIT) newHistory.splice(HISTORY_LIMIT);
    setHistory(newHistory);
    chrome.storage.local.set({ captureHistory: newHistory });
    showToast('captured');
  };

  const handlePause = () => {
    setPaused(!paused);
    setStatus(paused ? 'live' : 'paused');
  };

  const handleAutoToggle = () => {
    const newState = !autoToggle;
    setAutoToggle(newState);
    if (newState) {
      const now = Date.now();
      chrome.storage.local.set({ autoCapture: true, autoCaptureStarted: now, captureInterval });
      startCd(now, captureInterval);
    } else {
      chrome.storage.local.set({ autoCapture: false });
      chrome.storage.local.remove('autoCaptureStarted');
      stopCd();
    }
  };

  const handleExport = () => {
    if (!history.length) return;

    const pts = [...history].reverse().map(e => {
      const mem = e.data?.memory;
      const totalRaw = mem ? (mem.totalBytes ?? null) : null;
      const u = totalRaw != null ? parseFloat(fmtMB(toMB(totalRaw))) : null;
      const cpu = (e.data?.cpuUsage != null) ? parseFloat(e.data.cpuUsage.toFixed(1)) : null;
      return {
        'Timestamp': new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19),
        'Tab Title': e.tabTitle || '',
        'URL': e.tabUrl || '',
        'Total Memory (MB)': u,
        'CPU (%)': cpu,
        'DOM Nodes': e.data?.domNodes ?? null,
        'Resources': e.data?.resourceCount ?? null,
        'Load Time (ms)': e.data?.loadTime ? parseFloat(e.data.loadTime.toFixed(1)) : null,
      };
    });

    const n = pts.length;
    const wb = XLSX.utils.book_new();

    // Memory Data Sheet with Chart
    const memoryData = pts.map(p => ({
      'Timestamp': p['Timestamp'],
      'Total Memory (MB)': p['Total Memory (MB)'],
    }));
    const wsMemory = XLSX.utils.json_to_sheet(memoryData);
    wsMemory['!cols'] = [{wch:22},{wch:18}];
    wsMemory['!freeze'] = true;
    wsMemory['!chart'] = { chartType: 'memory', dataRows: memoryData.length, sheetName: 'Memory Data' };
    XLSX.utils.book_append_sheet(wb, wsMemory, 'Memory Data');

    // CPU Data Sheet with Chart
    const cpuData = pts.map(p => ({
      'Timestamp': p['Timestamp'],
      'CPU (%)': p['CPU (%)'],
    })).filter(p => p['CPU (%)'] !== null);
    const wsCpu = XLSX.utils.json_to_sheet(cpuData);
    wsCpu['!cols'] = [{wch:22},{wch:10}];
    wsCpu['!freeze'] = true;
    wsCpu['!chart'] = { chartType: 'cpu', dataRows: cpuData.length, sheetName: 'CPU Data' };
    XLSX.utils.book_append_sheet(wb, wsCpu, 'CPU Data');

    // Full Data Sheet
    const ws = XLSX.utils.json_to_sheet(pts);
    ws['!cols'] = [{wch:22},{wch:26},{wch:44},{wch:18},{wch:10},{wch:12},{wch:12},{wch:16}];
    ws['!freeze'] = true;
    XLSX.utils.book_append_sheet(wb, ws, 'All Data');

    const valid = pts.filter(p => p['Total Memory (MB)'] !== null);
    const validCpu = pts.filter(p => p['CPU (%)'] !== null);
    const avg = (arr, k) => arr.length ? (arr.reduce((s,r) => s + r[k], 0) / arr.length).toFixed(2) : 'N/A';
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Total captures', n],
      ['With memory data', valid.length],
      ['With CPU data', validCpu.length],
      ['From', pts.length ? pts[0]['Timestamp'] : ''],
      ['To', pts.length ? pts[pts.length-1]['Timestamp'] : ''],
      ['Avg total memory (MB)', parseFloat(avg(valid,'Total Memory (MB)')) || avg(valid,'Total Memory (MB)')],
      ['Max total memory (MB)', valid.length ? Math.max(...valid.map(p=>p['Total Memory (MB)'])) : 'N/A'],
      ['Avg CPU (%)', parseFloat(avg(validCpu,'CPU (%)')) || avg(validCpu,'CPU (%)')],
      ['Max CPU (%)', validCpu.length ? Math.max(...validCpu.map(p=>p['CPU (%)'])) : 'N/A'],
    ]);
    ws2['!cols'] = [{wch:24},{wch:28}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `pulse-${stamp}.xlsx`);
    showToast('exported');
  };

  const handleIntervalChange = (e) => {
    const newInterval = parseInt(e.target.value, 10);
    if (newInterval >= 1 && newInterval <= 3600) {
      setCaptureInterval(newInterval);
      chrome.storage.local.set({ captureInterval: newInterval });
      if (autoToggle) {
        const now = Date.now();
        chrome.storage.local.set({ autoCaptureStarted: now });
        startCd(now, newInterval);
      }
    }
  };

  const handleClear = () => {
    setHistory([]);
    chrome.runtime.sendMessage({ action: 'clearHistory' });
  };

  const handlePopout = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?mode=standalone'),
      type: 'popup',
      width: 380,
      height: 620,
    });
    window.close();
  };

  const { totalMetric, cpuMetric } = useMetricsData({ currentData, prevTotal, prevCpu });

  // Always point to the latest handleCapture so the auto-capture setInterval avoids stale closures
  handleCaptureRef.current = handleCapture;

  return (
    <div className={`app${isStandalone ? ' standalone' : ''}`}>
      <Header status={status} onPopout={handlePopout} isStandalone={isStandalone} />
      <TabStrip tab={tab} startTs={startTs} />
      <div className="metrics">
        <Metric {...totalMetric} sparkRef={sparkTotalRef} />
        <Metric {...cpuMetric} sparkRef={sparkCpuRef} />
      </div>
      <WaveRow ref={waveCanvasRef} />
      <StatsStrip currentData={currentData} ticks={ticks} />
      <Actions
        onCapture={handleCapture}
        onExport={handleExport}
        history={history}
        paused={paused}
        onPause={handlePause}
      />
      <AutoCapture
        autoToggle={autoToggle}
        captureInterval={captureInterval}
        cdVal={cdVal}
        onToggle={handleAutoToggle}
        onIntervalChange={handleIntervalChange}
      />
      {error && <ErrorRow error={error} />}
      {toast && <div className="toast">{toast}</div>}
      <History
        history={history}
        onExport={handleExport}
        onClear={handleClear}
      />
    </div>
  );
}

export default App;
