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
import { Footer } from './Footer';
import {
  getRecentSessions,
  removeRecentSession,
  type RecentSession,
} from '../utils/recentSessions';
import { getUserProfileName, saveUserProfileName } from '../utils/userProfile';
import { copyToClipboard } from '../utils/clipboard';

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

  const handleCopyInvite = async (sessionId: string) => {
    const url = `${window.location.origin}/session/${sessionId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    }
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
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '1rem',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <Coffee size={14} color="var(--color-primary)" />
            <span>CoffeeYrd</span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            {t('home.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {t('home.subtitle')}
          </p>
        </div>

        {/* Form Container */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-2xl)',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(20px)',
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
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setTab('create')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                background: tab === 'create' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
                color: tab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: tab === 'create' ? '1px solid var(--border-highlight)' : '1px solid transparent',
                boxShadow: tab === 'create' ? 'var(--shadow-sm)' : 'none',
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
                borderRadius: 'var(--radius-md)',
                background: tab === 'join' ? 'var(--bg-surface-elevated, var(--bg-surface))' : 'transparent',
                color: tab === 'join' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: tab === 'join' ? '1px solid var(--border-highlight)' : '1px solid transparent',
                boxShadow: tab === 'join' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t('home.join_tab')}
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('identity.name_label', 'Seu Nome ou Apelido')} *
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('identity.name_placeholder', 'Como o time te conhece?')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-highlight, var(--border-subtle))',
                    background: 'var(--bg-input, var(--bg-surface))',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('home.session_title_label')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('home.session_title_placeholder')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-highlight, var(--border-subtle))',
                    background: 'var(--bg-input, var(--bg-surface))',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {t('home.timebox_label')}
                  </label>
                  <select
                    value={timeboxMins}
                    onChange={(e) => setTimeboxMins(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input, var(--bg-surface))',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value={3}>3 minutos</option>
                    <option value={5}>5 minutos (padrão)</option>
                    <option value={8}>8 minutos</option>
                    <option value={10}>10 minutos</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {t('home.max_votes_label')}
                  </label>
                  <select
                    value={maxVotes}
                    onChange={(e) => setMaxVotes(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input, var(--bg-surface))',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isSubmitting || !title.trim() || !userName.trim() ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || !title.trim() || !userName.trim()) ? 0.6 : 1,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                  marginTop: '0.4rem',
                  width: '100%',
                }}
              >
                <span>{isSubmitting ? 'Iniciando...' : t('home.create_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {t('identity.name_label', 'Seu Nome ou Apelido')} *
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('identity.name_placeholder', 'Como o time te conhece?')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-highlight, var(--border-subtle))',
                    background: 'var(--bg-input, var(--bg-surface))',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Código ou Link da Reunião *
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t('home.join_code_placeholder')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-highlight, var(--border-subtle))',
                    background: 'var(--bg-input, var(--bg-surface))',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!joinCode.trim() || !userName.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: (!joinCode.trim() || !userName.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (!joinCode.trim() || !userName.trim()) ? 0.6 : 1,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                  marginTop: '0.4rem',
                  width: '100%',
                }}
              >
                <span>{t('home.join_btn')}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Histórico: Mesas que Facilito */}
          {facilitatorSessions.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                  <Shield size={15} color="var(--color-primary)" />
                  <span>{t('home.recent_facilitator_title')}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-subtle)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {facilitatorSessions.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto' }}>
                {facilitatorSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 0.9rem',
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
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        {new Date(s.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(s.id)}
                        title={t('home.share_invite')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.75rem',
                          color: copiedSessionId === s.id ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
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
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.75rem',
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
                        style={{
                          background: 'var(--color-primary-subtle)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all var(--transition-fast)',
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
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                  <History size={15} color="var(--color-primary)" />
                  <span>{t('home.recent_participant_title')}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-subtle)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {participantSessions.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto' }}>
                {participantSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 0.9rem',
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
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        {new Date(s.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(s.id)}
                        title={t('home.share_invite')}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.75rem',
                          color: copiedSessionId === s.id ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
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
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.75rem',
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
                        style={{
                          background: 'var(--color-primary-subtle)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all var(--transition-fast)',
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

      <Footer style={{ marginTop: '2.5rem', width: '100%', maxWidth: '780px', margin: '2.5rem auto 0 auto' }} />

      <McpModal isOpen={showMcp} onClose={() => setShowMcp(false)} />
    </div>
  );
};
