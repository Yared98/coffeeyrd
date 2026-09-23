import React, { useState, useRef, useEffect } from 'react';
import { Layers, Clock, ShieldCheck, Coffee, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface EcosystemSwitcherProps {
  currentApp: 'retro' | 'daily' | 'planning' | 'coffee';
}

export const EcosystemSwitcher: React.FC<EcosystemSwitcherProps> = ({ currentApp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const getAppUrl = (app: 'retro' | 'daily' | 'planning' | 'coffee') => {
    // 1. Check for explicit env var
    const envUrl = (import.meta as any).env?.[`VITE_${app.toUpperCase()}_URL`];
    if (envUrl) return envUrl;

    // 2. Localhost development defaults (optional, but convenient)
    const isDev =
      window.location.port === '5173' ||
      window.location.port === '8080' ||
      window.location.port === '8081' ||
      window.location.port === '8082' ||
      window.location.port === '3000';
    if (isDev) {
      if (app === 'retro') return 'http://localhost:8080';
      if (app === 'daily') return 'http://localhost:8081';
      if (app === 'planning') return 'http://localhost:3000';
      if (app === 'coffee') return 'http://localhost:8082';
    }

    // 3. Not configured
    return undefined;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const apps = [
    {
      id: 'retro' as const,
      name: 'RetroYrd',
      desc: isEn ? 'Psychological safety & anonymous retros' : 'Retrospectivas anônimas & seguras',
      icon: ShieldCheck,
      color: '#6366f1',
      url: getAppUrl('retro'),
    },
    {
      id: 'daily' as const,
      name: 'DailyYrd',
      desc: isEn ? 'Timeboxed standups in < 15 minutes' : 'Dailies cronometradas em < 15 min',
      icon: Clock,
      color: '#10b981',
      url: getAppUrl('daily'),
    },
    {
      id: 'planning' as const,
      name: 'PlanningYrd',
      desc: isEn ? 'Real-time collaborative planning poker' : 'Planning poker colaborativo em tempo real',
      icon: Layers,
      color: '#3b82f6',
      url: getAppUrl('planning'),
    },
    {
      id: 'coffee' as const,
      name: 'CoffeeYrd',
      desc: isEn ? 'Lean Coffee agenda-less meetings' : 'Reuniões Lean Coffee com timeboxes',
      icon: Coffee,
      color: '#f59e0b',
      url: getAppUrl('coffee'),
    },
  ];

  const configuredApps = apps.filter((app) => app.url || app.id === currentApp);

  if (configuredApps.length <= 1) {
    return null;
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.32rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        title={isEn ? 'Ecosystem' : 'Ecossistema'}
      >
        <Sparkles size={13} style={{ color: 'var(--color-primary)' }} />
        <span className="ecosystem-switcher-label">{isEn ? 'Ecosystem' : 'Ecossistema'}</span>
        <ChevronDown
          size={12}
          style={{
            opacity: 0.65,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            minWidth: 260,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            padding: '0.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          <div
            style={{
              padding: '0.35rem 0.5rem 0.2rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-dim)',
            }}
          >
            {isEn ? 'Ecosystem' : 'Ecossistema'}
          </div>

          {configuredApps.map((app) => {
            const isCurrent = app.id === currentApp;
            const Icon = app.icon;

            return (
              <a
                key={app.id}
                href={app.url}
                target={isCurrent ? undefined : '_blank'}
                rel={isCurrent ? undefined : 'noopener noreferrer'}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  background: isCurrent ? 'var(--color-primary-subtle)' : 'transparent',
                  border: isCurrent ? '1px solid var(--border-primary)' : '1px solid transparent',
                  cursor: isCurrent ? 'default' : 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 'var(--radius-sm)',
                    background: `${app.color}20`,
                    border: `1px solid ${app.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: app.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: isCurrent ? 'var(--color-primary)' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{app.name}</span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          background: 'var(--color-primary)',
                          color: '#ffffff',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        {isEn ? 'current' : 'ativo'}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {app.desc}
                  </div>
                </div>
                {!isCurrent && <ExternalLink size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
