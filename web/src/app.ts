import cytoscape from 'cytoscape';
import Chart from 'chart.js/auto';
import { getGraphData, runAlgorithm, runAllAlgorithms } from './pyodide-client';
import type { AlgorithmResult, TraceStep } from './types';

let cy: cytoscape.Core;
let currentTrace: TraceStep[] | null = null;
let currentTraceStep = 0;
let costChart: Chart | null = null;
let expandedChart: Chart | null = null;
let showAllLabels = false;

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
}

function setupEventListeners() {
  document.getElementById('btn-run')!.addEventListener('click', () => handleRun(false));
  document.getElementById('btn-trace')!.addEventListener('click', () => handleRun(true));
  document.getElementById('btn-compare')!.addEventListener('click', handleCompare);
  document.getElementById('btn-toggle-labels')!.addEventListener('click', toggleLabels);
  
  document.getElementById('btn-prev')!.addEventListener('click', () => setTraceStep(currentTraceStep - 1));
  document.getElementById('btn-next')!.addEventListener('click', () => setTraceStep(currentTraceStep + 1));
  
  document.getElementById('metric-select')!.addEventListener('change', async () => {
    await loadGraphForMetric();
  });
}

async function loadGraphForMetric() {
  const metric = (document.getElementById('metric-select') as HTMLSelectElement).value;
  const _data = await getGraphData(metric);
  
  const elements: any[] = [];
  
  // Approximate positions for the layout
  const positions: Record<string, {x: number, y: number}> = {
    "SU": { x: 300, y: 300 },
    "M1": { x: 100, y: 150 },
    "M2": { x: 200, y: 100 },
    "M3": { x: 400, y: 150 },
    "M4": { x: 500, y: 250 },
    "M5": { x: 450, y: 400 },
    "M6": { x: 150, y: 400 }
  };
  
  const labels: Record<string, string> = {
    "SU": "Sunway University",
    "M1": "Tanamera",
    "M2": "USJ Heights",
    "M3": "Bandar Sunway",
    "M4": "USJ 1",
    "M5": "Taman Eng Ann",
    "M6": "Petaling Jaya"
  };
  
  _data.nodes.forEach(node => {
    elements.push({
      data: { id: node, label: labels[node] || node },
      position: positions[node] || { x: Math.random()*500, y: Math.random()*500 }
    });
  });
  
  _data.edges.forEach(edge => {
    elements.push({
      data: { 
        id: `${edge.source}-${edge.target}`, 
        source: edge.source, 
        target: edge.target, 
        weight: edge.cost,
        label: `${edge.cost.toFixed(2)} ${UNITS[metric]}`
      }
    });
  });
  
  cy.elements().remove();
  cy.add(elements);
  updateLabelVisibility();
}

