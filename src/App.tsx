import React, { useState, useEffect, useRef } from 'react';
import { useStore, StoreContext } from './data/store';
import type { Person } from './data/types';
import { person, isStaff, isSenior, waiting, canReview, activeSeason, coachesInScope, coachOf, ministryName, interviewFor, leadersOf, planDue, freshness } from './data/logic';
import { NavContext, type Route, Icon, Avatar, Sheet, Seg } from './ui';

type Theme = 'Auto' | 'Light' | 'Dark';
const THEME_KEY = 'huddle-theme';
const TIP_KEY = 'huddle-install-tip-hidden';

// Home-screen install: iPhone uses Share → Add to Home Screen; Android Chrome uses its menu.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IS_IOS = /iPhone|iPad|iPod/.test(ua);
const IS_PHONE = IS_IOS || /Android/.test(ua);
const IN_FRAME = typeof window !== 'undefined' && window.parent !== window; // e.g. a preview, where installing doesn't apply
const isInstalled = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
// Badge on the home-screen icon. iPhone allows it only after the person turns on notifications.
type BadgePermission = 'unsupported' | 'default' | 'granted' | 'denied';
const badgeSupported = () => typeof navigator !== 'undefined' && 'setAppBadge' in navigator && typeof Notification !== 'undefined';
const readBadgePermission = (): BadgePermission => (badgeSupported() ? (Notification.permission as BadgePermission) : 'unsupported');

function readFlag(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'Light' || v === 'Dark' ? v : 'Auto';
  } catch {
    return 'Auto';
  }
}
import { LeadersHome, LeaderDetail } from './screens/Leaders';
import { InterviewsHome, CandidateDetail, InterviewForm } from './screens/Interviews';
import { OverviewHome, CoachDetail } from './screens/Overview';
import { RosterHome } from './screens/Roster';
import { MessagesHome } from './screens/Messages';
import { SpacesHome } from './screens/Spaces';

type Tab = 'overview' | 'leaders' | 'interviews' | 'roster' | 'messages' | 'spaces';
const TAB_META: Record<Tab, { label: string; icon: string }> = {
  overview: { label: 'Home', icon: 'home' },
  leaders: { label: 'Leaders', icon: 'users' },
  interviews: { label: 'Interviews', icon: 'clipboard' },
  roster: { label: 'Roster', icon: 'swap' },
  messages: { label: 'Messages', icon: 'send' },
  spaces: { label: 'Spaces', icon: 'chat' },
};

function tabsFor(me: Person): Tab[] {
  if (isStaff(me)) return ['overview', 'interviews', 'roster', 'messages', 'spaces'];
  if (isSenior(me)) return ['overview', 'leaders', 'interviews', 'messages', 'spaces'];
  return me.isInterviewer ? ['leaders', 'interviews', 'messages', 'spaces'] : ['leaders', 'messages', 'spaces'];
}

const ROLE_BLURB: Record<string, string> = {
  Staff: 'Sees everything, reviews interviews, moves leaders',
  'Senior Coach': 'Sees their coaches, urgent topics and their ministry’s interviews',
  Coach: 'Sees only their own leaders',
};

