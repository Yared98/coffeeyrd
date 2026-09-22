import React, { useState, useEffect } from 'react';
import {
  Coffee,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Database,
  TrendingUp,
  Radio,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sun,
  Moon,
  Clock,
  Activity,
  Check,
} from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { Footer } from './Footer';
import { copyToClipboard } from '../utils/clipboard';

interface AdminMetrics {
  total_sessions: number;
  active_sessions_30d: number;
  total_topics: number;
  total_votes: number;
  distinct_participants: number;
  db_size_bytes: number;
}

interface AdminSessionSummary {
  id: string;
  title: string;
  phase: string;
  topic_count: number;
  vote_count: number;
  created_at: string;
}

interface AdminMetricsResponse {
  metrics: AdminMetrics;
  active_sessions_memory: number;
  sessions: AdminSessionSummary[];
}

interface AdminDashboardProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AdminMetricsResponse | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      if (res.ok) {
        setIsAuthenticated(true);
        loadMetrics();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const json: AdminMetricsResponse = await res.json();
        setData(json);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      } else {
        setErrorMsg('Falha ao carregar métricas administrativas.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao carregar métricas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const body = await res.json();

      if (res.ok && body.ok) {
        setIsAuthenticated(true);
        setTokenInput('');
        loadMetrics();
      } else {
        setErrorMsg(body.error || 'Acesso negado. Token incorreto.');
      }
    } catch {
      setErrorMsg('Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignora falhas de rede no logout
    }
    setIsAuthenticated(false);
    setData(null);
  };

  const handlePurge = async () => {
    if (!window.confirm('Tem certeza que deseja forçar o expurgo de sessões inativas há mais de 60 dias?')) {
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch('/api/admin/purge', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setPurgeResult(`${json.purged_count} sessão(ões) expirada(s) expurgada(s) com sucesso.`);
        loadMetrics();
      } else {
        setErrorMsg('Erro ao executar limpeza de sessões.');
      }
    } catch {
      setErrorMsg('Falha ao se comunicar com o endpoint de expurgo.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setPurgeResult(`Sessão ${sessionId.substring(0, 8)} removida do sistema.`);
        setSessionToDelete(null);
        loadMetrics();
      } else {
        setErrorMsg('Erro ao deletar sessão.');
      }
    } catch {
      setErrorMsg('Falha de conexão ao deletar sessão.');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <RefreshCw size={32} className="spin-animation" color="var(--color-primary)" />
      </div>
    );
  }

  // Common Header component for Home style consistency
  const renderAppHeader = (showAdminControls: boolean) => (
    <header className="app-header">
      <div className="header-left">
        <a href="/" className="brand-logo" title="CoffeeYrd - Início" aria-label="CoffeeYrd Home">
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--border-primary)',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          <ShieldCheck size={13} />
          <span>Admin Console</span>
        </div>
      </div>

      <div className="header-right">
        {showAdminControls && (
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title="Recarregar métricas"
          >
            <RefreshCw size={13} className={isLoading ? 'spin-animation' : ''} />
            <span>Atualizar</span>
          </button>
        )}

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>
        )}

        <a
          href="/"
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          title="Voltar à tela inicial"
        >
          <ExternalLink size={13} />
          <span>Voltar ao App</span>
        </a>

        {showAdminControls && (
          <button
            onClick={handleLogout}
            className="btn-danger"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title="Encerrar sessão de admin"
          >
            <LogOut size={13} />
            <span>Sair</span>
          </button>
        )}
      </div>
    </header>
  );

  // Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="admin-layout">
        {renderAppHeader(false)}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            width: '100%',
          }}
        >
          {/* Hero Header */}
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
                color: 'var(--color-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              <span>Acesso Restrito</span>
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 0.5rem' }}>
              Painel Administrativo
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Insira a chave secreta <code className="code-badge">ADMIN_TOKEN</code> para desbloquear a observabilidade do CoffeeYrd.
            </p>
          </div>

          {/* Form Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-2xl)',
              padding: '2.25rem 2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {errorMsg && (
              <div className="admin-error-banner" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="admin-token-input" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                  Chave Secreta de Administração
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex' }}>
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="admin-token-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Insira o ADMIN_TOKEN..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar' : 'Exibir'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-lg)',
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Desbloquear Console</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <ArrowLeft size={14} />
                <span>Voltar à tela inicial do CoffeeYrd</span>
              </a>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="admin-layout">
      {renderAppHeader(true)}

      <main className="admin-main">
        {/* Hero Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '0.85rem',
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <Activity size={14} />
            <span>Telemetria & Gestão</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
            Console Administrativo
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            Visão analítica de adoção, sessões síncronas de Lean Coffee em memória, integridade do SQLite e ciclo de vida dos dados.
          </p>
        </div>

        {/* Alerts */}
        {purgeResult && (
          <div className="admin-success-banner" style={{ marginBottom: '2rem' }}>
            <CheckCircle2 size={16} />
            <span>{purgeResult}</span>
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
              onClick={() => setPurgeResult(null)}
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="admin-error-banner" style={{ marginBottom: '2rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KPI Cards Grid with Spacious Layout */}
        {data && (
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total de Sessões</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-primary)' }}>
                  <Coffee size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_sessions}</div>
              <div className="kpi-desc">Sessões registradas no SQLite</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Sessões Ativas (30d)</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.active_sessions_30d}</div>
              <div className="kpi-desc">Sessões criadas no último mês</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Sessões Na Memória</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                  <Radio size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.active_sessions_memory}</div>
              <div className="kpi-desc">Broadcasts WebSocket ativos</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Tópicos & Votos</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <FileText size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_topics}</div>
              <div className="kpi-desc">{data.metrics.total_votes} votos computados</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Banco SQLite</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <Database size={18} />
                </div>
              </div>
              <div className="kpi-value">{formatBytes(data.metrics.db_size_bytes)}</div>
              <div className="kpi-desc">Tamanho do arquivo local</div>
            </div>
          </div>
        )}

        {/* Operational Maintenance Banner Card */}
        <div
          className="admin-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={16} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ciclo de Vida & Retenção de Dados
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              O sistema executa expurgo automático diário para sessões criadas há mais de 60 dias. Você também pode disparar a limpeza manual agora.
            </p>
          </div>

          <button
            className="btn-secondary"
            onClick={handlePurge}
            disabled={isPurging}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: 'var(--color-danger)',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} />
            <span>{isPurging ? 'Executando Purge...' : 'Forçar Limpeza de Expiradas'}</span>
          </button>
        </div>

        {/* Recent Sessions Table Card */}
        <div className="admin-card" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Sessões Recentes do CoffeeYrd
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Exibindo as últimas 50 sessões de Lean Coffee registradas no banco de dados
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Total: <strong>{data?.sessions.length || 0}</strong> sessões
              </span>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título da Sessão</th>
                  <th>Fase Atual</th>
                  <th style={{ textAlign: 'center' }}>Tópicos</th>
                  <th style={{ textAlign: 'center' }}>Votos</th>
                  <th>Criada Em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data && data.sessions.length > 0 ? (
                  data.sessions.map((sess) => (
                    <tr key={sess.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <code className="code-badge">{sess.id.substring(0, 8)}</code>
                          <button
                            style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleCopy(sess.id, sess.id)}
                            title="Copiar código da sessão"
                          >
                            {copiedId === sess.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} color="var(--text-dim)" />}
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sess.title}</td>
                      <td>
                        <span className={`status-pill ${sess.phase === 'DISCUSSION' || sess.phase === 'VOTING' ? 'active' : 'idle'}`}>
                          {sess.phase}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{sess.topic_count}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{sess.vote_count}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(sess.created_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <a
                            href={`/session/${sess.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', textDecoration: 'none' }}
                            title="Acessar sessão em nova aba"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', color: 'var(--color-danger)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                            onClick={() => setSessionToDelete(sess.id)}
                            title="Remover sessão do banco"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                      Nenhuma sessão encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {sessionToDelete && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.5rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-2xl)',
                padding: '2rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>
                <AlertTriangle size={24} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Confirmar Exclusão</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Tem certeza que deseja excluir permanentemente a sessão <code className="code-badge">{sessionToDelete.substring(0, 8)}</code>? Todos os tópicos, votos e notas vinculados serão destruídos via cascading delete.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setSessionToDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteSession(sessionToDelete)}
                >
                  Excluir Permanentemente
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
