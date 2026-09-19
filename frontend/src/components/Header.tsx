import React, { useState, useEffect, useRef } from 'react';
import {
  Coffee,
  Share2,
  Download,
  Bot,
  Sun,
  Moon,
  LogOut,
  Check,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { copyToClipboard } from '../utils/clipboard';
import type { Session, SessionPhase } from '../types';

interface HeaderProps {
  session: Session;
  onlineCount?: number;
  isConnected?: boolean;
  isFacilitator: boolean;
  theme: 'light' | 'dark';
  userName?: string;
  onEditIdentity?: () => void;
  onToggleTheme: () => void;
  onLeave: () => void;
  onExport: () => void;
  onOpenMcp: () => void;
  onControlTimer: (action: 'START' | 'PAUSE' | 'RESET' | 'ADD_SECONDS', seconds?: number) => void;
  onChangePhase: (nextPhase: SessionPhase) => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onlineCount = 1,
  isConnected = true,
  isFacilitator,
  theme,
  userName,
  onEditIdentity,
  onToggleTheme,
  onLeave,
  onExport,
  onOpenMcp,
  onControlTimer,
  onChangePhase,
}) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(session.timer_seconds_remaining);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const timerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session.timer_is_running || !session.timer_ends_at) {
      setLocalSeconds(session.timer_seconds_remaining);
      return;
    }

    const calc = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((session.timer_ends_at! - now) / 1000));
      setLocalSeconds(diff);
    };

    calc();
    const interval = setInterval(calc, 250);
    return () => clearInterval(interval);
  }, [session.timer_is_running, session.timer_ends_at, session.timer_seconds_remaining]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      const ok = await copyToClipboard(url.toString());
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      const fallbackUrl = `${window.location.origin}/session/${session.id}`;
      const ok = await copyToClipboard(fallbackUrl);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const phases: { key: SessionPhase; label: string }[] = [
    { key: 'IDEATION', label: t('phases.ideation') },
    { key: 'VOTING', label: t('phases.voting') },
    { key: 'DISCUSSION', label: t('phases.discussion') },
    { key: 'COMPLETED', label: t('phases.completed') },
  ];

  const currentIdx = phases.findIndex((p) => p.key === session.phase);
  const nextPhase = phases[currentIdx + 1]?.key;
  const prevPhase = phases[currentIdx - 1]?.key;

  return (
    <>
      {/* Tier 1: Application Header */}
      <header className="app-header">
        <div className="header-left" style={{ gap: '0.65rem' }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onLeave();
            }}
            className="brand-logo"
            title="CoffeeYrd - Início"
            aria-label="CoffeeYrd Home"
          >
            <div className="brand-icon-box">
              <Coffee size={18} />
            </div>
            <span className="brand-title">
              Coffee<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
            </span>
          </a>

          <EcosystemSwitcher currentApp="coffee" />

          <div
            style={{
              height: '20px',
              width: '1px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 0.15rem',
              flexShrink: 0,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, maxWidth: '140px' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                boxShadow: '0 0 6px var(--color-primary-glow)',
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                fontSize: '0.925rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={session.title}
            >
              {session.title}
            </h1>
            {isFacilitator && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-subtle)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--color-primary)',
                  flexShrink: 0,
                  cursor: 'help',
                }}
                title={t('nav.facilitator_tooltip', 'Você é o Facilitador desta sessão')}
              >
                {t('nav.facilitator')}
              </span>
            )}
          </div>
        </div>

        <div className="header-right" style={{ gap: '0.4rem' }}>
          {/* Convidar / Copiar Link */}
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            title={t('nav.share')}
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Share2 size={14} />}
            <span className="header-btn-text">{copied ? t('nav.copied') : t('nav.share')}</span>
          </button>

          {/* Indicador de Presença Online */}
          {isConnected ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.28rem 0.65rem',
                backgroundColor: 'var(--color-success-bg, rgba(16, 185, 129, 0.12))',
                border: '1px solid var(--color-success-border, rgba(16, 185, 129, 0.25))',
                borderRadius: 'var(--radius-full, 9999px)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-success, #10b981)',
              }}
              title={`${onlineCount} ${t('nav.onlineCount', 'online')}`}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success, #10b981)',
                  display: 'inline-block',
                }}
                className="animate-pulse"
              />
              <Users size={12} />
              <span>{onlineCount} {t('nav.onlineCount', 'online')}</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.28rem 0.65rem',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-full, 9999px)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#f59e0b',
              }}
              title={t('nav.reconnecting', 'Reconectando...')}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  display: 'inline-block',
                }}
                className="animate-pulse"
              />
              <Users size={12} />
              <span>{t('nav.reconnecting', 'Reconectando...')}</span>
            </div>
          )}

          {/* Exportar */}
          <button
            onClick={onExport}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            title={t('nav.export')}
          >
            <Download size={14} />
            <span className="header-btn-text">{t('nav.export')}</span>
          </button>

          {/* Botão MCP */}
          <button
            onClick={onOpenMcp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--border-primary)',
              color: 'var(--color-primary)',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Conectar Agente de IA via MCP"
          >
            <Bot size={13} />
            <span>MCP</span>
          </button>

          {/* Identidade do Usuário Conectado */}
          {userName && (
            <button
              onClick={onEditIdentity}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.28rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title={t('identity.edit_identity', 'Alterar meu nome')}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="header-btn-text" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </span>
            </button>
          )}

          {/* Alternador de Idioma */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '0.35rem 0.55rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              minWidth: '36px',
            }}
          >
            {i18n.language.startsWith('pt') ? 'EN' : 'PT'}
          </button>

          {/* Alternador de Tema */}
          <button
            onClick={onToggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '0.35rem 0.55rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>

          {/* Sair */}
          <button
            onClick={onLeave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '0.35rem 0.55rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
            title={t('nav.leave')}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Tier 2: Ritual / Session Workflow Bar */}
      <div className="session-sub-header">
        {/* Left: Stepper das 4 Fases */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.2rem 0.35rem',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0,
            }}
          >
            {phases.map((p, idx) => {
              const isCurrent = p.key === session.phase;
              const isDone = idx < currentIdx;

              return (
                <div
                  key={p.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: isCurrent ? '0.25rem 0.65rem' : '0.25rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#ffffff' : isDone ? 'var(--color-success)' : 'var(--text-dim)',
                    background: isCurrent ? 'var(--color-primary)' : 'transparent',
                    boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDone ? <CheckCircle2 size={13} color="var(--color-success)" /> : null}
                  <span>{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Timer & Phase Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {/* Timer Capsule */}
          <div style={{ position: 'relative' }} ref={timerMenuRef}>
            <div
              onClick={() => isFacilitator && setShowTimerMenu(!showTimerMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: session.timer_is_running ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                border: session.timer_is_running ? '1px solid var(--border-primary)' : '1px solid var(--border-subtle)',
                padding: '0.28rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isFacilitator ? 'pointer' : 'default',
              }}
            >
              <Clock size={14} color="var(--color-primary)" />
              <span>{formatTimer(localSeconds)}</span>
              {session.timer_is_running && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-primary)' }} />
              )}
            </div>

            {showTimerMenu && isFacilitator && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  width: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
                  {[
                    { label: '3m', secs: 180 },
                    { label: '5m', secs: 300 },
                    { label: '10m', secs: 600 },
                  ].map((p) => (
                    <button
                      key={p.secs}
                      onClick={() => {
                        onControlTimer('START', p.secs);
                        setShowTimerMenu(false);
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0', fontSize: '0.72rem' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => {
                      if (session.timer_is_running) {
                        onControlTimer('PAUSE');
                      } else {
                        onControlTimer('START');
                      }
                      setShowTimerMenu(false);
                    }}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem' }}
                  >
                    {session.timer_is_running ? <Pause size={13} /> : <Play size={13} />}
                    <span>{session.timer_is_running ? 'Pausar' : 'Iniciar'}</span>
                  </button>

                  <button
                    onClick={() => onControlTimer('ADD_SECONDS', 60)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}
                    title="Adicionar 1 minuto"
                  >
                    <Plus size={12} />
                    <span>1m</span>
                  </button>

                  <button
                    onClick={() => onControlTimer('RESET', 300)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.5rem' }}
                    title="Resetar"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navegação de Fase (Apenas Facilitador) */}
          {isFacilitator && prevPhase && (
            <button
              onClick={() => onChangePhase(prevPhase)}
              className="btn-secondary"
              style={{ padding: '0.28rem 0.55rem', fontSize: '0.75rem' }}
              title="Voltar Fase"
            >
              <ArrowLeft size={13} />
            </button>
          )}

          {isFacilitator && nextPhase && (
            <button
              onClick={() => onChangePhase(nextPhase)}
              className="btn-primary"
              style={{ padding: '0.28rem 0.75rem', fontSize: '0.75rem' }}
            >
              <span className="header-btn-text">Avançar</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
