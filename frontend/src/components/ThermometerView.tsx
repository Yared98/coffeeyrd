import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Activity,
  Users,
  CheckCircle2,
} from 'lucide-react';
import type { Topic, ThermometerPosition } from '../types';
import { MarkdownDescription } from './MarkdownDescription';
import { ThermoBadge } from './ThermoBadge';

interface ThermometerViewProps {
  topics: Topic[];
  userThermometer?: Record<string, number>;
  thermometerPositions?: Record<string, ThermometerPosition[]>;
  userName: string;
  isFacilitator: boolean;
  onSetThermometer: (topicId: string, value: number, voterName: string) => void;
  onClearThermometer: (topicId: string) => void;
}

export const ThermometerView: React.FC<ThermometerViewProps> = ({
  topics,
  userThermometer = {},
  thermometerPositions = {},
  userName,
  isFacilitator: _isFacilitator,
  onSetThermometer,
  onClearThermometer,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Garantir que o índice atual seja válido se tópicos forem removidos
  useEffect(() => {
    if (currentIndex >= topics.length && topics.length > 0) {
      setCurrentIndex(topics.length - 1);
    }
  }, [topics.length, currentIndex]);

  const currentTopic = topics[currentIndex];
  const topicId = currentTopic?.id;
  const userVote = topicId ? userThermometer[topicId] : undefined;

  // Estado local do slider (0..100)
  const [localValue, setLocalValue] = useState<number>(userVote ?? 50);

  const isDraggingRef = useRef(false);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const pendingValueRef = useRef<number | null>(null);

  // Sincronizar o valor local quando o tópico muda ou o voto do usuário é atualizado remotamente
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(userVote ?? 50);
    }
  }, [topicId, userVote]);

  // Limpeza de timers no desmonte
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  if (!topics || topics.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', width: '100%', padding: '0 1rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <Activity size={40} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('thermometer.title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {t('thermometer.empty')}
          </p>
        </div>
      </div>
    );
  }

  const handleSliderChange = (val: number) => {
    setLocalValue(val);
    isDraggingRef.current = true;

    if (!topicId) return;

    const now = Date.now();
    if (now - lastSentTimeRef.current >= 250) {
      onSetThermometer(topicId, val, userName);
      lastSentTimeRef.current = now;
      pendingValueRef.current = null;
    } else {
      pendingValueRef.current = val;
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          if (pendingValueRef.current !== null && isDraggingRef.current && topicId) {
            onSetThermometer(topicId, pendingValueRef.current, userName);
            lastSentTimeRef.current = Date.now();
            pendingValueRef.current = null;
          }
        }, 250 - (now - lastSentTimeRef.current));
      }
    }
  };

  const handleSliderCommit = (val: number) => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    if (topicId) {
      onSetThermometer(topicId, val, userName);
      lastSentTimeRef.current = Date.now();
      pendingValueRef.current = null;
    }
    isDraggingRef.current = false;
  };

  const handleClearVote = () => {
    if (topicId) {
      onClearThermometer(topicId);
      setLocalValue(50);
    }
  };

  // Votos/posições dos demais participantes para o tópico atual
  const rawPositions: ThermometerPosition[] = (topicId && thermometerPositions[topicId]) || [];

  // Excluir 1 ocorrência igual ao próprio voto
  const getOtherPositions = (): ThermometerPosition[] => {
    if (userVote === undefined) return rawPositions;
    const result = [...rawPositions];

    let idx = result.findIndex(
      (p) =>
        p.value === userVote &&
        p.name &&
        p.name.trim().toLowerCase() === userName.trim().toLowerCase()
    );

    if (idx === -1) {
      idx = result.findIndex((p) => p.value === userVote);
    }

    if (idx !== -1) {
      result.splice(idx, 1);
    }
    return result;
  };

  const otherPositions = getOtherPositions();

  // Organizar empilhamento de avatares próximos para não sobrepor
  const positionsWithStackLevel = (() => {
    const sorted = [...otherPositions].sort((a, b) => a.value - b.value);
    const levels: { value: number; level: number }[] = [];
    return sorted.map((p) => {
      const nearby = levels.filter((item) => Math.abs(item.value - p.value) < 4.5);
      const level = nearby.length > 0 ? Math.max(...nearby.map((n) => n.level)) + 1 : 0;
      levels.push({ value: p.value, level });
      return { ...p, level };
    });
  })();

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const votedCount = topics.filter((t) => userThermometer[t.id] !== undefined).length;

  const count = currentTopic.thermo_count ?? 0;
  const avg = currentTopic.thermo_avg ?? null;
  const spread = currentTopic.thermo_spread ?? null;

  let spreadLabel = t('thermometer.spread_no_votes');
  if (spread !== null) {
    if (spread < 15) spreadLabel = t('thermometer.spread_consensus');
    else if (spread < 30) spreadLabel = t('thermometer.spread_moderate');
    else spreadLabel = t('thermometer.spread_high');
  }

  const zones = [
    { label: t('thermometer.zone_strongly_disagree'), range: '0% – 20%', bg: 'rgba(239, 68, 68, 0.2)' },
    { label: t('thermometer.zone_disagree'), range: '20% – 40%', bg: 'rgba(245, 158, 11, 0.2)' },
    { label: t('thermometer.zone_neutral'), range: '40% – 60%', bg: 'rgba(148, 163, 184, 0.2)' },
    { label: t('thermometer.zone_agree'), range: '60% – 80%', bg: 'rgba(59, 130, 246, 0.2)' },
    { label: t('thermometer.zone_strongly_agree'), range: '80% – 100%', bg: 'rgba(16, 185, 129, 0.2)' },
  ];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%', padding: '1.25rem 1rem' }}>
      {/* Header da Fase / Progresso Geral */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          {t('thermometer.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {t('thermometer.subtitle')}
        </p>

        {/* Progresso de votos */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.75rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          <CheckCircle2 size={13} color="var(--color-primary)" />
          <span>{t('thermometer.voted_progress', { voted: votedCount, total: topics.length })}</span>
        </div>
      </div>

      {/* Bar de Navegação entre Tópicos */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
          <span className="header-btn-text">Anterior</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {t('thermometer.topic_nav', { current: currentIndex + 1, total: topics.length })}
          </span>
          {/* Pontinhos de navegação */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {topics.map((tItem, idx) => {
              const hasVote = userThermometer[tItem.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={tItem.id}
                  onClick={() => setCurrentIndex(idx)}
                  title={`Tópico ${idx + 1}: ${tItem.title}`}
                  style={{
                    width: isCurrent ? 20 : 10,
                    height: 10,
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: isCurrent
                      ? 'var(--color-primary)'
                      : hasVote
                      ? 'var(--color-success)'
                      : 'var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                />
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(topics.length - 1, prev + 1))}
          disabled={currentIndex === topics.length - 1}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', opacity: currentIndex === topics.length - 1 ? 0.4 : 1 }}
        >
          <span className="header-btn-text">Próximo</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Card Principal do Tópico */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Título & Descrição */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {currentTopic.title}
            </h2>
            <ThermoBadge topic={currentTopic} />
          </div>

          <MarkdownDescription
            content={currentTopic.description}
            fontSize="0.875rem"
            maxCollapsedHeight={100}
            maxLengthThreshold={180}
          />

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            Proposto por: <strong>{currentTopic.author_name}</strong>
          </div>
        </div>

        {/* ======================================================================
            RÉGUA E POSICIONAMENTO DO TERMÔMETRO (0 a 100%)
           ====================================================================== */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1rem 1.5rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Display numérico do meu voto */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {t('thermometer.my_vote', { value: userVote !== undefined ? localValue : localValue })}
              {userVote === undefined && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500, marginLeft: '0.4rem' }}>
                  (Arraste para definir seu voto)
                </span>
              )}
            </span>

            {userVote !== undefined && (
              <button
                onClick={handleClearVote}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', gap: '0.3rem', color: 'var(--color-danger)' }}
              >
                <RotateCcw size={12} />
                <span>{t('thermometer.remove_my_vote')}</span>
              </button>
            )}
          </div>

          {/* Área da Régua com Zonas Coloridas e Marcadores */}
          <div style={{ position: 'relative', marginTop: '1.75rem', marginBottom: '2.5rem' }}>
            {/* Marcadores dos demais participantes (Avatares / Pontos) */}
            <div
              style={{
                position: 'absolute',
                top: '-2.4rem',
                left: 0,
                right: 0,
                height: '2.2rem',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {positionsWithStackLevel.map((p, pIdx) => {
                const isAnon = p.name === null;
                const offsetTop = isAnon ? 10 : Math.min(p.level * 22, 44);

                return (
                  <div
                    key={pIdx}
                    style={{
                      position: 'absolute',
                      left: `${p.value}%`,
                      transform: 'translateX(-50%)',
                      top: `${-offsetTop}px`,
                      transition: 'all 0.2s ease',
                      zIndex: 10 + p.level,
                    }}
                    title={isAnon ? `${p.value}%` : `${p.name}: ${p.value}%`}
                  >
                    {isAnon ? (
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          border: '2px solid var(--bg-surface)',
                          boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          color: '#ffffff',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--bg-surface)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {getInitials(p.name!)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fundo da Régua: 5 Zonas Coloridas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                height: '28px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                position: 'relative',
              }}
            >
              {zones.map((z, idx) => (
                <div
                  key={idx}
                  style={{
                    background: z.bg,
                    borderRight: idx < 4 ? '1px dashed var(--border-subtle)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              ))}
            </div>

            {/* Slider Range Sobreposto */}
            <input
              type="range"
              min={0}
              max={100}
              value={localValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              onMouseUp={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
              onBlur={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
              aria-label={currentTopic.title}
              className="thermometer-slider"
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                left: 0,
                width: '100%',
                margin: 0,
              }}
            />

            {/* Rótulos das 5 Zonas abaixo da régua */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                marginTop: '0.6rem',
                gap: '2px',
              }}
            >
              {zones.map((z, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      lineHeight: 1.2,
                    }}
                  >
                    {z.label}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                    {z.range}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Métricas e Estatísticas do Tópico */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {t('thermometer.avg_label')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {avg !== null ? `${Math.round(avg * 10) / 10}%` : '—'}
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {t('thermometer.spread_label')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {spreadLabel}
            </div>
            {spread !== null && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                ({Math.round(spread * 10) / 10})
              </div>
            )}
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {t('nav.participants')}
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Users size={16} color="var(--color-primary)" />
              <span>{count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
