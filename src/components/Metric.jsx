import React from 'react';

const Metric = ({ name, value, unit, sub, pct, delta, sparkRef }) => (
  <div className="metric">
    <div className="metric-name">{name}</div>
    <div className="metric-num">
      {value}{unit && <span className="u"> {unit}</span>}
    </div>
    <div className="metric-sub">{sub}</div>
    <div className="bar-track"><div className={`bar-fill ${pct > 85 ? 'hot' : pct > 65 ? 'med' : ''}`} style={{ width: `${pct}%` }}></div></div>
    <div className="delta">{delta}</div>
    <div className="spark-track"><canvas className="spark" ref={sparkRef}></canvas></div>
  </div>
);

export default Metric;