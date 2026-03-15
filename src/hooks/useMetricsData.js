import { toMB, fmtMB } from '../utils/formatters.js';

export const useMetricsData = ({ currentData, prevTotal, prevCpu }) => {
  const totalMB = prevTotal;
  const cpu = currentData ? currentData.cpuUsage : null;

  const totalMetric = {
    name: "Total Memory",
    value: totalMB != null ? fmtMB(totalMB) : '—',
    unit: totalMB != null ? 'MB' : '',
    pct: 0,
    delta: (prevTotal != null && totalMB != null) ?
      (totalMB - prevTotal > 0.05 ? `+${fmtMB(totalMB - prevTotal)} MB` : totalMB - prevTotal < -0.05 ? `${fmtMB(totalMB - prevTotal)} MB` : 'stable')
      : '—'
  };

  const cpuMetric = {
    name: "CPU Usage",
    value: cpu != null ? cpu.toFixed(1) : 'N/A',
    unit: cpu != null ? '%' : '',
    pct: cpu != null ? cpu : 0,
    delta: (prevCpu != null && cpu != null) ? (cpu - prevCpu > 0.05 ? `+${(cpu - prevCpu).toFixed(1)} %` : cpu - prevCpu < -0.05 ? `${(cpu - prevCpu).toFixed(1)} %` : 'stable') : '—'
  };

  return { totalMetric, cpuMetric };
};
