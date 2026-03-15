import React from 'react';

const StatsStrip = ({ currentData, ticks }) => (
  <div className="stats-strip">
    <div className="stat">
      <div className="stat-lbl">DOM</div>
      <div className="stat-val">{currentData.domNodes?.toLocaleString() || '—'}</div>
    </div>
    <div className="stat">
      <div className="stat-lbl">Resources</div>
      <div className="stat-val">{currentData.resourceCount?.toLocaleString() || '—'}</div>
    </div>
    <div className="stat">
      <div className="stat-lbl">Load ms</div>
      <div className="stat-val">{currentData.loadTime ? Math.round(currentData.loadTime) : '—'}</div>
    </div>
    <div className="stat">
      <div className="stat-lbl">Ticks</div>
      <div className="stat-val">{ticks}</div>
    </div>
  </div>
);

export default StatsStrip;
