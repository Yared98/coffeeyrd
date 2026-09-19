import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  SessionPhase,
  SessionSnapshot,
  RomanVoteChoice,
  TopicStatus,
} from '../types';

export function useCoffeeSocket(sessionId: string | null, facilitatorToken: string | null) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const sessionHashRef = useRef<string>((() => {
    let hash = sessionStorage.getItem('coffee_session_hash');
    if (!hash) {
      // Usa crypto.randomUUID() para maior entropia e evitar colisões entre participantes
      hash = 'usr_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      sessionStorage.setItem('coffee_session_hash', hash);
    }
    return hash;
  })());

  useEffect(() => {
    if (!sessionId) {
      setSnapshot(null);
      setIsConnected(false);
      return;
    }

    const host =
      window.location.port === '5173' || window.location.port === '5175'
        ? 'localhost:8082'
        : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const tokenParam = facilitatorToken ? `&token=${encodeURIComponent(facilitatorToken)}` : '';
    const wsUrl = `${protocol}//${host}/ws/session/${sessionId}?session_hash=${sessionHashRef.current}${tokenParam}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SNAPSHOT') {
          setSnapshot(msg.payload);
        } else if (msg.type === 'ROMAN_VOTING_STARTED') {
          setSnapshot((prev) => (prev ? { ...prev, roman_voting: msg.payload } : prev));
        } else if (msg.type === 'ROMAN_VOTE_UPDATED') {
          setSnapshot((prev) =>
            prev
              ? {
                  ...prev,
                  roman_voting: {
                    ...prev.roman_voting,
                    extend_votes: msg.payload.extend,
                    next_votes: msg.payload.next,
                    neutral_votes: msg.payload.neutral,
                  },
                }
              : prev
          );
        }
      } catch (err) {
        console.error('Falha ao processar mensagem WS:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [sessionId, facilitatorToken]);

  const send = useCallback((action: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, payload }));
    }
  }, []);

  const addTopic = useCallback(
    (title: string, description?: string, authorName?: string) => {
      send('ADD_TOPIC', { title, description, author_name: authorName || 'Anônimo' });
    },
    [send]
  );

  const deleteTopic = useCallback(
    (topicId: string) => {
      send('DELETE_TOPIC', { topic_id: topicId });
    },
    [send]
  );

  const toggleVote = useCallback(
    (topicId: string) => {
      send('TOGGLE_VOTE', { topic_id: topicId });
    },
    [send]
  );

  const changePhase = useCallback(
    (phase: SessionPhase) => {
      send('CHANGE_PHASE', { phase });
    },
    [send]
  );

  const controlTimer = useCallback(
    (command: 'START' | 'PAUSE' | 'RESET' | 'ADD_SECONDS', seconds?: number) => {
      send('CONTROL_TIMER', { command, seconds });
    },
    [send]
  );

  const selectActiveTopic = useCallback(
    (topicId: string) => {
      send('SELECT_ACTIVE_TOPIC', { topic_id: topicId });
    },
    [send]
  );

  const updateNotes = useCallback(
    (topicId: string, notes: string) => {
      send('UPDATE_TOPIC_NOTES', { topic_id: topicId, notes });
    },
    [send]
  );

  const moveTopicStatus = useCallback(
    (topicId: string, status: TopicStatus) => {
      send('MOVE_TOPIC_STATUS', { topic_id: topicId, status });
    },
    [send]
  );

  const mergeTopics = useCallback(
    (sourceTopicId: string, targetTopicId: string) => {
      send('MERGE_TOPICS', { source_topic_id: sourceTopicId, target_topic_id: targetTopicId });
    },
    [send]
  );

  const undoMerge = useCallback(
    (targetTopicId?: string) => {
      send('UNDO_MERGE', { target_topic_id: targetTopicId || null });
    },
    [send]
  );

  const castRomanVote = useCallback(
    (choice: RomanVoteChoice) => {
      send('CAST_ROMAN_VOTE', { choice });
    },
    [send]
  );

  const triggerRomanVoting = useCallback(() => {
    send('TRIGGER_ROMAN_VOTING', {});
  }, [send]);

  const closeRomanVoting = useCallback(
    (extend: boolean) => {
      send('CLOSE_ROMAN_VOTING', { extend });
    },
    [send]
  );

  return {
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
    undoMerge,
    castRomanVote,
    triggerRomanVoting,
    closeRomanVoting,
  };
}
