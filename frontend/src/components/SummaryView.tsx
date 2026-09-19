import React, { useEffect, useState } from 'react';
import { Download, Copy, Check, Home, Coffee, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import type { Session, Topic } from '../types';
import { MarkdownDescription } from './MarkdownDescription';
import { copyToClipboard } from '../utils/clipboard';

interface SummaryViewProps {
  session: Session;
  topics: Topic[];
  onExport: () => void;
  onHome: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  session,
  topics,
  onExport,
  onHome,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const discussed = topics.filter((t) => t.status === 'DISCUSSED');
  const pending = topics.filter((t) => t.status !== 'DISCUSSED');

  const generateMarkdown = () => {
    let md = `# Ata de Reunião Lean Coffee: ${session.title}\n\n`;
    md += `- **Data:** ${new Date(session.created_at).toLocaleDateString()}\n`;
    md += `- **Total de Tópicos:** ${topics.length} (${discussed.length} discutidos)\n\n`;

    md += `## ☕ Tópicos Discutidos\n\n`;
    for (const t of discussed) {
      md += `### ${t.title}\n`;
      if (t.description) md += `> ${t.description}\n\n`;
      md += `- **Votos:** ${t.vote_count}\n`;
      if (t.notes) md += `- **Notas & Combinados:**\n${t.notes}\n`;
      md += `\n`;
    }

    if (pending.length > 0) {
      md += `## 📝 Tópicos Não Discutidos\n\n`;
      for (const t of pending) {
        md += `- **${t.title}** (${t.vote_count} votos)\n`;
      }
    }

    return md;
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(generateMarkdown());
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary-subtle)',
            border: '2px solid var(--border-primary)',
            color: 'var(--color-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem',
          }}
        >
          <Coffee size={24} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          {t('summary.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          {t('summary.subtitle')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', marginTop: '1.25rem' }}>
          <button onClick={onExport} className="btn-primary">
            <Download size={15} />
            <span>{t('summary.download_btn')}</span>
          </button>

          <button onClick={handleCopy} className="btn-secondary">
            {copied ? <Check size={15} color="var(--color-success)" /> : <Copy size={15} />}
            <span>{copied ? 'Copiado!' : t('summary.copy_btn')}</span>
          </button>

          <button onClick={onHome} className="btn-secondary">
            <Home size={15} />
            <span>{t('summary.home_btn')}</span>
          </button>
        </div>
      </div>

      {/* Relatório Visual */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} color="var(--color-success)" />
            <span>Tópicos Discutidos ({discussed.length})</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {discussed.map((topic) => (
              <div
                key={topic.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{topic.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                    {topic.vote_count} votos
                  </span>
                </div>
                <MarkdownDescription
                  content={topic.description}
                  fontSize="0.8rem"
                  maxCollapsedHeight={70}
                  maxLengthThreshold={120}
                />
                {topic.notes && (
                  <div
                    style={{
                      marginTop: '0.65rem',
                      padding: '0.65rem',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>Anotações / Combinados:</strong>
                    <br />
                    {topic.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {pending.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--text-muted)' }}>
              Tópicos Não Discutidos ({pending.length})
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              {pending.map((t) => (
                <li key={t.id} style={{ marginBottom: '0.35rem' }}>
                  <strong>{t.title}</strong> — {t.vote_count} votos
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
