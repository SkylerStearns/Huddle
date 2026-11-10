import React, { useState, useEffect } from 'react';
import type { DB, Person, TouchType } from './data/types';

// ---------- navigation ----------
export type Route =
  | { kind: 'leader'; id: string }
  | { kind: 'candidate'; id: string }
  | { kind: 'interview'; id: string }
  | { kind: 'coach'; id: string };

export interface Nav {
  push: (r: Route) => void;
  back: () => void;
  toast: (msg: string) => void;
}
export const NavContext = React.createContext<Nav>(null as unknown as Nav);
export const useNav = (): Nav => React.useContext(NavContext);

// ---------- icons (simple stroke icons) ----------
const paths: Record<string, string> = {
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75',
  clipboard: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 13l2 2 4-4',
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  check: 'M5 12l5 5L20 7',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  text: 'M4 5h16v11H8l-4 4V5z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  coffee: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  pen: 'M4 20h4L19 9l-4-4L4 16v4z',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? ''} />
    </svg>
  );
}
export const touchIcon = (t: TouchType) =>
  ({ 'In person': 'coffee', 'Call/Video': 'phone', '1:1 text': 'text', '1:1 email': 'mail', 'Roster message': 'megaphone' })[t];

// ---------- small pieces ----------
export function Avatar({ p, size }: { p?: Person; size?: 'sm' | 'lg' }) {
  const initials = p ? `${p.first[0]}${p.last[0]}` : '?';
  return <span className={`avatar ${size ?? ''}`}>{initials}</span>;
}
export function Levels({ value, label }: { value?: number; label: string }) {
  return (
    <span className="levels" role="img" aria-label={`${label} level ${value ?? 'not set'} of 4`}>
      {[1, 2, 3, 4].map(n => <i key={n} className={value && n <= value ? 'on' : ''} />)}
    </span>
  );
}
export function Seg<T extends string>({ value, options, onChange, wrap }: { value: T | undefined; options: readonly T[]; onChange: (v: T) => void; wrap?: boolean }) {
  return (
    <div className={`seg ${wrap ? 'wrap' : ''}`} role="group">
      {options.map(o => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
export function Back({ label = 'Back' }: { label?: string }) {
  const nav = useNav();
  return (
    <div className="backbar">
      <button className="backbtn" onClick={nav.back}><Icon name="left" size={18} />{label}</button>
    </div>
  );
}
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet gutter" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Contact buttons. Links may not open inside some previews, so the number and address are shown too. */
export function ContactRow({ p, text, subject, body }: { p: Person; text?: string; subject?: string; body?: string }) {
  const digits = p.phone.replace(/[^0-9]/g, '');
  const sms = `sms:${digits}${text ? `?&body=${encodeURIComponent(text)}` : ''}`;
  const mail = `mailto:${p.email}${subject || body ? `?subject=${encodeURIComponent(subject ?? '')}&body=${encodeURIComponent(body ?? '')}` : ''}`;
  return (
    <div className="stack-sm">
      <div className="btn-row">
        <a className="btn" href={`tel:${digits}`}><Icon name="phone" size={17} />Call</a>
        <a className="btn" href={sms}><Icon name="text" size={17} />Text</a>
        <a className="btn" href={mail}><Icon name="mail" size={17} />Email</a>
      </div>
      <p className="row-meta">{p.phone} · {p.email}</p>
    </div>
  );
}

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [v, setV] = useState(initial);
  return [v, () => setV(!v), setV];
}

export const peopleById = (db: DB) => Object.fromEntries(db.people.map(p => [p.id, p]));
