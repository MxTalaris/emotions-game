import { PersonalityId } from '../types';

const STORAGE_KEY = 'emotions-game-session';
/** Personalities discovered across every run — survives clearGameSession(). */
const COLLECTION_KEY = 'emotions-game-personalities';

export interface GameSession {
  personalities: PersonalityId[];
}

function emptySession(): GameSession {
  return { personalities: [] };
}

export function loadGameSession(): GameSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();

    const parsed = JSON.parse(raw) as Partial<GameSession>;
    const personalities = Array.isArray(parsed.personalities)
      ? parsed.personalities.filter((id): id is PersonalityId => typeof id === 'string')
      : [];

    return { personalities };
  } catch {
    return emptySession();
  }
}

export function saveGameSession(session: GameSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function addPersonalityToSession(personalityId: PersonalityId): GameSession {
  const session = loadGameSession();
  if (!session.personalities.includes(personalityId)) {
    session.personalities.push(personalityId);
    saveGameSession(session);
  }
  addPersonalityToCollection(personalityId);
  return session;
}

export function clearGameSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadPersonalityCollection(): PersonalityId[] {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is PersonalityId => typeof id === 'string');
  } catch {
    return [];
  }
}

export function addPersonalityToCollection(personalityId: PersonalityId): PersonalityId[] {
  const collection = loadPersonalityCollection();
  if (collection.includes(personalityId)) return collection;

  collection.push(personalityId);
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  return collection;
}
