type ReadingTimeProps = {
  minutes: number;
};

export function ReadingTime({ minutes }: ReadingTimeProps) {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.ceil(minutes) : 1;
  return <span className="text-omnia-graphite-light">{safe} min de leitura</span>;
}
