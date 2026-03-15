import React from 'react';

const Header = ({ status, onPopout, isStandalone }) => (
  <header>
    <span className="wordmark">pulse</span>
    <div className="header-right">
      {!isStandalone && (
        <button className="popout-btn" onClick={onPopout} title="Open in persistent window">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 10L10 1M10 1H5M10 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div className="status-pill">
        <div className={`dot ${status === 'live' ? 'live' : status === 'error' ? 'err' : status === 'paused' ? 'pause' : ''}`}></div>
        <span className="status-label">{status}</span>
      </div>
    </div>
  </header>
);

export default Header;
