import React from 'react';

const AutoCapture = ({ autoToggle, captureInterval, onToggle, onIntervalChange, cdVal }) => (
  <>
    <div className="auto-row">
      <div className="auto-text">
        <div className="auto-lbl">Auto-capture</div>
        <div className="auto-sub">every {captureInterval}s</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={autoToggle} onChange={onToggle} />
        <div className="ttrack"></div>
        <div className="tthumb"></div>
      </label>
    </div>

    <div className="interval-row">
      <div className="interval-text">
        <div className="interval-lbl">Interval (seconds)</div>
        <div className="interval-sub">1–3600 seconds</div>
      </div>
      <input
        type="number"
        className="interval-input"
        value={captureInterval}
        onChange={onIntervalChange}
        min="1"
        max="3600"
      />
    </div>

    {autoToggle && (
      <div className="cd-row show">
        <span className="cd-label">next capture</span>
        <span className="cd-val">{cdVal}</span>
      </div>
    )}
  </>
);

export default AutoCapture;
