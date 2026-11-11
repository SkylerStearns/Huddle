import React, { useEffect, useRef, useState } from 'react';
import type { DB } from './types';
import { sampleDB } from './sample';
import { LIVE } from '../config';
import { call, getToken, load, SignInNeeded, signOut as clearSignIn } from './api';

// Two modes:
// - Demo: sample people, everything lives in this browser.
// - Live: data comes from the Apps Script back office, and each change is sent back to the sheet.
const DB_KEY = 'huddle-demo-db-v3'; // bump when the sample data's shape changes
const USER_KEY = 'lgc-demo-user';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: demo still works for this visit */
  }
}

const emptyDB = (): DB => ({
  people: [], ministries: [], groups: [], assignments: [], moveRequests: [], seasons: [], candidates: [], steps: [],
  candidateSteps: [], nudges: [], questions: [], points: [], interviews: [], touchPoints: [], topics: [], coachNotes: [],
  handoffs: [], plans: [], planSteps: [], planAttachments: [], templates: [], pushes: [], rosterMessages: [], spaces: [],
});

// Tables the app may change. Must match WRITABLE in apps-script/Code.gs.
const WRITABLE = ['people', 'groups', 'assignments', 'moveRequests', 'candidates', 'candidateSteps', 'nudges', 'interviews',
  'touchPoints', 'topics', 'coachNotes', 'handoffs', 'planAttachments', 'pushes', 'rosterMessages'] as const;
type Changes = Record<string, { upsert: unknown[]; remove: string[] }>;

// What changed between two copies of the data, table by table, matched on id.
function diff(prev: DB, next: DB): Changes {
  const out: Changes = {};
  for (const t of WRITABLE) {
    const before = new Map((prev[t] as { id: string }[]).map(r => [r.id, JSON.stringify(r)]));
    const after = next[t] as { id: string }[];
    const upsert = after.filter(r => before.get(r.id) !== JSON.stringify(r));
    const ids = new Set(after.map(r => r.id));
    const remove = [...before.keys()].filter(id => !ids.has(id));
    if (upsert.length || remove.length) out[t] = { upsert, remove };
  }
  return out;
}

export type Status = 'signed-out' | 'loading' | 'ready' | 'error';
export type Mutate = (draft: DB) => void;

export function useStore() {
  const [db, setDbState] = useState<DB>(() => (LIVE ? emptyDB() : read<DB>(DB_KEY) ?? sampleDB()));
  const dbRef = useRef(db);
  const setDb = (next: DB) => { dbRef.current = next; setDbState(next); };
  const [userId, setUserIdState] = useState<string>(() => (LIVE ? '' : read<string>(USER_KEY) ?? 'P-010'));
  const [status, setStatus] = useState<Status>(LIVE ? (getToken() ? 'loading' : 'signed-out') : 'ready');
  const [error, setError] = useState<string>('');
  const [guildId, setGuildId] = useState('');
  const [syncNote, setSyncNote] = useState<string>('');

  const refresh = async () => {
    if (!LIVE) return;
    setStatus('loading');
    try {
      const r = await load();
      setDb(r.db);
      setUserIdState(r.me);
      setGuildId(r.guildId);
      setStatus('ready');
    } catch (e) {
      if (e instanceof SignInNeeded) setStatus('signed-out');
      else { setError((e as Error).message); setStatus('error'); }
    }
  };
  useEffect(() => { if (LIVE && getToken()) refresh(); }, []);

  const update = (fn: Mutate) => {
    const prev = dbRef.current;
    const next: DB = JSON.parse(JSON.stringify(prev));
    fn(next);
    setDb(next);
    if (!LIVE) { write(DB_KEY, next); return; }
    const changes = diff(prev, next);
    if (!Object.keys(changes).length) return;
    call('save', { changes }).catch(e => {
      // Put the screen back to what the sheet really says.
      setSyncNote(e instanceof SignInNeeded ? 'Please sign in again.' : `Not saved: ${(e as Error).message}`);
      if (e instanceof SignInNeeded) setStatus('signed-out');
      else refresh();
    });
  };
  const setUserId = (id: string) => {
    if (LIVE) return;
    setUserIdState(id);
    write(USER_KEY, id);
  };
  const reset = () => {
    if (LIVE) { refresh(); return; }
    const fresh = sampleDB();
    write(DB_KEY, fresh);
    setDb(fresh);
  };
  const signOut = () => {
    clearSignIn();
    setDb(emptyDB());
    setUserIdState('');
    setStatus('signed-out');
  };
  return { db, update, userId, setUserId, reset, status, error, refresh, signOut, guildId, syncNote, clearSyncNote: () => setSyncNote('') };
}

export type Store = ReturnType<typeof useStore>;
export const StoreContext = React.createContext<Store>(null as unknown as Store);
export const useApp = (): Store => React.useContext(StoreContext);

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
