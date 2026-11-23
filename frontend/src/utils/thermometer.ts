/**
 * Leitura do termômetro de um tópico (spec thermometer-voting §5).
 * Com divergência baixa, o rótulo diz para que lado o time convergiu: concordar, discordar
 * ou ficar neutro. "Todos neutros" não é consenso sobre o tema, é sinal de dúvida ou falta de contexto.
 */
export type ThermoStance =
  | 'NO_VOTES'
  | 'CONSENSUS_AGREE'
  | 'CONSENSUS_DISAGREE'
  | 'ALL_NEUTRAL'
  | 'MODERATE'
  | 'HIGH';

export const SPREAD_MODERATE = 15;
export const SPREAD_HIGH = 30;
export const AGREE_FROM = 60;
export const DISAGREE_UP_TO = 40;

export function thermoStance(
  count: number | null | undefined,
  avg: number | null | undefined,
  spread: number | null | undefined
): ThermoStance {
  if (!count || avg == null || spread == null) return 'NO_VOTES';
  if (spread >= SPREAD_HIGH) return 'HIGH';
  if (spread >= SPREAD_MODERATE) return 'MODERATE';
  if (avg >= AGREE_FROM) return 'CONSENSUS_AGREE';
  if (avg <= DISAGREE_UP_TO) return 'CONSENSUS_DISAGREE';
  return 'ALL_NEUTRAL';
}

export const STANCE_STYLE: Record<ThermoStance, { labelKey: string; color: string; bg: string; border: string }> = {
  NO_VOTES: {
    labelKey: 'thermometer.spread_no_votes',
    color: 'var(--text-dim)',
    bg: 'var(--bg-subtle)',
    border: 'var(--border-subtle)',
  },
  CONSENSUS_AGREE: {
    labelKey: 'thermometer.stance_agree',
    color: 'var(--color-success)',
    bg: 'var(--color-success-bg)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  CONSENSUS_DISAGREE: {
    labelKey: 'thermometer.stance_disagree',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-bg)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  ALL_NEUTRAL: {
    labelKey: 'thermometer.stance_neutral',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.4)',
  },
  MODERATE: {
    labelKey: 'thermometer.spread_moderate',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-subtle)',
    border: 'var(--border-primary)',
  },
  HIGH: {
    labelKey: 'thermometer.spread_high',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-subtle)',
    border: 'var(--border-primary)',
  },
};
