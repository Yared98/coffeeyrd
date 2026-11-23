import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import type { Topic } from '../types';

interface ThermoBadgeProps {
  topic: Topic;
}

export const ThermoBadge: React.FC<ThermoBadgeProps> = ({ topic }) => {
  const { t } = useTranslation();

  const count = topic.thermo_count ?? 0;
  const avg = topic.thermo_avg ?? null;
  const spread = topic.thermo_spread ?? null;

  if (count === 0 || avg === null || spread === null) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-dim)',
          background: 'var(--bg-subtle)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Activity size={12} />
        <span>{t('thermometer.badge_no_votes')}</span>
      </span>
    );
  }

  let spreadLabel = '';
  if (spread < 15) {
    spreadLabel = t('thermometer.spread_consensus');
  } else if (spread < 30) {
    spreadLabel = t('thermometer.spread_moderate');
  } else {
    spreadLabel = t('thermometer.spread_high');
  }

  const avgFormatted = (Math.round(avg * 10) / 10).toString();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--color-primary)',
        background: 'var(--color-primary-subtle)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-primary)',
        whiteSpace: 'nowrap',
      }}
      title={count === 1 ? t('thermometer.votes_count', { count }) : t('thermometer.votes_count_plural', { count })}
    >
      <Activity size={12} />
      <span>{t('thermometer.badge_text', { avg: avgFormatted, spread_label: spreadLabel })}</span>
    </span>
  );
};
