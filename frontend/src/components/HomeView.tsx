import React, { useState } from 'react';
import {
  Coffee,
  ArrowRight,
  Sun,
  Moon,
  Bot,
  Globe,
  History,
  Shield,
  Trash2,
  Share2,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';
import {
  getRecentSessions,
  removeRecentSession,
  type RecentSession,
} from '../utils/recentSessions';
import { getUserProfileName, saveUserProfileName } from '../utils/userProfile';

interface HomeViewProps {
  onCreateSession: (title: string, maxVotes: number, defaultTimeboxSeconds: number) => Promise<void>;
  onJoinSession: (sessionId: string, facilitatorToken?: string | null) => void;
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
  const [userName, setUserName] = useState(() => getUserProfileName());
  const [maxVotes, setMaxVotes] = useState(3);
  const [timeboxMins, setTimeboxMins] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMcp, setShowMcp] = useState(false);

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>(() => getRecentSessions());
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const facilitatorSessions = recentSessions.filter(
    (s) => s.role === 'facilitator' || s.facilitatorToken
  );
  const participantSessions = recentSessions.filter(
    (s) => s.role !== 'facilitator' && !s.facilitatorToken
  );

  const handleCopyInvite = (sessionId: string, facilitatorToken?: string | null) => {
    const url = facilitatorToken
      ? `${window.location.origin}/session/${sessionId}?token=${facilitatorToken}`
      : `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const handleRemoveSession = (sessionId: string) => {
    const updated = removeRecentSession(sessionId);
    setRecentSessions(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (userName.trim()) {
      saveUserProfileName(userName.trim());
    }
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
    if (userName.trim()) {
      saveUserProfileName(userName.trim());
    }
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
                  {t('identity.name_label', 'Seu Nome ou Apelido')}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('identity.name_placeholder', 'Como o time te conhece?')}
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
                disabled={isSubmitting || !title.trim() || !userName.trim()}
                className="btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%', opacity: (isSubmitting || !userName.trim()) ? 0.7 : 1 }}
              >
                <span>{isSubmitting ? 'Iniciando...' : t('home.create_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {t('identity.name_label', 'Seu Nome ou Apelido')}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('identity.name_placeholder', 'Como o time te conhece?')}
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
                disabled={!joinCode.trim() || !userName.trim()}
                className="btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%', opacity: !userName.trim() ? 0.7 : 1 }}
              >
                <span>{t('home.join_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Histórico: Mesas que Facilito */}
          {facilitatorSessions.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700 }}>
                  <Shield size={14} color="var(--color-primary)" />
                  <span>{t('home.recent_facilitator_title')}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-subtle)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {facilitatorSessions.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: 220, overflowY: 'auto' }}>
                {facilitatorSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => onJoinSession(s.id, s.facilitatorToken)}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        {new Date(s.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(s.id, s.facilitatorToken)}
                        title={t('home.share_invite')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3rem 0.45rem',
                          fontSize: '0.72rem',
                          color: copiedSessionId === s.id ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        {copiedSessionId === s.id ? <Check size={12} /> : <Share2 size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSession(s.id)}
                        title={t('home.remove_from_history')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3rem 0.45rem',
                          fontSize: '0.72rem',
                          color: 'var(--color-danger, #ef4444)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onJoinSession(s.id, s.facilitatorToken)}
                        className="btn-primary"
                        style={{
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.72rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span>Entrar</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico: Mesas que Participei */}
          {participantSessions.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700 }}>
                  <History size={14} color="var(--color-primary)" />
                  <span>{t('home.recent_participant_title')}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-subtle)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {participantSessions.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: 220, overflowY: 'auto' }}>
                {participantSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => onJoinSession(s.id)}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        {new Date(s.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(s.id)}
                        title={t('home.share_invite')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3rem 0.45rem',
                          fontSize: '0.72rem',
                          color: copiedSessionId === s.id ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        {copiedSessionId === s.id ? <Check size={12} /> : <Share2 size={12} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSession(s.id)}
                        title={t('home.remove_from_history')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3rem 0.45rem',
                          fontSize: '0.72rem',
                          color: 'var(--color-danger, #ef4444)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onJoinSession(s.id)}
                        className="btn-primary"
                        style={{
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.72rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span>Entrar</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <McpModal isOpen={showMcp} onClose={() => setShowMcp(false)} />
    </div>
  );
};
