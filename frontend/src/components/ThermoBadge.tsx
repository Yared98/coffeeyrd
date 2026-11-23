import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import type { Topic } from '../types';
import { STANCE_STYLE, thermoStance } from '../utils/thermometer';

interface ThermoBadgeProps {
  topic: Topic;
}

export const ThermoBadge: React.FC<ThermoBadgeProps> = ({ topic }) => {
  const { t } = useTranslation();

  const count = topic.thermo_count ?? 0;
  const stance = thermoStance(count, topic.thermo_avg, topic.thermo_spread);
  const style = STANCE_STYLE[stance];

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.72rem',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    whiteSpace: 'nowrap',
    color: style.color,
    background: style.bg,
    border: `1px solid ${style.border}`,
  };

  if (stance === 'NO_VOTES') {
    return (
      <span style={{ ...base, fontWeight: 600 }}>
        <Activity size={12} />
        <span>{t('thermometer.badge_no_votes')}</span>
      </span>
    );
  }

  const avgFormatted = (Math.round((topic.thermo_avg ?? 0) * 10) / 10).toString();

  return (
    <span
      style={{ ...base, fontWeight: 700 }}
      title={count === 1 ? t('thermometer.votes_count', { count }) : t('thermometer.votes_count_plural', { count })}
    >
      <Activity size={12} />
      <span>{t('thermometer.badge_text', { avg: avgFormatted, spread_label: t(style.labelKey) })}</span>
    </span>
  );
};
