import Chart from 'chart.js/auto';

export function updateChartTheme(chart: Chart | null, isDark: boolean) {
  if (!chart) return;
  
  const textColor = isDark ? '#94A3B8' : '#64748B'; // secondary/muted text
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.1)';
  
  if (chart.options.scales?.x) {
    if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
    if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
  }
  
  if (chart.options.scales?.y) {
    if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
    if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
  }
  
  if (chart.options.plugins?.title) {
    chart.options.plugins.title.color = isDark ? '#F8FAFC' : '#0F172A';
  }
  
  if (chart.options.plugins?.tooltip) {
    chart.options.plugins.tooltip.backgroundColor = isDark ? '#0B1220' : '#FFFFFF';
    chart.options.plugins.tooltip.titleColor = isDark ? '#F8FAFC' : '#0F172A';
    chart.options.plugins.tooltip.bodyColor = isDark ? '#94A3B8' : '#64748B';
    chart.options.plugins.tooltip.borderColor = isDark ? '#1E293B' : '#E2E8F0';
    chart.options.plugins.tooltip.borderWidth = 1;
  }
  
  chart.update();
}
