import './style.css';
import { initPyodide } from './pyodide-client';
import { initApp } from './app';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="bg-slate-900 text-white p-6 shadow-md">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">House Visit Tour Using A* Search</h1>
        <p class="text-slate-400 text-sm mt-1">Interactive AI Search Algorithm Demonstration</p>
      </div>
      <div id="status-badge" class="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
        Initializing...
      </div>
    </div>
  </header>
  
  <main class="flex-grow max-w-7xl mx-auto w-full p-6 grid gap-6 grid-cols-1 lg:grid-cols-3">
    
    <!-- Left Column: Controls & Stats -->
    <div class="lg:col-span-1 flex flex-col gap-6">
      <section id="control-panel" class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 opacity-50 pointer-events-none transition-opacity">
        <h2 class="font-semibold text-lg mb-4 text-slate-800">Runner Controls</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Algorithm</label>
            <select id="algo-select" class="w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
              <option value="astar">A* Search</option>
              <option value="ucs">Uniform-Cost Search</option>
              <option value="gbfs">Greedy Best-First Search</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Optimization Metric</label>
            <select id="metric-select" class="w-full rounded-md border-slate-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
              <option value="distance">Driving distance (km)</option>
              <option value="time">Driving time (min)</option>
              <option value="carbon">Carbon emissions (kg CO₂e)</option>
            </select>
          </div>
          
          <div class="pt-2 flex gap-2">
            <button id="btn-run" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              Run
            </button>
            <button id="btn-trace" class="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              Step-by-Step
            </button>
          </div>
          
          <div class="pt-2">
            <button id="btn-compare" class="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 rounded-md font-medium transition-colors">
              Compare All Algorithms
            </button>
          </div>
        </div>
      </section>
      
      <section id="results-panel" class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hidden">
        <h2 class="font-semibold text-lg mb-4 text-slate-800">Results</h2>
        <div id="results-content" class="space-y-3 text-sm">
          <!-- Populated by JS -->
        </div>
      </section>
      
      <section id="trace-controls" class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hidden">
        <h2 class="font-semibold text-lg mb-4 text-slate-800">Trace Player</h2>
        
        <div class="flex items-center justify-between mb-4">
          <button id="btn-prev" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50">Prev</button>
          <span id="step-counter" class="font-medium text-slate-600">Step 0 / 0</span>
          <button id="btn-next" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50">Next</button>
        </div>
        
        <div class="bg-slate-50 p-3 rounded border border-slate-100 font-mono text-xs overflow-x-auto" id="trace-details">
        </div>
      </section>
    </div>
    
    <!-- Right Column: Visualization & Comparisons -->
    <div class="lg:col-span-2 flex flex-col gap-6">
      
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden" style="min-height: 500px;">
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 class="font-semibold text-slate-800">Graph Visualization</h2>
          <div class="flex gap-2">
             <button id="btn-toggle-labels" class="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">Toggle Labels</button>
          </div>
        </div>
        <div id="cy-container" class="flex-grow w-full relative">
          <!-- Cytoscape renders here -->
          <div id="cy-loading" class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <span class="text-slate-500 font-medium">Initializing graph...</span>
          </div>
        </div>
      </section>
      
      <section id="comparison-panel" class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hidden">
        <h2 class="font-semibold text-lg mb-4 text-slate-800">Algorithm Comparison</h2>
        
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th class="px-4 py-3">Algorithm</th>
                <th class="px-4 py-3">Cost</th>
                <th class="px-4 py-3">Expanded</th>
                <th class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody id="compare-tbody">
            </tbody>
          </table>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="border border-slate-100 p-2 rounded">
            <canvas id="cost-chart"></canvas>
          </div>
          <div class="border border-slate-100 p-2 rounded">
            <canvas id="expanded-chart"></canvas>
          </div>
        </div>
      </section>
      
    </div>
  </main>
`;

const statusBadge = document.getElementById('status-badge')!;

initPyodide((status) => {
  statusBadge.textContent = status;
  if (status === 'Ready') {
    statusBadge.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30";
    document.getElementById('control-panel')!.classList.remove('opacity-50', 'pointer-events-none');
    initApp();
  }
});
