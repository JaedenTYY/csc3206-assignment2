import './style.css';
import { initPyodide } from './pyodide-client';
import { initApp } from './app';
import { initTheme, toggleTheme } from './theme';

initTheme();

// SVG icons for theme toggle
const sunIcon = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
const moonIcon = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('theme-toggle')!.innerHTML = isDark ? sunIcon : moonIcon;
}

document.getElementById('theme-toggle')!.addEventListener('click', () => {
  toggleTheme();
  updateThemeIcon();
});
updateThemeIcon();

document.querySelector<HTMLDivElement>('#app-workspace')!.innerHTML = `
  <div class="grid gap-6 grid-cols-1 lg:grid-cols-12 relative">
    
    <!-- Left Column: Controls & Stats -->
    <div class="lg:col-span-4 flex flex-col gap-6">
      <section id="control-panel" class="panel opacity-50 pointer-events-none transition-opacity">
        <h2 class="section-title">Runner Controls</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-brand-secondary uppercase tracking-wider mb-2">Algorithm</label>
            <select id="algo-select" class="input-control">
              <option value="astar">A* Search</option>
              <option value="ucs">Uniform-Cost Search</option>
              <option value="gbfs">Greedy Best-First Search</option>
            </select>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-brand-secondary uppercase tracking-wider mb-2">Optimization Metric</label>
            <select id="metric-select" class="input-control">
              <option value="distance">Driving distance (km)</option>
              <option value="time">Driving time (min)</option>
              <option value="carbon">Carbon emissions (kg CO₂e)</option>
            </select>
          </div>
          
          <div class="pt-2 flex gap-3">
            <button id="btn-run" class="btn-primary">
              Run Complete
            </button>
            <button id="btn-trace" class="btn-secondary">
              Step-by-Step
            </button>
          </div>
          
          <div class="pt-2">
            <button id="btn-compare" class="btn-neutral">
              Compare All Algorithms
            </button>
          </div>
        </div>
      </section>
      
      <section id="results-panel" class="panel hidden">
        <h2 class="section-title">Execution Results</h2>
        <div id="results-content" class="space-y-4 text-sm">
          <!-- Populated by JS -->
        </div>
      </section>
      
      <section id="trace-controls" class="panel hidden border-t-4 border-t-brand-cyan">
        <h2 class="section-title flex items-center justify-between">
          <span>Search Inspector</span>
          <span id="step-counter" class="text-xs font-mono font-normal bg-brand-elevated px-2 py-1 rounded text-brand-secondary">Step 0 / 0</span>
        </h2>
        
        <div class="flex items-center gap-2 mb-4">
          <button id="btn-prev" class="btn-ghost flex-1">&larr; Prev</button>
          <button id="btn-next" class="btn-ghost flex-1">Next &rarr;</button>
        </div>
        
        <div id="trace-details" class="space-y-3">
          <!-- Populated by JS -->
        </div>
      </section>
    </div>
    
    <!-- Right Column: Visualization & Comparisons -->
    <div class="lg:col-span-8 flex flex-col gap-6">
      
      <section class="panel-elevated flex flex-col overflow-hidden p-0">
        <div class="p-4 border-b border-slate-200 dark:border-brand-border flex justify-between items-center bg-white dark:bg-brand-surface">
          <div>
            <h2 class="font-semibold text-slate-800 dark:text-brand-primary flex items-center gap-2">
              <svg class="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Graph Visualization
            </h2>
            <p id="graph-data-source" class="mt-1 text-xs text-slate-500 dark:text-brand-secondary">Assignment 1 Table 1</p>
          </div>
          <div class="flex gap-2">
             <button id="btn-toggle-labels" class="btn-ghost text-xs">Toggle Edge Labels</button>
          </div>
        </div>
        <div id="graph-viewport" class="relative w-full h-[500px] md:h-[560px] min-h-[420px]">
          <div id="cy-container" class="absolute inset-0 w-full h-full bg-slate-50 dark:bg-brand-bg/50"></div>
          <div id="cy-loading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-brand-bg/80 z-10 backdrop-blur-sm transition-opacity">
            <span class="text-slate-500 dark:text-brand-secondary font-medium font-mono text-sm flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
              Initializing Graph...
            </span>
          </div>
        </div>
      </section>
      
      <section id="comparison-panel" class="panel hidden">
        <h2 class="section-title">Algorithm Analytical Comparison</h2>
        
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-slate-500 dark:text-brand-secondary uppercase bg-slate-50 dark:bg-brand-elevated">
              <tr>
                <th class="px-4 py-3 rounded-tl">Algorithm</th>
                <th class="px-4 py-3">Cost</th>
                <th class="px-4 py-3">Nodes Expanded</th>
                <th class="px-4 py-3 rounded-tr">Status</th>
              </tr>
            </thead>
            <tbody id="compare-tbody" class="text-slate-800 dark:text-brand-primary">
            </tbody>
          </table>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="border border-slate-200 dark:border-brand-border p-3 rounded-xl bg-white dark:bg-brand-bg/30">
            <canvas id="cost-chart"></canvas>
          </div>
          <div class="border border-slate-200 dark:border-brand-border p-3 rounded-xl bg-white dark:bg-brand-bg/30">
            <canvas id="expanded-chart"></canvas>
          </div>
        </div>
      </section>
      
    </div>
  </div>
`;

const statusBadge = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;

initPyodide((status) => {
  statusText.textContent = status;
  if (status === 'Ready') {
    statusBadge.classList.remove('bg-brand-amber', 'animate-pulse');
    statusBadge.classList.add('bg-brand-emerald');
    statusText.classList.remove('text-brand-amber');
    statusText.classList.add('text-brand-emerald');
    
    document.getElementById('control-panel')!.classList.remove('opacity-50', 'pointer-events-none');
    initApp();
  } else if (status.startsWith('Error')) {
    statusBadge.classList.remove('bg-brand-amber', 'animate-pulse');
    statusBadge.classList.add('bg-brand-red');
    statusText.classList.remove('text-brand-amber');
    statusText.classList.add('text-brand-red');
    const cyLoading = document.getElementById('cy-loading');
    if (cyLoading) {
      cyLoading.innerHTML = `<span class="text-brand-red font-medium">Failed to initialize Python WASM runtime: ${status}</span>`;
    }
  }
});

// Load test results
async function loadTestDashboard() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}test-results.json`);
    const data = await res.json();
    document.getElementById('test-dashboard')!.innerHTML = `
      <div class="metric-card">
        <div class="metric-label">Status</div>
        <div class="text-xl font-bold text-brand-emerald flex items-center gap-1">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
          ${data.workflow_status.toUpperCase()}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tests Passed</div>
        <div class="metric-value text-slate-800 dark:text-brand-primary">${data.passed_tests} / ${data.total_tests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Branch Coverage</div>
        <div class="metric-value text-slate-800 dark:text-brand-primary">${data.coverage_percent}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Deployment Check</div>
        <div class="metric-value text-slate-800 dark:text-brand-primary text-sm mt-1">Python ${data.python_version}</div>
      </div>
    `;
  } catch (err) {
    document.getElementById('test-dashboard')!.innerHTML = '<div class="col-span-4 text-brand-red text-sm font-medium p-4 bg-brand-red/10 rounded">Test artifact will be generated automatically during CI deployment.</div>';
  }
}
loadTestDashboard();
