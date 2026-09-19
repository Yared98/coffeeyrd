import { useState, useEffect } from 'react';
import { useCoffeeSocket } from './hooks/useCoffeeSocket';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { IdeationView } from './components/IdeationView';
import { VotingView } from './components/VotingView';
import { DiscussionView } from './components/DiscussionView';
import { SummaryView } from './components/SummaryView';
import { RomanVoteModal } from './components/RomanVoteModal';
import { McpModal } from './components/McpModal';
import { saveRecentSession } from './utils/recentSessions';

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('coffeeyrd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const {
    snapshot,
    isConnected,
    addTopic,
    deleteTopic,
    toggleVote,
    changePhase,
    controlTimer,
    selectActiveTopic,
    updateNotes,
    moveTopicStatus,
    mergeTopics,
    castRomanVote,
    triggerRomanVoting,
    closeRomanVoting,
  } = useCoffeeSocket(sessionId, facilitatorToken);

  useEffect(() => {
    if (snapshot?.session?.title) {
      document.title = `${snapshot.session.title} — CoffeeYrd`;
      saveRecentSession({
        id: snapshot.session.id,
        title: snapshot.session.title,
        facilitatorToken: facilitatorToken || undefined,
        role: snapshot.is_facilitator ? 'facilitator' : 'participant',
      });
    } else {
      document.title = 'CoffeeYrd — Reuniões Lean Coffee em Tempo Real';
    }
  }, [snapshot?.session?.title, snapshot?.session?.id, facilitatorToken, snapshot?.is_facilitator]);

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
            onAddTopic={addTopic}
            onDeleteTopic={deleteTopic}
            onMergeTopics={mergeTopics}
          />
        )}

        {session.phase === 'VOTING' && (
          <VotingView
            topics={topics}
            userVotedTopicIds={user_voted_topic_ids}
            maxVotes={session.max_votes_per_user}
            onToggleVote={toggleVote}
            onMergeTopics={mergeTopics}
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
    </div>
  );
}
