export interface State {
  location: string;
  visited: string[];
}

export interface TraceStep {
  step: number;
  state: State;
  g: number;
  h: number;
  f: number;
  priority: number;
  frontierSizeBefore: number;
  frontierSizeAfter: number;
  generatedSuccessors: number;
  routeSoFar: string[];
}

export interface PathCost {
  0: string;
  1: string;
  2: number;
}

export interface AlgorithmResult {
  algorithm?: string;
  metric?: string;
  route?: string[];
  total_cost?: number;
  nodes_expanded?: number;
  path_costs?: PathCost[];
  trace?: TraceStep[];
  error?: string;
}

export interface EdgeData {
  source: string;
  target: string;
  cost: number;
}

export interface GraphData {
  nodes: string[];
  edges: EdgeData[];
}
