export type SessionPhase = 'IDEATION' | 'VOTING' | 'DISCUSSION' | 'COMPLETED';

export type TopicStatus = 'TO_DISCUSS' | 'DISCUSSING' | 'DISCUSSED';

export type RomanVoteChoice = 'EXTEND' | 'NEXT' | 'NEUTRAL';

export interface Topic {
  id: string;
  session_id: string;
  title: string;
  description?: string | null;
  author_name: string;
  status: TopicStatus;
  vote_count: number;
  duration_seconds_spent: number;
  notes: string;
  created_at: string;
}

export interface RomanVotingState {
  is_active: boolean;
  topic_id?: string | null;
  seconds_remaining: number;
  extend_votes: number;
  next_votes: number;
  neutral_votes: number;
}

export interface Session {
  id: string;
  title: string;
  phase: SessionPhase;
  max_votes_per_user: number;
  default_timebox_seconds: number;
  timer_seconds_remaining: number;
  timer_is_running: boolean;
  timer_ends_at?: number | null;
  active_topic_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSnapshot {
  session: Session;
  topics: Topic[];
  user_voted_topic_ids: string[];
  is_facilitator: boolean;
  online_count: number;
  roman_voting: RomanVotingState;
}