async function initCytoscape() {
  cy = cytoscape({
    container: document.getElementById('cy-container'),
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#94a3b8',
          'label': 'data(label)',
          'color': '#1e293b',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-valign': 'bottom',
          'text-margin-y': 5,
          'width': '30px',
          'height': '30px',
          'border-width': '2px',
          'border-color': '#fff'
        }
      },
      {
        selector: 'node[id = "SU"]',
        style: {
          'background-color': '#f59e0b',
          'width': '40px',
          'height': '40px',
        }
      },
      {
        selector: 'node.visited',
        style: {
          'background-color': '#10b981',
          'border-color': '#059669'
        }
      },
      {
        selector: 'node.current',
        style: {
          'background-color': '#3b82f6',
          'border-color': '#1d4ed8',
          'border-width': '4px'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': '2px',
          'line-color': '#cbd5e1',
          'target-arrow-color': '#cbd5e1',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'font-size': '10px',
          'text-rotation': 'autorotate',
          'text-background-opacity': 1,
          'text-background-color': '#fff',
          'text-background-padding': '2px',
          'color': '#64748b'
        }
      },
      {
        selector: 'edge.route',
        style: {
          'width': '4px',
          'line-color': '#3b82f6',
          'target-arrow-color': '#3b82f6',
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
  
  await loadGraphForMetric();
  document.getElementById('cy-loading')!.style.display = 'none';
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
  const metric = (document.getElementById('metric-select') as HTMLSelectElement).value;
  
  const start = performance.now();
  const res = await runAlgorithm(algo, metric, trace);
  const duration = performance.now() - start;
  
  displayResults(res, duration, metric);
  
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
    content.innerHTML = `<div class="p-3 bg-red-50 text-red-700 rounded border border-red-200">Error: ${res.error}</div>`;
    return;
  }
  
  const unit = UNITS[metric];
  
  let html = `
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="bg-slate-50 p-2 rounded border border-slate-100">
        <div class="text-xs text-slate-500">Total Cost</div>
        <div class="font-bold text-lg text-slate-800">${res.total_cost?.toFixed(2)} ${unit}</div>
      </div>
      <div class="bg-slate-50 p-2 rounded border border-slate-100">
        <div class="text-xs text-slate-500">Nodes Expanded</div>
        <div class="font-bold text-lg text-slate-800">${res.nodes_expanded}</div>
      </div>
    </div>
    
    <div class="text-xs text-slate-500 mb-2">Browser Observed Runtime: ${duration.toFixed(1)}ms</div>
    
    <div class="font-medium text-slate-700 mb-1">Route:</div>
    <div class="flex flex-wrap gap-1 mb-3">
      ${res.route?.map((n, i) => `
        <span class="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
          ${n}
        </span>
        ${i < res.route!.length - 1 ? '<span class="text-slate-400">→</span>' : ''}
      `).join('')}
    </div>
  `;
  
  content.innerHTML = html;
}

function drawFinalRoute(route: string[]) {
  cy.elements().removeClass('route current visited');
  
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
  
  // Render details
  document.getElementById('trace-details')!.innerHTML = `
    <div><strong>Location:</strong> ${step.state.location}</div>
    <div><strong>Visited:</strong> [${step.state.visited.join(', ')}]</div>
    <div class="mt-1">
      <span class="text-blue-600">g(n): ${step.g.toFixed(2)}</span> | 
      <span class="text-teal-600">h(n): ${step.h.toFixed(2)}</span> | 
      <span class="text-purple-600">f(n): ${step.f.toFixed(2)}</span>
    </div>
    <div><strong>Priority Selected:</strong> ${step.priority.toFixed(2)}</div>
    <div><strong>Frontier:</strong> ${step.frontierSizeBefore} -> expanded ${step.generatedSuccessors} -> ${step.frontierSizeAfter}</div>
    <div class="mt-1"><strong>Route so far:</strong> ${step.routeSoFar.join(' → ')}</div>
  `;
  
  // Update graph
  cy.elements().removeClass('route current visited show-label');
  
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
  const metric = (document.getElementById('metric-select') as HTMLSelectElement).value;
  const res = await runAllAlgorithms(metric);
  
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
      <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 font-medium text-slate-800">${ALG_NAMES[key]}</td>
        <td class="px-4 py-3">${data.total_cost?.toFixed(2)} ${UNITS[metric]}</td>
        <td class="px-4 py-3">${data.nodes_expanded}</td>
        <td class="px-4 py-3">
          ${isOptimal 
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Optimal</span>' 
            : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Suboptimal</span>'}
        </td>
      </tr>
    `;
  });
  
  updateCharts(labels, costs, expanded, metric);
}

function updateCharts(labels: string[], costs: number[], expanded: number[], metric: string) {
  if (costChart) costChart.destroy();
  if (expandedChart) expandedChart.destroy();
  
  const ctxCost = (document.getElementById('cost-chart') as HTMLCanvasElement).getContext('2d')!;
  costChart = new Chart(ctxCost, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Total Cost (${UNITS[metric]})`,
        data: costs,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
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
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Nodes Expanded' } } }
  });
}
