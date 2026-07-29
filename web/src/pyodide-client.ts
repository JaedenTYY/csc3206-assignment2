import type { AlgorithmResult, GraphData } from './types';

let worker: Worker;
let messageIdCounter = 0;
const callbacks = new Map<number, { resolve: Function, reject: Function }>();

export type StatusCallback = (status: string) => void;
let statusCallback: StatusCallback | null = null;

export function initPyodide(onStatus: StatusCallback) {
  statusCallback = onStatus;
  // Initialize worker
  worker = new Worker(new URL('./pyodide-worker.ts', import.meta.url), { type: 'module' });
  
  worker.onmessage = (event) => {
    const { id, type, payload } = event.data;
    
    if (type === 'STATUS' && statusCallback) {
      statusCallback(payload);
    } else if (type === 'RESULT' || type === 'ERROR') {
      const cb = callbacks.get(id);
      if (cb) {
        callbacks.delete(id);
        if (type === 'ERROR') cb.reject(new Error(payload));
        else cb.resolve(payload);
      }
    }
  };
}

function request<T>(type: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter;
    callbacks.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

export function runAlgorithm(algorithm: string, metric: string, collectTrace: boolean = false): Promise<AlgorithmResult> {
  return request<AlgorithmResult>('RUN_ALGORITHM', { algorithm, metric, collectTrace });
}

export function runAllAlgorithms(metric: string): Promise<Record<string, AlgorithmResult>> {
  return request<Record<string, AlgorithmResult>>('RUN_ALL', { metric });
}

export function getGraphData(metric: string): Promise<GraphData> {
  return request<GraphData>('GET_GRAPH', { metric });
}

export function getHeuristicData(location: string, visited: string[], metric: string): Promise<any> {
  return request<any>('GET_HEURISTIC', { location, visited, metric });
}
