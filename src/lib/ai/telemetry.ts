/**
 * Telemetry — writes AI interaction traces to telemetry/traces/
 * and aggregates metrics to telemetry/metrics/
 * Reads from MongoDB aiInteractions AND writes to filesystem for offline analysis.
 */

import fs from 'fs';
import path from 'path';

const TRACES_DIR = path.resolve(process.cwd(), 'telemetry/traces');
const METRICS_DIR = path.resolve(process.cwd(), 'telemetry/metrics');

interface TraceEntry {
  id: string;
  timestamp: string;
  assist: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  status: 'success' | 'error';
  workshopId?: string;
  userId?: string;
  error?: string;
}

/** Log a trace entry to telemetry/traces/YYYY-MM-DD.jsonl */
export function logTrace(entry: TraceEntry): void {
  try {
    if (!fs.existsSync(TRACES_DIR)) fs.mkdirSync(TRACES_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(TRACES_DIR, `${date}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    // Non-blocking — telemetry failure should never break the app
  }
}

/** Update daily metrics summary */
export function updateMetrics(assist: string, model: string, latencyMs: number, success: boolean): void {
  try {
    if (!fs.existsSync(METRICS_DIR)) fs.mkdirSync(METRICS_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(METRICS_DIR, `${date}.json`);

    let metrics: Record<string, any> = {};
    if (fs.existsSync(file)) {
      metrics = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }

    const key = `${assist}:${model}`;
    if (!metrics[key]) {
      metrics[key] = { calls: 0, successes: 0, errors: 0, totalLatencyMs: 0, avgLatencyMs: 0 };
    }
    metrics[key].calls++;
    if (success) metrics[key].successes++;
    else metrics[key].errors++;
    metrics[key].totalLatencyMs += latencyMs;
    metrics[key].avgLatencyMs = Math.round(metrics[key].totalLatencyMs / metrics[key].calls);
    metrics._updated = new Date().toISOString();
    metrics._totalCalls = Object.values(metrics).reduce((s: number, v: any) => s + (typeof v === 'object' && v.calls ? v.calls : 0), 0);

    fs.writeFileSync(file, JSON.stringify(metrics, null, 2));
  } catch {
    // Non-blocking
  }
}

/** Read today's metrics (for display in settings/dashboard) */
export function getTodayMetrics(): Record<string, any> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(METRICS_DIR, `${date}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {}
  return {};
}
