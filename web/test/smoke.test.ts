import { describe, it, expect } from 'vitest';
import type { TraceStep, AlgorithmResult } from '../src/types';

describe('Frontend Types & Basic Logic Smoke Tests', () => {
  it('should compile TypeScript and validate interfaces', () => {
    const dummyTrace: TraceStep = {
      step: 1,
      state: { location: "SU", visited: ["SU"] },
      g: 0, h: 0, f: 0, priority: 0,
      frontierSizeBefore: 1, frontierSizeAfter: 6,
      generatedSuccessors: 6,
      routeSoFar: ["SU"]
    };
    expect(dummyTrace.state.location).toBe("SU");
  });

  it('should safely parse JSON metrics', () => {
    const validResponse = '{"total_cost": 10.5, "nodes_expanded": 42}';
    const parsed = JSON.parse(validResponse) as AlgorithmResult;
    expect(parsed.total_cost).toBe(10.5);
    expect(parsed.nodes_expanded).toBe(42);
  });

  it('should handle invalid Pyodide responses', () => {
    const errorResponse = '{"error": "Unknown metric"}';
    const parsed = JSON.parse(errorResponse) as AlgorithmResult;
    expect(parsed.error).toBe("Unknown metric");
    expect(parsed.route).toBeUndefined();
  });
});
