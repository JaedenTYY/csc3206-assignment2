import cytoscape from 'cytoscape';
import Chart from 'chart.js/auto';
import { getGraphData, runAlgorithm, runAllAlgorithms } from './pyodide-client';
import { updateChartTheme } from './chart-theme';
import type { AlgorithmResult, TraceStep } from './types';

let cy: cytoscape.Core;
let currentTrace: TraceStep[] | null = null;
let currentTraceStep = 0;
let costChart: Chart | null = null;
let expandedChart: Chart | null = null;
let showAllLabels = false;
let currentMetric = 'distance';
let graphResizeObserver: ResizeObserver | null = null;

const UNITS: Record<string, string> = {
  distance: 'km',
  time: 'min',
  carbon: 'kg CO₂e'
};

const ALG_NAMES: Record<string, string> = {
  astar: 'A* Search',
  ucs: 'Uniform-Cost Search',
  gbfs: 'Greedy Best-First Search'
};

export async function initApp() {
  setupEventListeners();
  await initCytoscape();
  
  // Re-theme charts and graph on theme change
  window.addEventListener('theme-changed', (e: any) => {
    if (costChart) updateChartTheme(costChart, e.detail.isDark);
    if (expandedChart) updateChartTheme(expandedChart, e.detail.isDark);
    applyCytoscapeTheme(e.detail.isDark);
  });
}

function setupEventListeners() {
  document.getElementById('btn-run')!.addEventListener('click', () => handleRun(false));
  document.getElementById('btn-trace')!.addEventListener('click', () => handleRun(true));
  document.getElementById('btn-compare')!.addEventListener('click', handleCompare);
  document.getElementById('btn-toggle-labels')!.addEventListener('click', toggleLabels);
  
  document.getElementById('btn-prev')!.addEventListener('click', () => setTraceStep(currentTraceStep - 1));
  document.getElementById('btn-next')!.addEventListener('click', () => setTraceStep(currentTraceStep + 1));
  
  document.getElementById('metric-select')!.addEventListener('change', async (e) => {
    currentMetric = (e.target as HTMLSelectElement).value;
    try {
      await loadGraphForMetric();
    } catch (err: any) {
      console.error('Failed to load graph:', err);
    }
  });
}

async function loadGraphForMetric() {
  const data = await getGraphData(currentMetric);
  const elements: any[] = [];

  data.nodes.forEach(node => {
    const [relativeX, relativeY] = data.positions[node];
    elements.push({
      data: { id: node, label: `${node} · ${data.locations[node]}` },
      // Cytoscape's y-axis increases downwards, unlike the shared Python plot.
      position: {
        x: 80 + relativeX * 130,
        y: 80 + (3 - relativeY) * 130,
      }
    });
  });
  
  data.edges.forEach(edge => {
    elements.push({
      data: { 
        id: `${edge.source}-${edge.target}`, 
        source: edge.source, 
        target: edge.target, 
        weight: edge.cost,
        label: `${edge.cost.toFixed(2)} ${UNITS[currentMetric]}`
      }
    });
  });
  
  cy.elements().remove();
  cy.add(elements);
  updateLabelVisibility();

  const source = document.getElementById('graph-data-source');
  if (source) {
    source.textContent = currentMetric === 'carbon'
      ? `${data.source} · ${data.carbon_factor} kg CO₂e/km`
      : data.source;
  }

  requestAnimationFrame(() => {
    cy.resize();
    cy.fit(cy.elements(), 48);
  });
}

function applyCytoscapeTheme(isDark: boolean) {
  const nodeBg = isDark ? '#1E293B' : '#F1F5F9';
  const nodeBorder = isDark ? '#334155' : '#CBD5E1';
  const nodeText = isDark ? '#F8FAFC' : '#0F172A';
  
  const edgeLine = isDark ? 'rgba(148,163,184,0.15)' : '#E2E8F0';
  const edgeTextBg = isDark ? '#0F172A' : '#FFFFFF';
  const edgeText = isDark ? '#94A3B8' : '#64748B';
  
  cy.style()
    .selector('node')
    .style({
      'background-color': nodeBg,
      'border-color': nodeBorder,
      'color': nodeText,
    })
    .selector('edge')
    .style({
      'line-color': edgeLine,
      'target-arrow-color': edgeLine,
      'text-background-color': edgeTextBg,
      'color': edgeText,
    })
    .selector('edge.route')
    .style({
      'line-color': '#3B82F6',
      'target-arrow-color': '#3B82F6',
    })
    .update();
}

