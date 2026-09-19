import React, { useState } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Minus, Check, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RomanVoteChoice, RomanVotingState } from '../types';

interface RomanVoteModalProps {
  state: RomanVotingState;
  topicTitle?: string;
  isFacilitator: boolean;
  onCastVote: (choice: RomanVoteChoice) => void;
  onCloseVoting: (extend: boolean) => void;
}

export const RomanVoteModal: React.FC<RomanVoteModalProps> = ({
  state,
  topicTitle,
  isFacilitator,
  onCastVote,
  onCloseVoting,
}) => {
  const { t } = useTranslation();
  const [selectedChoice, setSelectedChoice] = useState<RomanVoteChoice | null>(null);

  if (!state.is_active) return null;

  const handleVote = (choice: RomanVoteChoice) => {
    setSelectedChoice(choice);
    onCastVote(choice);
  };

  const totalVotes = state.extend_votes + state.next_votes + state.neutral_votes;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-subtle)',
            border: '2px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
            boxShadow: '0 0 16px var(--color-primary-glow)',
          }}
        >
          <Clock size={24} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {t('roman.title')}
          </h2>
          {topicTitle && (
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--color-primary)',
                fontWeight: 700,
                marginTop: '0.25rem',
              }}
            >
              "{topicTitle}"
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {t('roman.subtitle')}
          </p>
        </div>

        {/* 3 Opções de Voto Romano */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            width: '100%',
          }}
        >
          {/* Continuar */}
          <button
            onClick={() => handleVote('EXTEND')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 0.5rem',
              borderRadius: 'var(--radius-lg)',
              background:
                selectedChoice === 'EXTEND'
                  ? 'var(--color-success-bg)'
                  : 'var(--bg-subtle)',
              border:
                selectedChoice === 'EXTEND'
                  ? '2px solid var(--color-success)'
                  : '1px solid var(--border-subtle)',
              color: selectedChoice === 'EXTEND' ? 'var(--color-success)' : 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ThumbsUp size={24} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>+2m</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              {state.extend_votes} votos
            </span>
          </button>

          {/* Próximo */}
          <button
            onClick={() => handleVote('NEXT')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 0.5rem',
              borderRadius: 'var(--radius-lg)',
              background:
                selectedChoice === 'NEXT'
                  ? 'var(--color-danger-bg)'
                  : 'var(--bg-subtle)',
              border:
                selectedChoice === 'NEXT'
                  ? '2px solid var(--color-danger)'
                  : '1px solid var(--border-subtle)',
              color: selectedChoice === 'NEXT' ? 'var(--color-danger)' : 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ThumbsDown size={24} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Próximo</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              {state.next_votes} votos
            </span>
          </button>

          {/* Neutro */}
          <button
            onClick={() => handleVote('NEUTRAL')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 0.5rem',
              borderRadius: 'var(--radius-lg)',
              background:
                selectedChoice === 'NEUTRAL'
                  ? 'var(--color-primary-subtle)'
                  : 'var(--bg-subtle)',
              border:
                selectedChoice === 'NEUTRAL'
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--border-subtle)',
              color: selectedChoice === 'NEUTRAL' ? 'var(--color-primary)' : 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Minus size={24} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Neutro</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              {state.neutral_votes} votos
            </span>
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {totalVotes} votos computados em tempo real
        </div>

        {/* Controles do Facilitador para Consensuar */}
        {isFacilitator && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              width: '100%',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => onCloseVoting(true)}
              className="btn-secondary"
              style={{ flex: 1, color: 'var(--color-success)' }}
            >
              <Check size={14} />
              <span>Estender (+2m)</span>
            </button>
            <button
              onClick={() => onCloseVoting(false)}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              <span>Puxar Próximo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
