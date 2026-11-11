import React, { useState } from 'react';
import type { DB } from './types';
import { sampleDB } from './sample';

// Demo storage: everything lives in this browser. The real version swaps this
// for calls to the Apps Script "back office", which reads and writes the Google Sheet.
const DB_KEY = 'huddle-demo-db-v2';
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

export type Mutate = (draft: DB) => void;

export function useStore() {
  const [db, setDb] = useState<DB>(() => read<DB>(DB_KEY) ?? sampleDB());
  const [userId, setUserIdState] = useState<string>(() => read<string>(USER_KEY) ?? 'P-010');

  const update = (fn: Mutate) =>
    setDb((prev: DB) => {
      const next: DB = JSON.parse(JSON.stringify(prev));
      fn(next);
      write(DB_KEY, next);
      return next;
    });
  const setUserId = (id: string) => {
    setUserIdState(id);
    write(USER_KEY, id);
  };
  const reset = () => {
    const fresh = sampleDB();
    write(DB_KEY, fresh);
    setDb(fresh);
  };
  return { db, update, userId, setUserId, reset };
}

export type Store = ReturnType<typeof useStore>;
export const StoreContext = React.createContext<Store>(null as unknown as Store);
export const useApp = (): Store => React.useContext(StoreContext);

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
