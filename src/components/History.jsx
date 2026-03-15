import React from 'react';
import { fmtTime, fmtHost, toMB, fmtMB } from '../utils/formatters.js';

const History = ({ history, onExport, onClear }) => (
  <>
    <div className="hist-head">
      <span className="hist-title">Log</span>
      <div className="hist-actions">
        <button className="ghost-btn xl-btn" onClick={onExport} disabled={!history.length}>export .xlsx</button>
        <button className="ghost-btn" onClick={onClear}>clear</button>
      </div>
    </div>
    <div className="hist-list">
      {history.length ? history.map(e => {
        const mem = e.data?.memory;
        const mb = mem?.totalBytes != null ? toMB(mem.totalBytes) : null;
        const cpu = e.data?.cpuUsage != null ? e.data.cpuUsage : null;
        return (
          <div key={e.timestamp} className="hist-row">
            <span className="hist-t">{fmtTime(e.timestamp)}</span>
            <span className="hist-u">{fmtHost(e.tabUrl)}</span>
            <span className="hist-m">{mb !== null ? fmtMB(mb) + ' MB' : '—'}</span>
            <span className="hist-cpu">{cpu !== null ? cpu.toFixed(1) + '%' : '—'}</span>
          </div>
        );
      }) : <div className="empty-hist">no captures yet</div>}
    </div>
  </>
);

export default History;
