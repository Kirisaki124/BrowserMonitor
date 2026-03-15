import React from 'react';
import { fmtUptime, fmtHost } from '../utils/formatters.js';

const TabStrip = ({ tab, startTs }) => (
  <div className="tab-strip">
    <img className="favicon" src={tab?.favIconUrl || ''} alt="" />
    <span className="tab-host">{tab ? fmtHost(tab.url) : '—'}</span>
    <span className="uptime-val">{fmtUptime(Date.now() - startTs)}</span>
  </div>
);

export default TabStrip;
