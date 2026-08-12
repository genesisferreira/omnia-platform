import type { BudgetConfig, BudgetSnapshot, BudgetThresholdAction } from '../domain/types';

export const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimitUsd: 25,
  monthlyLimitUsd: 400,
  at100: 'warn_only',
};

export function evaluateBudget(input: {
  spentTodayUsd: number;
  spentMonthUsd: number;
  config?: Partial<BudgetConfig>;
}): BudgetSnapshot {
  const cfg: BudgetConfig = { ...DEFAULT_BUDGET, ...(input.config || {}) };
  const dailyPct = cfg.dailyLimitUsd > 0 ? (input.spentTodayUsd / cfg.dailyLimitUsd) * 100 : 0;
  const monthlyPct =
    cfg.monthlyLimitUsd > 0 ? (input.spentMonthUsd / cfg.monthlyLimitUsd) * 100 : 0;
  const pct = Math.max(dailyPct, monthlyPct);

  const thresholdsHit = [50, 80, 90, 100].filter((t) => pct >= t);
  let action: BudgetThresholdAction | 'ok' = 'ok';
  if (pct >= 100) action = 'critical';
  else if (pct >= 90) action = 'critical';
  else if (pct >= 80) action = 'warning';
  else if (pct >= 50) action = 'info';

  const blocked = pct >= 100 && cfg.at100 === 'block';

  return {
    spentTodayUsd: Number(input.spentTodayUsd.toFixed(6)),
    spentMonthUsd: Number(input.spentMonthUsd.toFixed(6)),
    dailyLimitUsd: cfg.dailyLimitUsd,
    monthlyLimitUsd: cfg.monthlyLimitUsd,
    dailyPct: Number(dailyPct.toFixed(1)),
    monthlyPct: Number(monthlyPct.toFixed(1)),
    thresholdsHit,
    action,
    blocked,
    message: blocked
      ? 'Orçamento de IA esgotado para o período. Contate o administrador.'
      : action === 'critical'
        ? 'Orçamento de IA em nível crítico.'
        : action === 'warning'
          ? 'Orçamento de IA acima de 80%.'
          : null,
  };
}