async function initCytoscape() {
  const isDark = document.documentElement.classList.contains('dark');
  const container = document.getElementById('cy-container')!;
  
  cy = cytoscape({
    container,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'font-size': '11px',
          'font-family': 'Inter, sans-serif',
          'font-weight': 'bold',
          'text-valign': 'bottom',
          'text-margin-y': 6,
          'width': '24px',
          'height': '24px',
          'border-width': '2px',
        }
      },
      {
        selector: 'node[id = "SU"]',
        style: {
          'background-color': '#F59E0B',
          'border-color': '#D97706',
          'width': '32px',
          'height': '32px',
        }
      },
      {
        selector: 'node.visited',
        style: {
          'background-color': '#10B981',
          'border-color': '#059669'
        }
      },
      {
        selector: 'node.current',
        style: {
          'background-color': '#3B82F6',
          'border-color': '#2563EB',
          'border-width': '3px'
        }
      },
      {
        selector: 'node.frontier',
        style: {
          'border-color': '#8B5CF6',
          'border-width': '3px',
          'border-style': 'dashed'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': '2px',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'font-size': '9px',
          'font-family': 'JetBrains Mono, monospace',
          'text-rotation': 'autorotate',
          'text-background-opacity': 1,
          'text-background-padding': '2px',
          'text-background-shape': 'roundrectangle'
        }
      },
      {
        selector: 'edge.route',
        style: {
          'width': '3px',
          'z-index': 10
        }
      },
      {
        selector: 'edge.show-label',
        style: {
          'label': 'data(label)'
        }
      }
    ],
    layout: {
      name: 'preset'
    }
  });
  
  applyCytoscapeTheme(isDark);
  try {
    await loadGraphForMetric();
    document.getElementById('cy-loading')!.style.display = 'none';
  } catch (err: any) {
    document.getElementById('cy-loading')!.innerHTML = `<span class="text-brand-red font-medium">Error loading graph: ${err.message}</span>`;
  }

  graphResizeObserver?.disconnect();
  graphResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      if (cy && !cy.destroyed()) {
        cy.resize();
        if (cy.elements().length > 0) {
          cy.fit(cy.elements(), 48);
        }
      }
    });
  });
  graphResizeObserver.observe(container);
  
  cy.on('mouseover', 'edge', (e) => {
    e.target.addClass('show-label');
  });
  cy.on('mouseout', 'edge', (e) => {
    if (!showAllLabels && !e.target.hasClass('route')) {
      e.target.removeClass('show-label');
    }
  });
}

function toggleLabels() {
  showAllLabels = !showAllLabels;
  updateLabelVisibility();
}

function updateLabelVisibility() {
  if (showAllLabels) {
    cy.edges().addClass('show-label');
  } else {
    cy.edges().removeClass('show-label');
    cy.edges('.route').addClass('show-label');
  }
}

async function handleRun(trace: boolean) {
  const algo = (document.getElementById('algo-select') as HTMLSelectElement).value;
  
  const start = performance.now();
  const res = await runAlgorithm(algo, currentMetric, trace);
  const duration = performance.now() - start;
  
  displayResults(res, duration, currentMetric);
  
  if (trace && res.trace) {
    currentTrace = res.trace;
    document.getElementById('trace-controls')!.classList.remove('hidden');
    setTraceStep(0);
  } else {
    document.getElementById('trace-controls')!.classList.add('hidden');
    currentTrace = null;
    drawFinalRoute(res.route || []);
  }
}

