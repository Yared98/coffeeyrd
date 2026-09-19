import React, { useState } from 'react';
import { Bot, X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpModal: React.FC<McpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mcpUrl =
    window.location.port === '5173' || window.location.port === '8082'
      ? 'http://localhost:8082/mcp'
      : `${window.location.origin}/mcp`;

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        coffeeyrd: {
          url: mcpUrl,
          transport: 'http',
        },
      },
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {t('mcp.title')}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Yrd Model Context Protocol
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          {t('mcp.description')}
        </p>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
            {t('mcp.endpoint')}
          </div>
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-primary)',
              wordBreak: 'break-all',
            }}
          >
            {mcpUrl}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)' }}>
              Configuration (mcp.json / settings.json)
            </span>
            <button
              onClick={handleCopy}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
            >
              {copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
              <span>{copied ? t('nav.copied') : t('mcp.copy_config')}</span>
            </button>
          </div>
          <pre
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              overflowX: 'auto',
              margin: 0,
            }}
          >
            {mcpConfig}
          </pre>
        </div>

        <button onClick={onClose} className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
          Entendido
        </button>
      </div>
    </div>
  );
};
