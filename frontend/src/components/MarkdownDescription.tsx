import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MarkdownDescriptionProps {
  content?: string | null;
  maxCollapsedHeight?: number; // em px, padrão 70px (~3 a 4 linhas)
  maxLengthThreshold?: number; // caracteres para ativar colapso, padrão 140
  fontSize?: string; // padrão 0.8rem
  color?: string; // padrão var(--text-muted)
}

export const MarkdownDescription: React.FC<MarkdownDescriptionProps> = ({
  content,
  maxCollapsedHeight = 70,
  maxLengthThreshold = 140,
  fontSize = '0.8rem',
  color = 'var(--text-muted)',
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content || !content.trim()) return null;

  const trimmed = content.trim();
  const hasMultipleLines = (trimmed.match(/\n/g) || []).length >= 2;
  const isLong = trimmed.length > maxLengthThreshold || hasMultipleLines;

  return (
    <div style={{ position: 'relative', marginTop: '0.4rem' }}>
      <div
        className="topic-markdown-content"
        style={{
          fontSize,
          color,
          lineHeight: 1.45,
          maxHeight: !isExpanded && isLong ? `${maxCollapsedHeight}px` : 'none',
          overflow: !isExpanded && isLong ? 'hidden' : 'visible',
          position: 'relative',
          transition: 'max-height 0.25s ease-out',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </a>
            ),
          }}
        >
          {trimmed}
        </ReactMarkdown>

        {/* Gradiente de fade out sutil quando recolhido */}
        {!isExpanded && isLong && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '26px',
              background: 'linear-gradient(to bottom, transparent, var(--bg-surface-elevated, var(--bg-surface)))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.2rem 0',
            marginTop: '0.2rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--color-primary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            outline: 'none',
          }}
          title={isExpanded ? t('common.show_less', 'Recolher detalhes') : t('common.show_more', 'Ver mais')}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={12} />
              <span>{t('common.show_less', 'Recolher')}</span>
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              <span>{t('common.show_more', 'Ver mais')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
