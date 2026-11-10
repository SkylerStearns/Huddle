import React, { useState } from 'react';
import { useApp, uid } from '../data/store';
import type { DB, Person } from '../data/types';
import { person, fullName, firstName, coachOf, leadersOf, coachesInScope, today, isStaff, fmtDate } from '../data/logic';
import { Avatar, Icon, Sheet, Empty, useNav } from '../ui';
import { LeaderRow } from './Leaders';

/** Moves a leader to a new coach: ends the current assignment, starts a new one, keeps history. */
export function moveLeader(d: DB, leader: string, to: string, opts: { by: string; reason: string; temporary?: boolean; handoff?: string; external?: boolean }) {
  const cur = d.assignments.find(a => a.leader === leader && !a.end);
  if (cur) cur.end = today();
  d.assignments.push({
    id: uid('A'), leader, coach: to, start: today(), temporary: !!opts.temporary, reason: opts.reason, movedBy: opts.by,
    externalUpdated: !!opts.external, externalBy: opts.external ? opts.by : undefined, externalDate: opts.external ? today() : undefined,
  });
  if (opts.handoff && cur) d.handoffs.push({ id: uid('HO'), leader, from: cur.coach, to, date: today(), note: opts.handoff });
  for (const r of d.moveRequests) if (r.leader === leader && r.status === 'Pending') { r.status = 'Approved'; r.resolvedBy = opts.by; r.resolvedDate = today(); }
}

