import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Undo2, X } from 'lucide-react';
import { useCoffeeSocket } from './hooks/useCoffeeSocket';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { IdeationView } from './components/IdeationView';
import { VotingView } from './components/VotingView';
import { DiscussionView } from './components/DiscussionView';
import { SummaryView } from './components/SummaryView';
import { RomanVoteModal } from './components/RomanVoteModal';
import { McpModal } from './components/McpModal';
import { IdentityModal } from './components/IdentityModal';
import { saveRecentSession } from './utils/recentSessions';
import { getUserProfileName } from './utils/userProfile';
import { initAnalytics, trackPageView } from './utils/analytics';

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const pathMatch = window.location.pathname.match(/\/session\/([A-Za-z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session');
  });

  const [facilitatorToken, setFacilitatorToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) return token;
    const pathMatch = window.location.pathname.match(/\/session\/([A-Za-z0-9_-]+)/);
    const sId = pathMatch ? pathMatch[1] : urlParams.get('session');
    return sId ? (sessionStorage.getItem(`coffee_token_${sId}`) || localStorage.getItem(`coffee_token_${sId}`)) : null;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('coffeeyrd_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [showMcp, setShowMcp] = useState(false);
  const [userName, setUserName] = useState<string>(() => getUserProfileName());
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  useEffect(() => {
    if (sessionId && !userName) {
      setShowIdentityModal(true);
    }
  }, [sessionId, userName]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('coffeeyrd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const { t } = useTranslation();
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);

  const {
    snapshot,
    isConnected,
    typingUsers,
    addTopic,
    deleteTopic,
    toggleVote,
    changePhase,
    controlTimer,
    selectActiveTopic,
    updateNotes,
    moveTopicStatus,
    mergeTopics,
    undoMerge,
    castRomanVote,
    triggerRomanVoting,
    closeRomanVoting,
    sendTyping,
  } = useCoffeeSocket(sessionId, facilitatorToken);

  const handleMergeTopics = (sourceId: string, targetId: string) => {
    mergeTopics(sourceId, targetId);
    setUndoTargetId(targetId);
    setShowUndoToast(true);
  };

  const handleUndoMerge = (targetTopicId?: string) => {
    undoMerge(targetTopicId || undoTargetId || undefined);
    setShowUndoToast(false);
  };

  useEffect(() => {
    if (showUndoToast) {
      const timer = setTimeout(() => setShowUndoToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showUndoToast]);

  // Inicialização dinâmica do Umami Analytics (apenas se configurado via .env / backend)
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const pageTitle = snapshot?.session?.title
      ? `${snapshot.session.title} — CoffeeYrd`
      : 'CoffeeYrd — Reuniões Lean Coffee em Tempo Real';
    document.title = pageTitle;

    if (snapshot?.session?.title) {
      saveRecentSession({
        id: snapshot.session.id,
        title: snapshot.session.title,
        facilitatorToken: facilitatorToken || undefined,
        role: snapshot.is_facilitator ? 'facilitator' : 'participant',
      });
    }

    // Mascarar rotas: nunca enviar IDs ou tokens para o analytics
    trackPageView(sessionId ? '/room' : '/', pageTitle);
  }, [sessionId, snapshot?.session?.title, snapshot?.session?.id, facilitatorToken, snapshot?.is_facilitator]);

  const handleCreateSession = async (
    title: string,
    maxVotes: number,
    defaultTimeboxSeconds: number
  ) => {
    const apiHost =
      window.location.port === '5173' || window.location.port === '5175'
        ? 'http://localhost:8082'
        : '';
    const res = await fetch(`${apiHost}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        max_votes_per_user: maxVotes,
        default_timebox_seconds: defaultTimeboxSeconds,
      }),
    });

    if (!res.ok) throw new Error('Falha ao criar sessão');
    const data = await res.json();
    if (data.id) {
      sessionStorage.setItem(`coffee_token_${data.id}`, data.facilitator_token);
      localStorage.setItem(`coffee_token_${data.id}`, data.facilitator_token);
      saveRecentSession({
        id: data.id,
        title: title.trim(),
        facilitatorToken: data.facilitator_token,
        role: 'facilitator',
      });
      setSessionId(data.id);
      setFacilitatorToken(data.facilitator_token);
      window.history.pushState({}, '', `/session/${data.id}?token=${data.facilitator_token}`);
    }
  };

  const handleJoinSession = (id: string, token?: string | null) => {
    const effectiveToken =
      token ||
      sessionStorage.getItem(`coffee_token_${id}`) ||
      localStorage.getItem(`coffee_token_${id}`) ||
      null;

    setSessionId(id);
    if (effectiveToken) {
      setFacilitatorToken(effectiveToken);
      window.history.pushState({}, '', `/session/${id}?token=${effectiveToken}`);
    } else {
      setFacilitatorToken(null);
      window.history.pushState({}, '', `/session/${id}`);
    }
  };

  const handleLeaveSession = () => {
    setSessionId(null);
    setFacilitatorToken(null);
    window.history.pushState({}, '', '/');
  };

  const handleExport = async () => {
    if (!sessionId) return;
    const apiHost =
      window.location.port === '5173' || window.location.port === '5175'
        ? 'http://localhost:8082'
        : '';
    window.location.href = `${apiHost}/api/sessions/${sessionId}/export`;
  };

  if (!sessionId) {
    return (
      <HomeView
        onCreateSession={handleCreateSession}
        onJoinSession={handleJoinSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (!snapshot) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-primary)' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          {isConnected ? 'Sincronizando mesa de café...' : 'Conectando à sessão...'}
        </div>
      </div>
    );
  }

  const { session, topics, user_voted_topic_ids, is_facilitator, roman_voting } = snapshot;

  const activeTopic = topics.find((t) => t.id === roman_voting.topic_id);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        session={session}
        isFacilitator={is_facilitator}
        theme={theme}
        userName={userName}
        onEditIdentity={() => setShowIdentityModal(true)}
        onToggleTheme={toggleTheme}
        onLeave={handleLeaveSession}
        onExport={handleExport}
        onOpenMcp={() => setShowMcp(true)}
        onControlTimer={controlTimer}
        onChangePhase={changePhase}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {session.phase === 'IDEATION' && (
          <IdeationView
            topics={topics}
            isFacilitator={is_facilitator}
            userName={userName}
            onEditIdentity={() => setShowIdentityModal(true)}
            onAddTopic={addTopic}
            onDeleteTopic={deleteTopic}
            onMergeTopics={handleMergeTopics}
            onUndoMerge={handleUndoMerge}
          />
        )}

        {session.phase === 'VOTING' && (
          <VotingView
            topics={topics}
            userVotedTopicIds={user_voted_topic_ids}
            maxVotes={session.max_votes_per_user}
            isFacilitator={is_facilitator}
            onToggleVote={toggleVote}
            onMergeTopics={handleMergeTopics}
            onUndoMerge={handleUndoMerge}
          />
        )}

        {session.phase === 'DISCUSSION' && (
          <DiscussionView
            topics={topics}
            activeTopicId={session.active_topic_id}
            isFacilitator={is_facilitator}
            timerIsRunning={session.timer_is_running}
            timerSecondsRemaining={session.timer_seconds_remaining}
            onSelectActiveTopic={selectActiveTopic}
            onUpdateNotes={updateNotes}
            onControlTimer={controlTimer}
            onTriggerRomanVoting={triggerRomanVoting}
            onAdvanceToCompleted={() => changePhase('COMPLETED')}
            onMoveTopicStatus={moveTopicStatus}
            typingUsers={typingUsers}
            onSendTyping={sendTyping}
            currentUserName={userName}
          />
        )}

        {session.phase === 'COMPLETED' && (
          <SummaryView
            session={session}
            topics={topics}
            onExport={handleExport}
            onHome={handleLeaveSession}
          />
        )}
      </main>

      <RomanVoteModal
        state={roman_voting}
        topicTitle={activeTopic?.title}
        isFacilitator={is_facilitator}
        onCastVote={castRomanVote}
        onCloseVoting={closeRomanVoting}
      />

      <McpModal isOpen={showMcp} onClose={() => setShowMcp(false)} />

      <IdentityModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        onSave={(name) => {
          setUserName(name);
          setShowIdentityModal(false);
        }}
        isMandatory={!userName}
      />

      {/* Toast Flutuante de Feedback com Desfazer (Undo Merge) */}
      {showUndoToast && is_facilitator && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface-elevated, #1e293b)',
            border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.4))',
            borderRadius: 'var(--radius-full, 9999px)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
            {t('merge.toast_success')}
          </span>
          <button
            onClick={() => handleUndoMerge()}
            className="btn-primary"
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderRadius: 'var(--radius-full, 9999px)',
              cursor: 'pointer',
            }}
            title={t('merge.undo_tooltip')}
          >
            <Undo2 size={13} />
            {t('merge.undo_btn')}
          </button>
          <button
            onClick={() => setShowUndoToast(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
