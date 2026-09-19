import React, { useState } from 'react';
import {
  Coffee,
  Play,
  Check,
  ThumbsUp,
  Clock,
  User,
  ArrowRight,
  FileText,
  Save,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../types';

interface DiscussionViewProps {
  topics: Topic[];
  activeTopicId?: string | null;
  isFacilitator: boolean;
  timerIsRunning: boolean;
  timerSecondsRemaining: number;
  onSelectActiveTopic: (topicId: string) => void;
  onUpdateNotes: (topicId: string, notes: string) => void;
  onControlTimer: (action: 'START' | 'PAUSE' | 'RESET' | 'ADD_SECONDS', seconds?: number) => void;
  onTriggerRomanVoting: () => void;
  onAdvanceToCompleted: () => void;
}

export const DiscussionView: React.FC<DiscussionViewProps> = ({
  topics,
  activeTopicId,
  isFacilitator,
  timerIsRunning,
  timerSecondsRemaining: _timerSecondsRemaining,
  onSelectActiveTopic,
  onUpdateNotes,
  onControlTimer,
  onTriggerRomanVoting,
  onAdvanceToCompleted,
}) => {
  const { t } = useTranslation();

  const toDiscuss = topics.filter((t) => t.status === 'TO_DISCUSS');
  const activeTopic = topics.find((t) => t.id === activeTopicId) || topics.find((t) => t.status === 'DISCUSSING');
  const discussed = topics.filter((t) => t.status === 'DISCUSSED');

  const [notes, setNotes] = useState(activeTopic?.notes || '');
  const [isSaved, setIsSaved] = useState(true);

  // Sincronizar notas locais quando o tópico ativo mudar
  React.useEffect(() => {
    if (activeTopic) {
      setNotes(activeTopic.notes);
      setIsSaved(true);
    }
  }, [activeTopic?.id]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setIsSaved(false);
  };

  const handleSaveNotes = () => {
    if (activeTopic) {
      onUpdateNotes(activeTopic.id, notes);
      setIsSaved(true);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '1.25rem 1rem' }}>
      {/* 3 Colunas da Mesa de Café */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Coluna 1: A Discutir */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📝</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {t('discussion.col_to_discuss')}
              </h3>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--bg-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-muted)',
              }}
            >
              {toDiscuss.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {toDiscuss.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                Nenhum tópico na fila.
              </div>
            ) : (
              toDiscuss.map((topic) => (
                <div
                  key={topic.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{topic.title}</h4>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        background: 'var(--color-primary-subtle)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <ThumbsUp size={11} />
                      {topic.vote_count}
                    </span>
                  </div>

                  {topic.description && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      {topic.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={11} />
                      {topic.author_name}
                    </span>

                    {isFacilitator && (
                      <button
                        onClick={() => onSelectActiveTopic(topic.id)}
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      >
                        <span>Puxar</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 2: Discutindo Agora (Spotlight) */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            border: '2px solid var(--border-primary)',
            background: 'var(--color-primary-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Coffee size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                {t('discussion.col_discussing')}
              </h3>
            </div>

            {isFacilitator && (
              <button
                onClick={onTriggerRomanVoting}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                <Clock size={13} />
                <span>{t('discussion.trigger_roman')}</span>
              </button>
            )}
          </div>

          {activeTopic ? (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  Tópico Ativo
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0 0', color: 'var(--text-main)' }}>
                  {activeTopic.title}
                </h2>
                {activeTopic.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                    {activeTopic.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <User size={13} />
                    Proposto por: <strong>{activeTopic.author_name}</strong>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                    ({activeTopic.vote_count} votos)
                  </span>
                </div>
              </div>

              {/* Bloco de Notas Compartilhadas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FileText size={13} />
                    Anotações & Combinados
                  </span>
                  <button
                    onClick={handleSaveNotes}
                    className="btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    {isSaved ? <Check size={11} color="var(--color-success)" /> : <Save size={11} />}
                    <span>{isSaved ? 'Salvo' : 'Salvar Notas'}</span>
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder={t('discussion.notes_placeholder')}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.825rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Botões do Facilitador */}
              {isFacilitator && (
                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => onControlTimer(timerIsRunning ? 'PAUSE' : 'START')}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
                  >
                    {timerIsRunning ? <Clock size={14} /> : <Play size={14} />}
                    <span>{timerIsRunning ? t('discussion.pause_timer') : t('discussion.start_timer')}</span>
                  </button>

                  <button
                    onClick={onTriggerRomanVoting}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
                  >
                    <span>{t('discussion.next_topic')}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Coffee size={32} style={{ opacity: 0.5, marginBottom: '0.75rem', color: 'var(--color-primary)' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('discussion.empty_discussing')}</p>
              {isFacilitator && toDiscuss.length === 0 && (
                <button
                  onClick={onAdvanceToCompleted}
                  className="btn-primary"
                  style={{ marginTop: '1rem', padding: '0.5rem 1.25rem' }}
                >
                  Concluir Reunião
                </button>
              )}
            </div>
          )}
        </div>

        {/* Coluna 3: Discutido */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {t('discussion.col_discussed')}
              </h3>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--bg-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-muted)',
              }}
            >
              {discussed.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {discussed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                Nenhum tópico concluído ainda.
              </div>
            ) : (
              discussed.map((topic) => (
                <div
                  key={topic.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    opacity: 0.85,
                  }}
                >
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                    {topic.title}
                  </h4>
                  {topic.notes && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-main)',
                        background: 'var(--bg-subtle)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {topic.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
