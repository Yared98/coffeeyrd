import React, { useState } from 'react';
import { Plus, Trash2, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../types';

interface IdeationViewProps {
  topics: Topic[];
  isFacilitator: boolean;
  onAddTopic: (title: string, description?: string, authorName?: string) => void;
  onDeleteTopic: (topicId: string) => void;
}

export const IdeationView: React.FC<IdeationViewProps> = ({
  topics,
  isFacilitator: _isFacilitator,
  onAddTopic,
  onDeleteTopic,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('coffee_author') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (authorName.trim()) {
      localStorage.setItem('coffee_author', authorName.trim());
    }
    onAddTopic(
      title.trim(),
      description.trim() ? description.trim() : undefined,
      authorName.trim() || 'Anônimo'
    );
    setTitle('');
    setDescription('');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem' }}>
      {/* Header da Fase */}
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          {t('ideation.title')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
          {t('ideation.subtitle')}
        </p>
      </div>

      {/* Formulário de Adição de Tópicos */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          background: 'var(--bg-surface-elevated)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ideation.topic_title_placeholder')}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ideation.topic_desc_placeholder')}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />

            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={t('ideation.author_placeholder')}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="submit"
              disabled={!title.trim()}
              className="btn-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem' }}
            >
              <Plus size={15} />
              <span>{t('ideation.add_btn')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Grid de Tópicos Sugeridos */}
      {topics.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--text-muted)',
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Sparkles size={28} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('ideation.empty')}</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="glass-panel"
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                position: 'relative',
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {topic.title}
                </h3>
                {topic.description && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.4rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {topic.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                  <User size={12} />
                  <span>{topic.author_name}</span>
                </div>

                <button
                  onClick={() => onDeleteTopic(topic.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                  title="Excluir tópico"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
