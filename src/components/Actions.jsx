import React from 'react';

const Actions = ({ onCapture, onExport, history, paused, onPause }) => (
  <div className="actions">
    <button className="action-btn primary" onClick={onCapture}>capture</button>
    <button className="action-btn green-action" onClick={onExport} disabled={!history.length}>export</button>
    <button className={`action-btn ${paused ? 'amber-action' : ''}`} onClick={onPause}>{paused ? 'resume' : 'pause'}</button>
  </div>
);

export default Actions;
