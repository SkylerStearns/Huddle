import React from 'react';
import { useApp } from '../data/store';
import type { Person, TouchType } from '../data/types';
import {
  person, fullName, firstName, coachesInScope, leadersOf, coachOf, touchesFor, freshness, daysSince, isStaff, waiting,
  canReview, interviewFor, activeSeason, fmtDate, addDays, ministryName, relative,
} from '../data/logic';
import { Avatar, Icon, Back, Empty, ContactRow, useNav } from '../ui';
import { LeaderRow } from './Leaders';

const MIX: { type: TouchType; label: string; color: string }[] = [
  { type: 'In person', label: 'In person', color: 'var(--accent)' },
  { type: 'Call/Video', label: 'Call', color: 'var(--info)' },
  { type: '1:1 text', label: 'Text', color: 'var(--warn)' },
  { type: '1:1 email', label: 'Email', color: 'var(--crit)' },
  { type: 'Roster message', label: 'Group message', color: 'var(--muted)' },
];

function coachDigest(db: any, coach: Person) {
  const leaders = leadersOf(db, coach.id).filter(l => l.status === 'Active');
  const connected = leaders.filter(l => touchesFor(db, l.id).some(t => daysSince(t.date) <= 30));
  const season = activeSeason(db);
  const touches = leaders.flatMap(l => touchesFor(db, l.id)).filter(t => !season || t.date >= season.start);
  const mix = MIX.map(m => ({ ...m, n: touches.filter(t => t.type === m.type).length }));
  const quiet = leaders.filter(l => freshness(db, l).state === 'due');
  return { leaders, connected, mix, total: touches.length, quiet };
}

function DigestCard({ coach }: { coach: Person }) {
  const { db } = useApp();
  const nav = useNav();
  const d = coachDigest(db, coach);
  const text = `Hey ${coach.first}! Just checking in on how coaching is going. Anything I can help with?`;
  return (
    <div className="card">
      <div className="spread">
        <button className="backbtn" style={{ color: 'var(--ink)' }} onClick={() => nav.push({ kind: 'coach', id: coach.id })}>
          <Avatar p={coach} size="sm" /><strong>{coach.first} {coach.last}</strong>
        </button>
        <span className="mono row-meta">{d.connected.length} of {d.leaders.length} connected this month</span>
      </div>
      {d.total > 0 ? (
        <>
          <div className="mixbar" role="img" aria-label={d.mix.filter(m => m.n).map(m => `${m.n} ${m.label}`).join(', ')}>
            {d.mix.filter(m => m.n).map(m => <span key={m.type} style={{ width: `${(m.n / d.total) * 100}%`, background: m.color }} />)}
          </div>
          <div className="legend">{d.mix.filter(m => m.n).map(m => <span key={m.type}><i style={{ background: m.color }} />{m.n} {m.label.toLowerCase()}</span>)}</div>
        </>
      ) : <span className="row-meta">{d.leaders.length ? 'No check-ins logged this season yet.' : 'No active leaders right now (all paused).'}</span>}
      {d.quiet.length > 0 && <span className="row-meta">Haven’t heard from anyone in a while: {d.quiet.map(q => q.first).join(', ')}</span>}
      <div className="btn-row">
        <a className="btn" href={`sms:${coach.phone.replace(/[^0-9]/g, '')}?&body=${encodeURIComponent(text)}`}><Icon name="text" size={17} />Encourage</a>
        <button className="btn" onClick={() => nav.push({ kind: 'coach', id: coach.id })}>Leaders</button>
      </div>
    </div>
  );
}