export default function App() {
  const store = useStore();
  const { db, userId, setUserId, reset } = store;
  const me = person(db, userId) ?? db.people[0];
  const tabs = tabsFor(me);
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [stack, setStack] = useState<Route[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [tipHidden, setTipHidden] = useState<boolean>(() => readFlag(TIP_KEY));
  const installed = isInstalled();
  const showTip = IS_PHONE && !installed && !IN_FRAME && !tipHidden;
  const hideTip = () => { setTipHidden(true); try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ } };

  // Auto follows the phone's light/dark setting; Light and Dark override it.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'Auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme.toLowerCase());
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* not saved; still applies this visit */ }
  }, [theme]);

  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [userId]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, stack.length]);

  // Register the background helper (not inside previews, which can't install apps).
  useEffect(() => {
    if (IN_FRAME || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* app still works without it */ });
  }, []);

  // Recount when the app comes back to the screen (dates may have moved on).
  const [, setWake] = useState(0);
  useEffect(() => {
    const onShow = () => { if (document.visibilityState === 'visible') { setWake(n => n + 1); setBadgePermission(readBadgePermission()); } };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);
  const [badgePermission, setBadgePermission] = useState<BadgePermission>(readBadgePermission);
  const turnOnBadge = async () => {
    try {
      const result = await Notification.requestPermission();
      setBadgePermission(result as BadgePermission);
      if (result === 'granted') nav.toast('Badge turned on');
    } catch {
      setBadgePermission(readBadgePermission());
    }
  };

  const nav = {
    push: (r: Route) => setStack(s => [...s, r]),
    back: () => setStack(s => s.slice(0, -1)),
    toast: (msg: string) => {
      setToast(msg);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2600);
    },
  };
  const goTab = (t: string) => { setStack([]); setTab(t as Tab); };

  // badge counts
  const season = activeSeason(db);
  const cands = db.candidates.filter(c => !season || c.season === season.id);
  const interviewBadge =
    cands.filter(c => c.interviewer === me.id && waiting(db, c).flag === 'interviewer').length +
    cands.filter(c => canReview(me, c) && interviewFor(db, c.id)?.submitted && c.status === 'Submitted').length;
  const scope = new Set(coachesInScope(db, me).map(c => c.id));
  const overviewBadge = db.topics.filter(t => t.status === 'Open' && t.type === 'Urgent' && scope.has(coachOf(db, t.leader) ?? '')).length;
  const checkinsDue = leadersOf(db, me.id).filter(l => l.status === 'Active' && freshness(db, l).state === 'due').length;
  const leadersBadge = planDue(db, me.id).length + checkinsDue;
  const badges: Partial<Record<Tab, number>> = { interviews: interviewBadge, overview: overviewBadge, leaders: leadersBadge };
  const iconBadge = (tabs.includes('interviews') ? interviewBadge : 0) + (tabs.includes('overview') ? overviewBadge : 0) + (tabs.includes('leaders') ? leadersBadge : 0);

  useEffect(() => {
    if (badgePermission !== 'granted' || !badgeSupported()) return;
    const n = navigator as Navigator & { setAppBadge: (n?: number) => Promise<void>; clearAppBadge: () => Promise<void> };
    (iconBadge > 0 ? n.setAppBadge(iconBadge) : n.clearAppBadge()).catch(() => { /* not allowed here */ });
  }, [iconBadge, badgePermission]);

  const top = stack[stack.length - 1];
  let screen: React.ReactNode;
  if (top?.kind === 'leader') screen = <LeaderDetail key={top.id} id={top.id} />;
  else if (top?.kind === 'candidate') screen = <CandidateDetail key={top.id} id={top.id} />;
  else if (top?.kind === 'interview') screen = <InterviewForm key={top.id} id={top.id} />;
  else if (top?.kind === 'coach') screen = <CoachDetail key={top.id} id={top.id} />;
  else if (tab === 'overview') screen = <OverviewHome goTab={goTab} />;
  else if (tab === 'leaders') screen = <LeadersHome />;
  else if (tab === 'interviews') screen = <InterviewsHome />;
  else if (tab === 'roster') screen = <RosterHome />;
  else if (tab === 'messages') screen = <MessagesHome />;
  else screen = <SpacesHome />;

  const switchable = db.people.filter(p => p.role !== 'Leader' && p.status === 'Active');

  return (
    <StoreContext.Provider value={store}>
      <NavContext.Provider value={nav}>
        <div className="shell">
          <header className="topbar gutter">
            <div className="brand">Huddle<small>Demo · sample people</small></div>
            <button className="whoami" onClick={() => setSwitching(true)} aria-label={`Signed in as ${me.first} ${me.last}. Settings and switch person`}>
              <Avatar p={me} size="sm" /><span>{me.first} · {me.role}</span>
            </button>
          </header>
          <div className="demo-note gutter">
            <span>Every person here is made up. Changes stay in this browser only.</span>
            {confirmReset ? (
              <span style={{ display: 'inline-flex', gap: 10 }}>
                <button className="linkbtn" onClick={() => { reset(); setStack([]); setConfirmReset(false); nav.toast('Demo reset'); }}>Yes, reset</button>
                <button className="linkbtn" onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>
            ) : (
              <button className="linkbtn" onClick={() => setConfirmReset(true)}>Reset demo</button>
            )}
          </div>
          {showTip && (
            <div className="gutter" style={{ paddingBlock: 12 }}>
              <div className="callout accent">
                <Icon name="plus" />
                <div className="callout-body">
                  <strong>Put Huddle on your home screen</strong>
                  <span>{IS_IOS ? 'Tap the Share button (in Safari or Chrome), then Add to Home Screen. It opens full screen like an app.' : 'Open your browser menu and choose Add to Home screen or Install app.'}</span>
                  <div><button className="btn" onClick={hideTip}>Got it</button></div>
                </div>
              </div>
            </div>
          )}
          <main className="gutter">{screen}</main>
        </div>

        <nav className="tabbar" aria-label="Main">
          <div className="tabbar-inner">
            {tabs.map(t => (
              <button key={t} className="tab" aria-current={tab === t && !stack.length ? 'page' : undefined} onClick={() => goTab(t)}>
                <Icon name={TAB_META[t].icon} size={22} />
                {TAB_META[t].label}
                {!!badges[t] && <span className="badge">{badges[t]}</span>}
              </button>
            ))}
          </div>
        </nav>

        {switching && (
          <Sheet title="Settings" onClose={() => setSwitching(false)}>
            <div className="field">
              <span className="label">Appearance</span>
              <Seg value={theme} options={['Auto', 'Light', 'Dark'] as const} onChange={setTheme} />
              <span className="row-meta">{theme === 'Auto' ? 'Matches your phone’s light or dark setting.' : `Always ${theme.toLowerCase()}, whatever your phone is set to.`}</span>
            </div>
            {!IN_FRAME && (
              <div className="field">
                <span className="label">Home screen</span>
                {installed ? (
                  <span className="row-meta"><Icon name="check" size={14} /> Huddle is on your home screen.</span>
                ) : (
                  <span className="row-meta">
                    {IS_IOS
                      ? 'On iPhone: tap the Share button in Safari or Chrome, then Add to Home Screen.'
                      : 'On Android: open the browser menu and choose Add to Home screen or Install app. On iPhone: tap Share in Safari or Chrome, then Add to Home Screen.'}
                  </span>
                )}
              </div>
            )}
            {!IN_FRAME && (
              <div className="field">
                <span className="label">Badge on the app icon</span>
                {badgePermission === 'granted' && (
                  <span className="row-meta"><Icon name="check" size={14} /> On · showing {iconBadge} {iconBadge === 1 ? 'thing' : 'things'} that need you. It updates whenever you open Huddle.</span>
                )}
                {badgePermission === 'default' && (
                  <>
                    <span className="row-meta">Shows a number on Huddle’s icon for check-ins due, interviews waiting on you and urgent topics.</span>
                    <div><button className="btn" onClick={turnOnBadge}><Icon name="bell" size={16} />Turn on badge</button></div>
                  </>
                )}
                {badgePermission === 'denied' && (
                  <span className="row-meta">Turned off. To turn it back on, open your phone’s Settings → Notifications → Huddle.</span>
                )}
                {badgePermission === 'unsupported' && (
                  <span className="row-meta">{installed ? 'This phone or browser doesn’t support icon badges.' : 'Add Huddle to your home screen first, then open it from there to turn this on.'}</span>
                )}
              </div>
            )}
            <div className="divider" />
            <h2>View the app as…</h2>
            <p className="sub">In the real app, everyone signs in with their own Google account and sees only their part. Pick a person to see their view.</p>
            {(['Staff', 'Senior Coach', 'Coach'] as const).map(role => (
              <div key={role} className="stack-sm">
                <span className="eyebrow">{role === 'Senior Coach' ? 'Senior coaches' : role === 'Coach' ? 'Coaches' : 'Staff'} · {ROLE_BLURB[role]}</span>
                <div className="list">
                  {switchable.filter(p => p.role === role).map(p => (
                    <button key={p.id} className="row" onClick={() => { setUserId(p.id); setStack([]); setTab(tabsFor(p)[0]); setSwitching(false); }}>
                      <Avatar p={p} size="sm" />
                      <div className="row-main">
                        <span className="row-title">{p.first} {p.last}{p.id === me.id && <span className="pill accent">Current</span>}</span>
                        <span className="row-meta">
                          {ministryName(db, p.ministry)}
                          {p.role !== 'Staff' ? ` · ${leadersOf(db, p.id).length} ${leadersOf(db, p.id).length === 1 ? 'leader' : 'leaders'}` : ''}
                          {p.isInterviewer && p.role === 'Coach' ? ' · interviewer' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Sheet>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </NavContext.Provider>
    </StoreContext.Provider>
  );
}