function CoachSelect({ id, value, onChange, exclude, db }: { id: string; value: string; onChange: (v: string) => void; exclude?: string; db: DB }) {
  const staff = db.people.find(p => p.role === 'Staff')!;
  const coaches = coachesInScope(db, staff).filter(c => c.id !== exclude);
  return (
    <select id={id} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Choose a coach…</option>
      {db.ministries.map(m => (
        <optgroup key={m.id} label={m.name}>
          {coaches.filter(c => c.ministry === m.id).map(c => (
            <option key={c.id} value={c.id}>{c.first} {c.last} · {leadersOf(db, c.id).length} leaders{c.role === 'Senior Coach' ? ' (senior coach)' : ''}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function MoveSheet({ leader, onClose, suggested }: { leader: Person; onClose: () => void; suggested?: string }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const from = coachOf(db, leader.id);
  const [to, setTo] = useState(suggested ?? '');
  const [reason, setReason] = useState('');
  const [handoff, setHandoff] = useState('');
  const [external, setExternal] = useState(false);

  if (!isStaff(me)) {
    return (
      <Sheet title={`Suggest a coach for ${leader.first}`} onClose={onClose}>
        <p className="sub">Staff handle coach changes because they also update the church’s system. Your suggestion goes to their queue.</p>
        <div className="field"><label htmlFor="mv-to">Suggested coach</label><CoachSelect id="mv-to" db={db} value={to} onChange={setTo} exclude={from} /></div>
        <div className="field"><label htmlFor="mv-reason">Why?</label><textarea id="mv-reason" value={reason} onChange={e => setReason(e.target.value)} /></div>
        <button className="btn primary block" disabled={!to || !reason.trim()} onClick={() => {
          update(d => { d.moveRequests.push({ id: uid('MR'), leader: leader.id, suggestedCoach: to, reason: reason.trim(), requestedBy: me.id, date: today(), status: 'Pending' }); });
          nav.toast('Sent to staff');
          onClose();
        }}>Send suggestion</button>
      </Sheet>
    );
  }
  return (
    <Sheet title={`Change coach · ${leader.first}`} onClose={onClose}>
      <p className="sub">Currently with {fullName(db, from)}.</p>
      <div className="field"><label htmlFor="mv-to">New coach</label><CoachSelect id="mv-to" db={db} value={to} onChange={setTo} exclude={from} /></div>
      <div className="field"><label htmlFor="mv-reason">Reason</label><input id="mv-reason" type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Better schedule fit" /></div>
      <div className="field">
        <label htmlFor="mv-handoff">Handoff note from {firstName(db, from)} (optional)</label>
        <textarea id="mv-handoff" value={handoff} onChange={e => setHandoff(e.target.value)} placeholder="Anything the new coach should know?" />
        <span className="row-meta"><Icon name="lock" size={12} /> {firstName(db, from)}’s private notes stay with them. Check-in history and open topics move with {leader.first}.</span>
      </div>
      <label className="checkline" style={{ borderTop: 0, padding: 0 }}>
        <input type="checkbox" checked={external} onChange={e => setExternal(e.target.checked)} />
        <span className="row-main"><span className="row-title">Already updated in the church’s system</span><span className="row-meta">You can also tick this later on the Roster tab.</span></span>
      </label>
      <button className="btn primary block" disabled={!to} onClick={() => {
        update(d => moveLeader(d, leader.id, to, { by: me.id, reason: reason.trim() || 'Reassigned by staff', handoff: handoff.trim() || undefined, external }));
        nav.toast(`${leader.first} moved to ${firstName(db, to)}`);
        onClose();
      }}>Move {leader.first}</button>
    </Sheet>
  );
}

export function RosterHome() {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const [moving, setMoving] = useState<{ leader: Person; to?: string } | null>(null);
  const [steppingDown, setSteppingDown] = useState<string | null>(null);
  const requests = db.moveRequests.filter(r => r.status === 'Pending');
  const temporary = db.assignments.filter(a => !a.end && a.temporary);
  const external = db.assignments.filter(a => !a.end && !a.externalUpdated);
  const coaches = coachesInScope(db, me);

  const stepDown = (coach: Person) => {
    const senior = coach.seniorCoach;
    if (!senior) return;
    update(d => {
      for (const l of leadersOf(d, coach.id)) moveLeader(d, l.id, senior, { by: me.id, reason: `${coach.first} stepped down`, temporary: true });
    });
    setSteppingDown(null);
    nav.toast(`${coach.first}’s leaders moved to ${firstName(db, senior)} for now`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Staff</span>
        <h1>Roster</h1>
        <p className="sub">Who coaches whom. Only staff can move leaders.</p>
      </div>

      <section className="section">
        <div className="section-head"><h2>To handle</h2><span className="count">{requests.length + temporary.length + external.length}</span></div>
        <div className="list">
          {requests.length + temporary.length + external.length === 0 && <Empty>Nothing waiting. Nice.</Empty>}
          {requests.map(r => {
            const l = person(db, r.leader)!;
            return (
              <div key={r.id} className="row" style={{ alignItems: 'flex-start' }}>
                <Avatar p={l} size="sm" />
                <div className="row-main">
                  <span className="row-title"><span className="pill info">Move request</span>{l.first} → {fullName(db, r.suggestedCoach)}</span>
                  <span className="row-meta">“{r.reason}” · from {fullName(db, r.requestedBy)}, {fmtDate(r.date)}</span>
                  <div className="btn-row" style={{ marginTop: 6 }}>
                    <button className="btn primary" onClick={() => setMoving({ leader: l, to: r.suggestedCoach })}>Review move</button>
                    <button className="btn" onClick={() => update(d => { const x = d.moveRequests.find(y => y.id === r.id)!; x.status = 'Declined'; x.resolvedBy = me.id; x.resolvedDate = today(); })}>Decline</button>
                  </div>
                </div>
              </div>
            );
          })}
          {temporary.map(a => {
            const l = person(db, a.leader)!;
            return (
              <div key={a.id} className="row" style={{ alignItems: 'flex-start' }}>
                <Avatar p={l} size="sm" />
                <div className="row-main">
                  <span className="row-title"><span className="pill warn">Needs a coach</span>{l.first} {l.last}</span>
                  <span className="row-meta">Temporarily with {fullName(db, a.coach)} since {fmtDate(a.start)}. {a.reason}.</span>
                  <div className="btn-row" style={{ marginTop: 6 }}><button className="btn primary" onClick={() => setMoving({ leader: l })}>Choose a coach</button></div>
                </div>
              </div>
            );
          })}
          {external.map(a => {
            const l = person(db, a.leader)!;
            return (
              <label key={a.id} className="checkline">
                <input type="checkbox" checked={false} onChange={() => update(d => { const x = d.assignments.find(y => y.id === a.id)!; x.externalUpdated = true; x.externalBy = me.id; x.externalDate = today(); })} />
                <span className="row-main">
                  <span className="row-title">Update {l.first} in the church’s system</span>
                  <span className="row-meta">Now with {fullName(db, a.coach)} since {fmtDate(a.start)}. Tick once it’s updated.</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {db.ministries.map(m => (
        <section key={m.id} className="section">
          <div className="section-head"><h2>{m.name}</h2></div>
          {coaches.filter(c => c.ministry === m.id).map(c => {
            const ls = leadersOf(db, c.id);
            return (
              <div key={c.id} className="stack-sm">
                <div className="spread">
                  <button className="backbtn" style={{ color: 'var(--ink)' }} onClick={() => nav.push({ kind: 'coach', id: c.id })}>
                    <Avatar p={c} size="sm" />
                    <strong>{c.first} {c.last}</strong>
                    <span className="row-meta">{c.role === 'Senior Coach' ? 'Senior coach · ' : ''}{ls.length} {ls.length === 1 ? 'leader' : 'leaders'}</span>
                  </button>
                  {c.role === 'Coach' && ls.length > 0 && (
                    steppingDown === c.id ? (
                      <span className="btn-row">
                        <button className="btn danger" onClick={() => stepDown(c)}>Move all to {firstName(db, c.seniorCoach)}</button>
                        <button className="btn" onClick={() => setSteppingDown(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="btn ghost" onClick={() => setSteppingDown(c.id)}>Stepping down?</button>
                    )
                  )}
                </div>
                <div className="list">
                  {ls.length === 0 ? <Empty>No leaders</Empty> : ls.map(l => <LeaderRow key={l.id} leader={l} />)}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {moving && <MoveSheet leader={moving.leader} suggested={moving.to} onClose={() => setMoving(null)} />}
      <p className="row-meta">{db.assignments.filter(a => a.end).length} past assignments are kept in history, so every move can be traced.</p>
    </div>
  );
}