export function OverviewHome({ goTab }: { goTab: (t: string) => void }) {
  const { db, userId } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const staff = isStaff(me);
  const coaches = coachesInScope(db, me).filter(c => leadersOf(db, c.id).length > 0);
  const coachIds = new Set(coachesInScope(db, me).map(c => c.id));
  const urgent = db.topics.filter(t => t.status === 'Open' && t.type === 'Urgent' && coachIds.has(coachOf(db, t.leader) ?? ''));
  const season = activeSeason(db);
  const cands = db.candidates.filter(c => (!season || c.season === season.id) && canReview(me, c));
  const stalled = cands.filter(c => waiting(db, c).flag === 'interviewer');
  const quietCands = cands.filter(c => waiting(db, c).flag === 'candidate');
  const rock = cands.filter(c => { const iv = interviewFor(db, c.id); return iv?.submitted && !iv.rockDone; });
  const rosterCount = staff
    ? db.moveRequests.filter(r => r.status === 'Pending').length + db.assignments.filter(a => !a.end && (a.temporary || !a.externalUpdated)).length
    : 0;
  const myRequests = !staff ? db.moveRequests.filter(r => r.status === 'Pending' && coachIds.has(coachOf(db, r.leader) ?? '')) : [];
  const future = db.interviews.filter(i => i.potentialCoach && i.submitted && (staff || canReview(me, db.candidates.find(c => c.id === i.candidate)!)));
  const total = urgent.length + stalled.length + quietCands.length + rock.length + (rosterCount ? 1 : 0) + myRequests.length;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">{staff ? 'Staff' : `Senior coach · ${ministryName(db, me.ministry)}`}</span>
        <h1>Hi {me.first}</h1>
        <p className="sub">{staff ? 'Everything across ministries that could use a hand.' : 'How your coaches and their leaders are doing.'}</p>
      </div>

      <section className="section">
        <div className="section-head"><h2>Needs attention</h2><span className="count">{total}</span></div>
        <div className="list">
          {total === 0 && <Empty>All clear.</Empty>}
          {urgent.map(t => {
            const l = person(db, t.leader)!;
            return (
              <button key={t.id} className="row" onClick={() => nav.push({ kind: 'leader', id: l.id })}>
                <span className="pill crit"><Icon name="flag" size={12} />Urgent</span>
                <div className="row-main"><span className="row-title">{l.first}: {t.title}</span><span className="row-meta">Coach {fullName(db, coachOf(db, l.id))} · raised {relative(t.created).toLowerCase()}</span></div>
                <span className="chev"><Icon name="right" size={18} /></span>
              </button>
            );
          })}
          {stalled.map(c => {
            const w = waiting(db, c);
            return (
              <button key={c.id} className="row" onClick={() => nav.push({ kind: 'candidate', id: c.id })}>
                <span className="pill crit">Interview</span>
                <div className="row-main"><span className="row-title">{firstName(db, c.interviewer)} hasn’t moved on {firstName(db, c.person)}</span><span className="row-meta">{w.label} · {w.days} days</span></div>
                <span className="chev"><Icon name="right" size={18} /></span>
              </button>
            );
          })}
          {quietCands.map(c => (
            <button key={c.id} className="row" onClick={() => nav.push({ kind: 'candidate', id: c.id })}>
              <span className="pill warn">Quiet</span>
              <div className="row-main"><span className="row-title">{fullName(db, c.person)} hasn’t replied</span><span className="row-meta">{waiting(db, c).days} days · {(n => `${n} ${n === 1 ? 'nudge' : 'nudges'} logged`)(db.nudges.filter(n => n.candidate === c.id).length)}</span></div>
              <span className="chev"><Icon name="right" size={18} /></span>
            </button>
          ))}
          {rock.map(c => (
            <button key={c.id} className="row" onClick={() => nav.push({ kind: 'candidate', id: c.id })}>
              <span className="pill info">Rock</span>
              <div className="row-main"><span className="row-title">Enter {firstName(db, c.person)}’s interview in Rock</span><span className="row-meta">Submitted {fmtDate(interviewFor(db, c.id)?.submittedDate)}</span></div>
              <span className="chev"><Icon name="right" size={18} /></span>
            </button>
          ))}
          {myRequests.map(r => (
            <div key={r.id} className="row">
              <span className="pill info">Move</span>
              <div className="row-main"><span className="row-title">{firstName(db, r.requestedBy)} suggested moving {firstName(db, r.leader)} to {firstName(db, r.suggestedCoach)}</span><span className="row-meta">Waiting on staff</span></div>
            </div>
          ))}
          {rosterCount > 0 && (
            <button className="row" onClick={() => goTab('roster')}>
              <span className="pill info">Roster</span>
              <div className="row-main"><span className="row-title">{rosterCount} roster {rosterCount === 1 ? 'item' : 'items'} to handle</span><span className="row-meta">Move requests, leaders needing a coach, system updates</span></div>
              <span className="chev"><Icon name="right" size={18} /></span>
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Monthly coaching digest</h2></div>
        <p className="row-meta">Shows that check-ins happened, never what was said. Coaches see the same summary about themselves.</p>
        {coaches.map(c => <DigestCard key={c.id} coach={c} />)}
      </section>

      {future.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Future coaches</h2><span className="count">{future.length}</span></div>
          <div className="list">
            {future.map(i => {
              const c = db.candidates.find(x => x.id === i.candidate)!;
              const p = person(db, c.person)!;
              const reach = addDays(i.submittedDate ?? i.date, 182);
              return (
                <button key={i.id} className="row" onClick={() => nav.push({ kind: 'leader', id: p.id })}>
                  <Avatar p={p} size="sm" />
                  <div className="row-main">
                    <span className="row-title"><Icon name="star" size={14} />{p.first} {p.last}</span>
                    <span className="row-meta">{i.potentialNote || 'Flagged in their interview'} · flagged by {firstName(db, i.interviewer)}</span>
                  </div>
                  <div className="row-side"><span className="row-meta">Reach out</span><span>{fmtDate(reach)}</span></div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export function CoachDetail({ id }: { id: string }) {
  const { db } = useApp();
  const coach = person(db, id)!;
  const d = coachDigest(db, coach);
  const all = leadersOf(db, id);
  return (
    <div className="page">
      <Back />
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar p={coach} size="lg" />
        <div className="stack-sm">
          <h1>{coach.first} {coach.last}</h1>
          <span className="sub">{coach.role} · {ministryName(db, coach.ministry)}{coach.seniorCoach ? ` · with ${fullName(db, coach.seniorCoach)}` : ''}</span>
        </div>
      </div>
      <ContactRow p={coach} />
      <dl className="kv" style={{ margin: 0 }}>
        <div><dt>Leaders</dt><dd className="mono">{all.length}</dd></div>
        <div><dt>Connected · 30 days</dt><dd className="mono">{d.connected.length} of {d.leaders.length}</dd></div>
        <div><dt>Check-ins this season</dt><dd className="mono">{d.total}</dd></div>
      </dl>
      <section className="section">
        <div className="section-head"><h2>Leaders</h2></div>
        <div className="list">{all.length === 0 ? <Empty>No leaders assigned.</Empty> : all.map(l => <LeaderRow key={l.id} leader={l} />)}</div>
      </section>
    </div>
  );
}
