import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessagesSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ThermometerPosition, Topic } from '../types';

/** Divergência mínima (desvio padrão) para destacar os extremos: abaixo disso é consenso. */
export const EXTREMES_MIN_SPREAD = 15;

export interface ThermoExtreme {
  value: number;
  names: string[];
}

/**
 * Quem votou nas pontas da régua, para abrir o debate (spec thermometer-voting §7.1).
 * Só existe com nomes (sessão identificada), pelo menos 2 votos nomeados e divergência real.
 */
export function computeExtremes(
  positions: ThermometerPosition[] | undefined,
  spread: number | null | undefined
): { low: ThermoExtreme; high: ThermoExtreme } | null {
  const named = (positions || []).filter((p): p is ThermometerPosition & { name: string } => !!p.name);
  if (named.length < 2 || spread == null || spread < EXTREMES_MIN_SPREAD) return null;

  const min = Math.min(...named.map((p) => p.value));
  const max = Math.max(...named.map((p) => p.value));
  if (min === max) return null;

  const namesAt = (v: number) => [...new Set(named.filter((p) => p.value === v).map((p) => p.name))];
  return { low: { value: min, names: namesAt(min) }, high: { value: max, names: namesAt(max) } };
}

function formatNames(names: string[]): string {
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

interface ThermoExtremesProps {
  topic: Topic;
  positions: ThermometerPosition[] | undefined;
}

export const ThermoExtremes: React.FC<ThermoExtremesProps> = ({ topic, positions }) => {
  const { t } = useTranslation();
  const extremes = computeExtremes(positions, topic.thermo_spread);
  if (!extremes) return null;

  const row = (icon: React.ReactNode, color: string, label: string, ext: ThermoExtreme) => (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', minWidth: 0 }}
      title={`${label}: ${ext.names.join(', ')} (${ext.value}%)`}
    >
      <span style={{ color, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <strong style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formatNames(ext.names)}
      </strong>
      <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{ext.value}%</span>
    </div>
  );

  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--color-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        <MessagesSquare size={13} />
        {t('thermometer.extremes_title')}
      </div>
      {row(<ThumbsDown size={13} />, 'var(--color-danger)', t('thermometer.extremes_low'), extremes.low)}
      {row(<ThumbsUp size={13} />, 'var(--color-success)', t('thermometer.extremes_high'), extremes.high)}
    </div>
  );
};
