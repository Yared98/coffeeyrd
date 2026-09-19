import React, { useState } from 'react';
import { Plus, Trash2, User, Sparkles, GitMerge, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../types';
import { MarkdownDescription } from './MarkdownDescription';

interface IdeationViewProps {
  topics: Topic[];
  isFacilitator: boolean;
  userName?: string;
  onEditIdentity?: () => void;
  onAddTopic: (title: string, description?: string, authorName?: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onMergeTopics?: (sourceTopicId: string, targetTopicId: string) => void;
  onUndoMerge?: (targetTopicId?: string) => void;
}

export const IdeationView: React.FC<IdeationViewProps> = ({
  topics,
  isFacilitator,
  userName,
  onEditIdentity,
  onAddTopic,
  onDeleteTopic,
  onMergeTopics,
  onUndoMerge,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const author = isAnonymous
      ? t('identity.anonymous', 'Anônimo')
      : (userName?.trim() || t('identity.anonymous', 'Anônimo'));
    onAddTopic(
      title.trim(),
      description.trim() ? description.trim() : undefined,
      author
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

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ideation.topic_desc_placeholder')}
              rows={2}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'vertical',
                minHeight: '40px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  color: isAnonymous ? 'var(--text-muted)' : 'var(--text-main)',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: isAnonymous ? 'var(--bg-subtle)' : 'var(--color-primary-subtle)',
                    color: isAnonymous ? 'var(--text-muted)' : 'var(--color-primary)',
                    border: isAnonymous ? '1px solid var(--border-subtle)' : '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                  }}
                >
                  {isAnonymous ? '?' : (userName?.charAt(0).toUpperCase() || '?')}
                </div>
                <span>
                  {t('identity.proposing_as', 'Propondo como')}:{' '}
                  <strong style={{ color: isAnonymous ? 'var(--text-muted)' : 'var(--color-primary)' }}>
                    {isAnonymous ? t('identity.anonymous', 'Anônimo') : (userName || t('identity.anonymous', 'Anônimo'))}
                  </strong>
                </span>
                {!isAnonymous && onEditIdentity && (
                  <button
                    type="button"
                    onClick={onEditIdentity}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ({t('identity.edit_identity', 'Alterar')})
                  </button>
                )}
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <span>{t('identity.post_anonymously', 'Propor como anônimo')}</span>
              </label>
            </div>

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
        <>
          {isFacilitator && topics.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '1rem',
                color: 'var(--color-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--color-primary-subtle)',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <GitMerge size={15} />
              <span>{t('ideation.drag_merge_hint')}</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {topics.map((topic) => {
              const isOver = isFacilitator && dragOverTopicId === topic.id;
              const isBeingDragged = isFacilitator && draggedTopicId === topic.id;

              return (
                <div
                  key={topic.id}
                  draggable={Boolean(isFacilitator)}
                  onDragStart={(e) => {
                    if (!isFacilitator) return;
                    setDraggedTopicId(topic.id);
                    e.dataTransfer.setData('text/plain', topic.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedTopicId(null);
                    setDragOverTopicId(null);
                  }}
                  onDragOver={(e) => {
                    if (!isFacilitator) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (draggedTopicId && draggedTopicId !== topic.id && dragOverTopicId !== topic.id) {
                      setDragOverTopicId(topic.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!isFacilitator) return;
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverTopicId === topic.id) setDragOverTopicId(null);
                  }}
                  onDrop={(e) => {
                    if (!isFacilitator) return;
                    e.preventDefault();
                    setDragOverTopicId(null);
                    const sourceId = e.dataTransfer.getData('text/plain') || draggedTopicId;
                    if (sourceId && sourceId !== topic.id && onMergeTopics) {
                      onMergeTopics(sourceId, topic.id);
                    }
                  }}
                  className="glass-panel"
                  style={{
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    position: 'relative',
                    cursor: isFacilitator ? 'grab' : 'default',
                    opacity: isBeingDragged ? 0.4 : 1,
                    border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: isOver ? 'var(--color-primary-subtle)' : 'var(--bg-surface-elevated)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isOver && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--color-primary-subtle)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <GitMerge size={24} color="var(--color-primary)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {t('ideation.drop_to_merge')}
                      </span>
                    </div>
                  )}

                  <div>
                    {Boolean(topic.merged_count && topic.merged_count > 0) && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          background: 'var(--color-primary-subtle)',
                          border: '1px solid var(--border-primary)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-full)',
                          marginBottom: '0.45rem',
                        }}
                      >
                        <GitMerge size={11} />
                        <span>
                          {topic.merged_count === 1
                            ? t('merge.merged_badge', { count: topic.merged_count })
                            : t('merge.merged_badge_plural', { count: topic.merged_count })}
                        </span>
                        {isFacilitator && onUndoMerge && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUndoMerge(topic.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0 0.15rem',
                              marginLeft: '0.2rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              color: 'var(--color-primary)',
                              textDecoration: 'underline',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                            title={t('merge.separate_topics')}
                          >
                            <Undo2 size={10} />
                            {t('merge.undo_btn')}
                          </button>
                        )}
                      </div>
                    )}
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {topic.title}
                    </h3>
                    <MarkdownDescription content={topic.description} />
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
