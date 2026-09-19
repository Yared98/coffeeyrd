import React, { useState } from 'react';
import { ThumbsUp, User, GitMerge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../types';

interface VotingViewProps {
  topics: Topic[];
  userVotedTopicIds: string[];
  maxVotes: number;
  onToggleVote: (topicId: string) => void;
  onMergeTopics?: (sourceTopicId: string, targetTopicId: string) => void;
}

export const VotingView: React.FC<VotingViewProps> = ({
  topics,
  userVotedTopicIds,
  maxVotes,
  onToggleVote,
  onMergeTopics,
}) => {
  const { t } = useTranslation();
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  const votesUsed = userVotedTopicIds.length;
  const votesRemaining = maxVotes > 0 ? Math.max(0, maxVotes - votesUsed) : Infinity;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          {t('voting.title')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
          {t('voting.subtitle')}
        </p>

        <div style={{ marginTop: '0.85rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: votesRemaining === 0 ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
              border: votesRemaining === 0 ? '1px solid var(--border-primary)' : '1px solid var(--border-subtle)',
              color: votesRemaining === 0 ? 'var(--color-primary)' : 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <ThumbsUp size={13} />
            <span>
              {maxVotes === 0
                ? `Votos emitidos: ${votesUsed}`
                : t('voting.remaining_votes', { count: votesRemaining })}
            </span>
          </span>
        </div>
      </div>

      {topics.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            marginBottom: '1.25rem',
            color: 'var(--color-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <GitMerge size={14} />
          <span>{t('voting.drag_merge_hint')}</span>
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
          const hasVoted = userVotedTopicIds.includes(topic.id);
          const canVote = hasVoted || votesRemaining > 0;
          const isOver = dragOverTopicId === topic.id;
          const isBeingDragged = draggedTopicId === topic.id;

          return (
            <div
              key={topic.id}
              draggable={true}
              onDragStart={(e) => {
                setDraggedTopicId(topic.id);
                e.dataTransfer.setData('text/plain', topic.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedTopicId(null);
                setDragOverTopicId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedTopicId && draggedTopicId !== topic.id && dragOverTopicId !== topic.id) {
                  setDragOverTopicId(topic.id);
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverTopicId === topic.id) setDragOverTopicId(null);
              }}
              onDrop={(e) => {
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
                gap: '0.85rem',
                position: 'relative',
                cursor: 'grab',
                opacity: isBeingDragged ? 0.4 : 1,
                border: isOver
                  ? '2px dashed var(--color-primary)'
                  : hasVoted
                  ? '1px solid var(--border-primary)'
                  : '1px solid var(--border-subtle)',
                background: isOver
                  ? 'var(--color-primary-subtle)'
                  : hasVoted
                  ? 'var(--color-primary-subtle)'
                  : 'var(--bg-surface)',
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
                    {t('voting.drop_to_merge')}
                  </span>
                </div>
              )}

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
                      whiteSpace: 'pre-line',
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
                  onClick={() => canVote && onToggleVote(topic.id)}
                  disabled={!canVote}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    background: hasVoted ? 'var(--color-primary)' : 'var(--bg-subtle)',
                    border: hasVoted ? 'none' : '1px solid var(--border-subtle)',
                    color: hasVoted ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: canVote ? 'pointer' : 'not-allowed',
                    opacity: canVote ? 1 : 0.5,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <ThumbsUp size={13} />
                  <span>{topic.vote_count}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
