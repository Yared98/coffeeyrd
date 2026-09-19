export interface RecentSession {
  id: string;
  title: string;
  facilitatorToken?: string | null;
  role: 'facilitator' | 'participant';
  updatedAt: number;
}

const STORAGE_KEY = 'coffeeyrd_recent_sessions';

export function getRecentSessions(): RecentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: RecentSession[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveRecentSession(session: {
  id: string;
  title?: string;
  facilitatorToken?: string | null;
  role?: 'facilitator' | 'participant';
}): void {
  try {
    if (!session.id) return;
    const all = getRecentSessions();
    const current = all.filter((s) => s.id !== session.id);
    const existing = all.find((s) => s.id === session.id);

    const facilitatorToken =
      session.facilitatorToken ||
      existing?.facilitatorToken ||
      sessionStorage.getItem(`coffee_token_${session.id}`) ||
      localStorage.getItem(`coffee_token_${session.id}`) ||
      null;

    const role = session.role || (facilitatorToken ? 'facilitator' : existing?.role || 'participant');
    const title =
      session.title && session.title !== session.id
        ? session.title
        : existing?.title || session.title || 'Mesa de Café';

    const updated: RecentSession[] = [
      {
        id: session.id,
        title,
        facilitatorToken,
        role,
        updatedAt: Date.now(),
      },
      ...current,
    ].slice(0, 15);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (facilitatorToken) {
      localStorage.setItem(`coffee_token_${session.id}`, facilitatorToken);
      sessionStorage.setItem(`coffee_token_${session.id}`, facilitatorToken);
    }
  } catch (err) {
    console.error('Erro ao salvar sessão recente:', err);
  }
}

export function removeRecentSession(id: string): RecentSession[] {
  try {
    const updated = getRecentSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
