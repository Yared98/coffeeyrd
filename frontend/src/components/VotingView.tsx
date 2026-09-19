import React from 'react';
import { ThumbsUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../types';

interface VotingViewProps {
  topics: Topic[];
  userVotedTopicIds: string[];
  maxVotes: number;
  onToggleVote: (topicId: string) => void;
}

export const VotingView: React.FC<VotingViewProps> = ({
  topics,
  userVotedTopicIds,
  maxVotes,
  onToggleVote,
}) => {
  const { t } = useTranslation();
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

          return (
            <div
              key={topic.id}
              className="glass-panel"
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
                border: hasVoted ? '1px solid var(--border-primary)' : '1px solid var(--border-subtle)',
                background: hasVoted ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                transition: 'all var(--transition-fast)',
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
