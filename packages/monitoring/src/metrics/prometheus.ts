/**
 * Prometheus-compatible in-process registry (sem depender de prom-client).
 * Labels nunca devem incluir PII, tokens ou IDs de usuário/curso.
 */

export type MetricLabels = Record<string, string>;

type CounterSeries = { labels: MetricLabels; value: number };
type GaugeSeries = { labels: MetricLabels; value: number };
type HistSeries = {
  labels: MetricLabels;
  count: number;
  sum: number;
  buckets: number[];
};

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];

function labelKey(labels: MetricLabels): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',');
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function formatLabels(labels: MetricLabels): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) return '';
  return `{${keys
    .sort()
    .map((k) => `${k}="${escapeLabel(labels[k] ?? '')}"`)
    .join(',')}}`;
}

export class Counter {
  private readonly series = new Map<string, CounterSeries>();

  constructor(
    readonly name: string,
    readonly help: string,
  ) {}

  inc(labels: MetricLabels = {}, value = 1): void {
    const key = labelKey(labels);
    const cur = this.series.get(key) ?? { labels, value: 0 };
    cur.value += value;
    this.series.set(key, cur);
  }

  get(labels: MetricLabels = {}): number {
    return this.series.get(labelKey(labels))?.value ?? 0;
  }

  collect(): string[] {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    if (this.series.size === 0) {
      lines.push(`${this.name} 0`);
      return lines;
    }
    for (const s of this.series.values()) {
      lines.push(`${this.name}${formatLabels(s.labels)} ${s.value}`);
    }
    return lines;
  }

  reset(): void {
    this.series.clear();
  }
}

export class Gauge {
  private readonly series = new Map<string, GaugeSeries>();

  constructor(
    readonly name: string,
    readonly help: string,
  ) {}

  set(labels: MetricLabels, value: number): void {
    this.series.set(labelKey(labels), { labels, value });
  }

  inc(labels: MetricLabels = {}, value = 1): void {
    const key = labelKey(labels);
    const cur = this.series.get(key) ?? { labels, value: 0 };
    cur.value += value;
    this.series.set(key, cur);
  }

  dec(labels: MetricLabels = {}, value = 1): void {
    this.inc(labels, -value);
  }

  get(labels: MetricLabels = {}): number {
    return this.series.get(labelKey(labels))?.value ?? 0;
  }

  collect(): string[] {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    if (this.series.size === 0) {
      lines.push(`${this.name} 0`);
      return lines;
    }
    for (const s of this.series.values()) {
      lines.push(`${this.name}${formatLabels(s.labels)} ${s.value}`);
    }
    return lines;
  }

  reset(): void {
    this.series.clear();
  }
}

export class Histogram {
  private readonly series = new Map<string, HistSeries>();
  private readonly bounds: number[];

  constructor(
    readonly name: string,
    readonly help: string,
    buckets: number[] = DEFAULT_BUCKETS,
  ) {
    this.bounds = [...buckets].sort((a, b) => a - b);
  }

  observe(labels: MetricLabels, seconds: number): void {
    const key = labelKey(labels);
    let cur = this.series.get(key);
    if (!cur) {
      cur = {
        labels,
        count: 0,
        sum: 0,
        buckets: this.bounds.map(() => 0),
      };
      this.series.set(key, cur);
    }
    cur.count += 1;
    cur.sum += seconds;
    for (let i = 0; i < this.bounds.length; i += 1) {
      if (seconds <= (this.bounds[i] as number)) {
        cur.buckets[i] = (cur.buckets[i] ?? 0) + 1;
      }
    }
  }

  collect(): string[] {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    if (this.series.size === 0) {
      for (const b of this.bounds) {
        lines.push(`${this.name}_bucket{le="${b}"} 0`);
      }
      lines.push(`${this.name}_bucket{le="+Inf"} 0`);
      lines.push(`${this.name}_sum 0`);
      lines.push(`${this.name}_count 0`);
      return lines;
    }
    for (const s of this.series.values()) {
      const base = { ...s.labels };
      let cumulative = 0;
      for (let i = 0; i < this.bounds.length; i += 1) {
        cumulative += s.buckets[i] ?? 0;
        lines.push(
          `${this.name}_bucket${formatLabels({ ...base, le: String(this.bounds[i]) })} ${cumulative}`,
        );
      }
      lines.push(`${this.name}_bucket${formatLabels({ ...base, le: '+Inf' })} ${s.count}`);
      lines.push(`${this.name}_sum${formatLabels(base)} ${s.sum}`);
      lines.push(`${this.name}_count${formatLabels(base)} ${s.count}`);
    }
    return lines;
  }

  reset(): void {
    this.series.clear();
  }
}

export class Registry {
  private readonly metrics: Array<Counter | Gauge | Histogram> = [];

  register<T extends Counter | Gauge | Histogram>(metric: T): T {
    this.metrics.push(metric);
    return metric;
  }

  render(): string {
    return `${this.metrics.flatMap((m) => m.collect()).join('\n')}\n`;
  }

  reset(): void {
    for (const m of this.metrics) m.reset();
  }
}

/** Registry global do processo Admin/Connector. */
export const defaultRegistry = new Registry();
