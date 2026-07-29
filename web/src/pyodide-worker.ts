import initPy from '../../src/__init__.py?raw';
import webAdapterPy from '../../src/web_adapter.py?raw';
import astarPy from '../../src/algorithms/astar.py?raw';
import ucsPy from '../../src/algorithms/ucs.py?raw';
import gbfsPy from '../../src/algorithms/gbfs.py?raw';
import graphPy from '../../src/data/graph.py?raw';
import algInitPy from '../../src/algorithms/__init__.py?raw';
import dataInitPy from '../../src/data/__init__.py?raw';

declare let loadPyodide: any;
let pyodideReadyPromise: Promise<void> | null = null;
let pyodide: any = null;

(self as any).importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

async function init() {
  self.postMessage({ type: 'STATUS', payload: 'Loading Python runtime...' });
  pyodide = await loadPyodide();
  
  self.postMessage({ type: 'STATUS', payload: 'Loading search algorithms...' });
  pyodide.FS.mkdir("src");
  pyodide.FS.mkdir("src/algorithms");
  pyodide.FS.mkdir("src/data");
  
  pyodide.FS.writeFile("src/__init__.py", initPy);
  pyodide.FS.writeFile("src/web_adapter.py", webAdapterPy);
  pyodide.FS.writeFile("src/algorithms/__init__.py", algInitPy);
  pyodide.FS.writeFile("src/algorithms/astar.py", astarPy);
  pyodide.FS.writeFile("src/algorithms/ucs.py", ucsPy);
  pyodide.FS.writeFile("src/algorithms/gbfs.py", gbfsPy);
  pyodide.FS.writeFile("src/data/__init__.py", dataInitPy);
  pyodide.FS.writeFile("src/data/graph.py", graphPy);
  
  await pyodide.runPythonAsync(`
import sys
sys.path.append(".")
import src.web_adapter as web_adapter
  `);
  self.postMessage({ type: 'STATUS', payload: 'Ready' });
}

pyodideReadyPromise = init();

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;
  
  try {
    await pyodideReadyPromise;
    
    if (type === 'RUN_ALGORITHM') {
      const { algorithm, metric, collectTrace } = payload;
      const res = pyodide.runPython(`web_adapter.run_algorithm('${algorithm}', '${metric}', ${collectTrace ? 'True' : 'False'})`);
      self.postMessage({ id, type: 'RESULT', payload: JSON.parse(res) });
    } 
    else if (type === 'RUN_ALL') {
      const { metric } = payload;
      const res = pyodide.runPython(`web_adapter.run_all_algorithms('${metric}')`);
      self.postMessage({ id, type: 'RESULT', payload: JSON.parse(res) });
    }
    else if (type === 'GET_GRAPH') {
      const { metric } = payload;
      const res = pyodide.runPython(`web_adapter.get_graph_data('${metric}')`);
      self.postMessage({ id, type: 'RESULT', payload: JSON.parse(res) });
    }
    else if (type === 'GET_HEURISTIC') {
      const { location, visited, metric } = payload;
      // Convert visited array to string list for python
      const visitedStr = `[${visited.map((v: string) => `"${v}"`).join(',')}]`;
      const res = pyodide.runPython(`web_adapter.get_heuristic_data('${location}', ${visitedStr}, '${metric}')`);
      self.postMessage({ id, type: 'RESULT', payload: JSON.parse(res) });
    }
  } catch (err: any) {
    self.postMessage({ id, type: 'ERROR', payload: err.message });
  }
};