function displayResults(res: AlgorithmResult, duration: number, metric: string) {
  const panel = document.getElementById('results-panel')!;
  const content = document.getElementById('results-content')!;
  panel.classList.remove('hidden');
  
  if (res.error) {
    content.innerHTML = `<div class="p-3 bg-brand-red/10 text-brand-red rounded border border-brand-red/20 font-medium">Error: ${res.error}</div>`;
    return;
  }
  
  const unit = UNITS[metric];
  
  let html = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="metric-card">
        <div class="metric-label">Total Cost</div>
        <div class="metric-value text-brand-blue">${res.total_cost?.toFixed(2)} <span class="text-xs font-normal text-slate-500 dark:text-brand-muted">${unit}</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Nodes Expanded</div>
        <div class="metric-value">${res.nodes_expanded}</div>
      </div>
    </div>
    
    <div class="flex justify-between items-center text-xs text-slate-500 dark:text-brand-secondary mb-3 border-b border-slate-100 dark:border-brand-border pb-2">
      <span class="uppercase tracking-wider font-semibold">Browser Runtime</span>
      <span class="font-mono">${duration.toFixed(1)}ms</span>
    </div>
    
    <div class="text-xs text-slate-500 dark:text-brand-secondary uppercase tracking-wider font-semibold mb-2">Final Route Path</div>
    <div class="flex flex-wrap gap-1.5 items-center font-mono text-xs">
      ${res.route?.map((n, i) => {
        const isStart = n === 'SU';
        const isEnd = i === res.route!.length - 1;
        const colorClass = isStart ? 'text-brand-amber border-brand-amber/30 bg-brand-amber/10' : 
                           isEnd ? 'text-brand-emerald border-brand-emerald/30 bg-brand-emerald/10' : 
                           'text-brand-blue border-brand-blue/30 bg-brand-blue/10';
        
        return `
          <span class="inline-flex items-center px-2 py-1 rounded border ${colorClass} font-semibold">
            ${n}
          </span>
          ${i < res.route!.length - 1 ? '<span class="text-slate-300 dark:text-brand-border">→</span>' : ''}
        `;
      }).join('')}
    </div>
  `;
  
  content.innerHTML = html;
}

function drawFinalRoute(route: string[]) {
  cy.elements().removeClass('route current visited frontier');
  
  for (const node of route) {
    cy.getElementById(node).addClass('visited');
  }
  
  for (let i = 0; i < route.length - 1; i++) {
    const edgeId = `${route[i]}-${route[i+1]}`;
    cy.getElementById(edgeId).addClass('route show-label');
  }
  
  updateLabelVisibility();
}

function setTraceStep(index: number) {
  if (!currentTrace || index < 0 || index >= currentTrace.length) return;
  
  currentTraceStep = index;
  const step = currentTrace[index];
  
  document.getElementById('step-counter')!.textContent = `Step ${index + 1} / ${currentTrace.length}`;
  document.getElementById('btn-prev')!.toggleAttribute('disabled', index === 0);
  document.getElementById('btn-next')!.toggleAttribute('disabled', index === currentTrace.length - 1);
  
  // Format trace HTML
  document.getElementById('trace-details')!.innerHTML = `
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="bg-slate-50 dark:bg-brand-elevated p-2 rounded border border-slate-200 dark:border-brand-border">
        <div class="text-[10px] text-slate-500 dark:text-brand-muted uppercase tracking-wider font-semibold mb-1">Current State</div>
        <div class="font-mono text-sm text-brand-blue">${step.state.location}</div>
      </div>
      <div class="bg-slate-50 dark:bg-brand-elevated p-2 rounded border border-slate-200 dark:border-brand-border">
        <div class="text-[10px] text-slate-500 dark:text-brand-muted uppercase tracking-wider font-semibold mb-1">Visited</div>
        <div class="font-mono text-xs text-slate-700 dark:text-brand-primary truncate" title="[${step.state.visited.join(', ')}]">[${step.state.visited.join(', ')}]</div>
      </div>
    </div>
    
    <div class="flex justify-between items-center font-mono text-xs mb-3 bg-slate-50 dark:bg-brand-elevated border border-slate-200 dark:border-brand-border rounded p-2">
      <div class="flex flex-col"><span class="text-[10px] text-slate-400 dark:text-brand-muted uppercase">g(n)</span><span class="text-brand-blue">${step.g.toFixed(2)}</span></div>
      <span class="text-slate-300 dark:text-brand-border">+</span>
      <div class="flex flex-col"><span class="text-[10px] text-slate-400 dark:text-brand-muted uppercase">h(n)</span><span class="text-brand-violet">${step.h.toFixed(2)}</span></div>
      <span class="text-slate-300 dark:text-brand-border">=</span>
      <div class="flex flex-col"><span class="text-[10px] text-slate-400 dark:text-brand-muted uppercase">f(n)</span><span class="text-brand-cyan">${step.f.toFixed(2)}</span></div>
    </div>
    
    <div class="text-xs text-slate-600 dark:text-brand-secondary space-y-1 mb-3">
      <div class="flex justify-between border-b border-slate-100 dark:border-brand-border pb-1">
        <span>Priority Selected</span>
        <span class="font-mono text-brand-primary font-medium">${step.priority.toFixed(2)}</span>
      </div>
      <div class="flex justify-between pt-1">
        <span>Frontier Size</span>
        <span class="font-mono">${step.frontierSizeBefore} <span class="text-slate-400">→</span> ${step.frontierSizeAfter} <span class="text-brand-emerald ml-1">(+${step.generatedSuccessors})</span></span>
      </div>
    </div>
    
    <div class="text-[10px] text-slate-500 dark:text-brand-muted uppercase tracking-wider font-semibold mb-1">Route Context</div>
    <div class="font-mono text-[10px] text-slate-500 dark:text-brand-secondary break-all">
      ${step.routeSoFar.join(' → ')}
    </div>
  `;
  
  // Update graph
  cy.elements().removeClass('route current visited show-label frontier');
  
  for (const node of step.state.visited) {
    cy.getElementById(node).addClass('visited');
  }
  cy.getElementById(step.state.location).addClass('current visited');
  
  for (let i = 0; i < step.routeSoFar.length - 1; i++) {
    const edgeId = `${step.routeSoFar[i]}-${step.routeSoFar[i+1]}`;
    cy.getElementById(edgeId).addClass('route show-label');
  }
  
  updateLabelVisibility();
}

async function handleCompare() {
  const res = await runAllAlgorithms(currentMetric);
  
  const panel = document.getElementById('comparison-panel')!;
  panel.classList.remove('hidden');
  
  const tbody = document.getElementById('compare-tbody')!;
  tbody.innerHTML = '';
  
  const labels = Object.keys(res).map(k => ALG_NAMES[k]);
  const costs = Object.values(res).map(r => r.total_cost || 0);
  const expanded = Object.values(res).map(r => r.nodes_expanded || 0);
  
  const minCost = Math.min(...costs);
  
  Object.entries(res).forEach(([key, data]) => {
    const isOptimal = data.total_cost === minCost;
    
    tbody.innerHTML += `
      <tr class="border-b border-slate-100 dark:border-brand-border last:border-0 hover:bg-slate-50 dark:hover:bg-brand-elevated transition-colors">
        <td class="px-4 py-3 font-semibold text-slate-800 dark:text-brand-primary">${ALG_NAMES[key]}</td>
        <td class="px-4 py-3 font-mono">${data.total_cost?.toFixed(2)} <span class="text-xs text-slate-500">${UNITS[currentMetric]}</span></td>
        <td class="px-4 py-3 font-mono">${data.nodes_expanded}</td>
        <td class="px-4 py-3">
          ${isOptimal 
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">Optimal</span>' 
            : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-amber/10 text-brand-amber border border-brand-amber/20">Suboptimal</span>'}
        </td>
      </tr>
    `;
  });
  
  updateCharts(labels, costs, expanded, currentMetric);
}

function updateCharts(labels: string[], costs: number[], expanded: number[], metric: string) {
  if (costChart) costChart.destroy();
  if (expandedChart) expandedChart.destroy();
  
  const isDark = document.documentElement.classList.contains('dark');
  
  const ctxCost = (document.getElementById('cost-chart') as HTMLCanvasElement).getContext('2d')!;
  costChart = new Chart(ctxCost, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Total Cost (${UNITS[metric]})`,
        data: costs,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Total Route Cost' } } }
  });
  
  const ctxExpanded = (document.getElementById('expanded-chart') as HTMLCanvasElement).getContext('2d')!;
  expandedChart = new Chart(ctxExpanded, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Nodes Expanded',
        data: expanded,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Nodes Expanded' } } }
  });
  
  updateChartTheme(costChart, isDark);
  updateChartTheme(expandedChart, isDark);
}
