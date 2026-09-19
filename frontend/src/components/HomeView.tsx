import React, { useState } from 'react';
import { Coffee, ArrowRight, Sun, Moon, Bot, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';

interface HomeViewProps {
  onCreateSession: (title: string, maxVotes: number, defaultTimeboxSeconds: number) => Promise<void>;
  onJoinSession: (sessionId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateSession,
  onJoinSession,
  theme,
  onToggleTheme,
}) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [title, setTitle] = useState('');
  const [maxVotes, setMaxVotes] = useState(3);
  const [timeboxMins, setTimeboxMins] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMcp, setShowMcp] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateSession(title.trim(), maxVotes, timeboxMins * 60);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    let clean = joinCode.trim();
    if (clean.includes('/session/')) {
      const parts = clean.split('/session/');
      clean = parts[parts.length - 1].split('?')[0];
    }
    onJoinSession(clean);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Menu Bar */}
      <header className="app-header">
        <div className="header-left">
          <a href="/" className="brand-logo" title="CoffeeYrd - Início">
            <div className="brand-icon-box">
              <Coffee size={18} />
            </div>
            <span className="brand-title">
              Coffee<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
            </span>
          </a>
          <EcosystemSwitcher currentApp="coffee" />
        </div>

        <div className="header-right">
          <button
            onClick={() => setShowMcp(true)}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              gap: '0.35rem',
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--border-primary)',
              color: 'var(--color-primary)',
            }}
          >
            <Bot size={13} />
            <span>MCP</span>
          </button>

          <button
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt')}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <Globe size={13} />
            <span>{i18n.language.startsWith('pt') ? 'EN' : 'PT'}</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
            }}
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>
        </div>
      </header>

      {/* Hero & Central Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--border-primary)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '1rem',
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <Coffee size={14} />
            <span>Lean Coffee Facilitation</span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            {t('home.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.65rem', lineHeight: 1.5 }}>
            {t('home.subtitle')}
          </p>
        </div>

        {/* Form Container */}
        <div
          className="glass-modal"
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-subtle)',
              padding: '4px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => setTab('create')}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: tab === 'create' ? 'var(--bg-surface)' : 'transparent',
                color: tab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t('home.create_tab')}
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: tab === 'join' ? 'var(--bg-surface)' : 'transparent',
                color: tab === 'join' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t('home.join_tab')}
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {t('home.session_title_label')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('home.session_title_placeholder')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {t('home.timebox_label')}
                  </label>
                  <select
                    value={timeboxMins}
                    onChange={(e) => setTimeboxMins(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <option value={3}>3 minutos</option>
                    <option value={5}>5 minutos (padrão)</option>
                    <option value={8}>8 minutos</option>
                    <option value={10}>10 minutos</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {t('home.max_votes_label')}
                  </label>
                  <select
                    value={maxVotes}
                    onChange={(e) => setMaxVotes(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <option value={3}>3 votos</option>
                    <option value={5}>5 votos</option>
                    <option value={8}>8 votos</option>
                    <option value={0}>Ilimitados</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}
              >
                <span>{isSubmitting ? 'Iniciando...' : t('home.create_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Código ou Link da Reunião
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t('home.join_code_placeholder')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%' }}
              >
                <span>{t('home.join_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      <McpModal isOpen={showMcp} onClose={() => setShowMcp(false)} />
    </div>
  );
};
