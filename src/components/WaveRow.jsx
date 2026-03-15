import React from 'react';

const WaveRow = React.forwardRef((props, ref) => (
  <div className="wave-row">
    <div className="row-label">60s memory trace</div>
    <canvas className="wave" ref={ref}></canvas>
  </div>
));

export default WaveRow;
