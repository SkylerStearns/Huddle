import React, { useState } from 'react';
import { useApp, uid } from '../data/store';
import type { Person, TouchType, Topic } from '../data/types';
import {
  leadersOf, freshness, lastTouch, relative, openTopics, onlyGroupMessages, groupOf, planDue, fillTemplate,
  person, fullName, firstName, coachOf, currentAssignment, touchesFor, fmtDate, ministryName, today, isStaff, isSenior,
  daysSince, addDays,
} from '../data/logic';
import { Avatar, Icon, Seg, Sheet, Back, Empty, ContactRow, Levels, useNav, touchIcon } from '../ui';
import { MoveSheet } from './Roster';

const TOUCH_TYPES: TouchType[] = ['In person', 'Call/Video', '1:1 text', '1:1 email'];

export function LeadersHome() {
  const { db, userId } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const [sort, setSort] = useState<'Longest since check-in' | 'A–Z'>('Longest since check-in');
  const leaders = leadersOf(db, me.id);
  const sorted = [...leaders].sort((a, b) => {
    if (sort === 'A–Z') return a.first.localeCompare(b.first);
    const da = lastTouch(db, a.id)?.date ?? '0000';
    const dbb = lastTouch(db, b.id)?.date ?? '0000';
    return da.localeCompare(dbb);
  });
  const due = planDue(db, me.id);
  const rhythmDue = leaders.filter(l => l.status === 'Active' && freshness(db, l).state === 'due');
  const pushes = db.pushes.filter(pu => daysSince(pu.sendBy) <= 0 && !db.rosterMessages.some(r => r.push === pu.id && r.sender === me.id));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">{ministryName(db, me.ministry)}</span>
        <h1>My leaders</h1>
        <p className="sub">{leaders.length} {leaders.length === 1 ? 'leader' : 'leaders'} · you check in every {me.rhythmWeeks ?? 6} weeks by default</p>
      </div>

      {(due.length > 0 || rhythmDue.length > 0 || pushes.length > 0) && (
        <section className="section" aria-label="Due this week">
          <div className="section-head"><h2>Coming up</h2></div>
          <div className="due-strip">
            {due.map(d => (
              <button key={d.leader.id + d.step.id} className="due-card" style={{ textAlign: 'left' }} onClick={() => nav.push({ kind: 'leader', id: d.leader.id })}>
                <span className="when">{relative(d.due) === 'Today' ? 'Due today' : daysSince(d.due) > 0 ? `Due ${relative(d.due).toLowerCase()}` : `Due ${fmtDate(d.due)}`}</span>
                <strong>{d.step.title} · {d.leader.first}</strong>
                <span className="row-meta">{d.planName}</span>
              </button>
            ))}
            {rhythmDue.map(l => (
              <button key={l.id} className="due-card" style={{ textAlign: 'left' }} onClick={() => nav.push({ kind: 'leader', id: l.id })}>
                <span className="when">Check-in</span>
                <strong>It’s been a while since you connected with {l.first}</strong>
                <span className="row-meta">Last: {relative(lastTouch(db, l.id)?.date).toLowerCase()}. Want to send a quick hello?</span>
              </button>
            ))}
            {pushes.map(pu => {
              const t = db.templates.find(x => x.id === pu.template);
              return (
                <div key={pu.id} className="due-card">
                  <span className="when">From staff · send by {fmtDate(pu.sendBy)}</span>
                  <strong>{t?.name}</strong>
                  <span className="row-meta">Find it in Messages to personalize and send.</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Leaders</h2>
        </div>
        <Seg value={sort} options={['Longest since check-in', 'A–Z'] as const} onChange={setSort} />
        {sorted.length === 0 ? (
          <div className="list"><Empty>No leaders are assigned to you yet. When staff assign one, they’ll show up here.</Empty></div>
        ) : (
          <div className="list">
            {sorted.map(l => <LeaderRow key={l.id} leader={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}

export function LeaderRow({ leader, showCoach }: { leader: Person; showCoach?: boolean }) {
  const { db } = useApp();
  const nav = useNav();
  const f = freshness(db, leader);
  const topics = openTopics(db, leader.id);
  const urgent = topics.some(t => t.type === 'Urgent');
  const g = groupOf(db, leader.id);
  const a = currentAssignment(db, leader.id);
  const isNew = db.planAttachments.some(p => p.leader === leader.id && p.active);
  return (
    <button className="row" onClick={() => nav.push({ kind: 'leader', id: leader.id })}>
      <Avatar p={leader} />
      <div className="row-main">
        <span className="row-title">
          {leader.first} {leader.last}
          {isNew && <span className="pill accent">New</span>}
          {leader.status === 'Paused' && <span className="pill">Paused</span>}
          {a?.temporary && <span className="pill info">Temporary</span>}
        </span>
        <span className="row-meta">
          {showCoach ? `Coach: ${fullName(db, a?.coach)}` : g ? `${g.night} · ${g.city}` : 'No group listed'}
        </span>
        {onlyGroupMessages(db, leader.id) && <span className="row-meta t-warn">Only group messages lately</span>}
      </div>
      <div className="row-side">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`dot ${leader.status === 'Paused' ? '' : f.state}`} />
          {relative(lastTouch(db, leader.id)?.date)}
        </span>
        {topics.length > 0 && (
          <span className={`pill ${urgent ? 'crit' : ''}`}>{urgent && <Icon name="flag" size={12} />}{topics.length} {topics.length === 1 ? 'topic' : 'topics'}</span>
        )}
      </div>
      <span className="chev"><Icon name="right" size={18} /></span>
    </button>
  );
}

export function LeaderDetail({ id }: { id: string }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const leader = person(db, id)!;
  const coachId = coachOf(db, id);
  const isMine = coachId === me.id;
  const a = currentAssignment(db, id);
  const g = groupOf(db, id);
  const f = freshness(db, leader);
  const [sheet, setSheet] = useState<null | 'log' | 'topic' | 'note' | 'move'>(null);
  const [planDone, setPlanDone] = useState<string | null>(null);
  const topics = openTopics(db, id);
  const resolvedTopics = db.topics.filter(t => t.leader === id && t.status === 'Resolved');
  const notes = db.coachNotes.filter(n => n.leader === id && n.coach === me.id).sort((x, y) => y.date.localeCompare(x.date));
  const handoffs = db.handoffs.filter(h => h.leader === id && h.to === me.id);
  const history = touchesFor(db, id);
  const next = planDue(db, me.id).find(d => d.leader.id === id);
  const onboarding = db.candidates.find(c => c.person === id && c.status === 'Completed');
  const coachName = fullName(db, coachId);
  const vars = { 'first name': leader.first, 'coach name': me.first };

  const resolve = (t: Topic) =>
    update(d => {
      const x = d.topics.find(y => y.id === t.id)!;
      x.status = 'Resolved';
      x.resolved = today();
    });
  const toggleReplied = (tid: string) =>
    update(d => {
      const x = d.touchPoints.find(y => y.id === tid)!;
      x.replied = !x.replied;
    });

  return (
    <div className="page">
      <Back />
      <div className="stack">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar p={leader} size="lg" />
          <div className="stack-sm" style={{ minWidth: 0 }}>
            <h1>{leader.first} {leader.last}</h1>
            <div className="chips">
              <span className="pill">{ministryName(db, leader.ministry)}</span>
              {leader.status !== 'Active' && <span className="pill warn">{leader.status}</span>}
              {a?.temporary && <span className="pill info">Temporary with {firstName(db, coachId)}</span>}
            </div>
          </div>
        </div>
        {!isMine && <p className="sub">Coached by {coachName}</p>}
        <ContactRow p={leader} />
      </div>

      <dl className="kv" style={{ margin: 0 }}>
        <div><dt>Group</dt><dd>{g ? `${g.night}s · ${g.city}` : '—'}</dd></div>
        <div><dt>Type</dt><dd>{g ? `${g.openClosed} · ages ${g.ageRange}` : '—'}</dd></div>
        <div><dt>Co-leader</dt><dd>{g?.coLeader && g.coLeader !== id ? fullName(db, g.coLeader) : g?.leader && g.leader !== id ? fullName(db, g.leader) : 'None'}</dd></div>
        <div><dt>Levels</dt><dd style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>S <Levels value={leader.sLevel} label="Spiritual" /></span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>L <Levels value={leader.lLevel} label="Leadership" /></span>
        </dd></div>
      </dl>

      {onboarding && (
        <p className="row-meta">Joined in {db.seasons.find(s => s.id === onboarding.season)?.name} · interviewed by {fullName(db, onboarding.interviewer)}</p>
      )}

      <section className="card">
        <div className="spread">
          <div className="stack-sm">
            <span className="label">Last connected</span>
            <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className={`dot ${f.state}`} />{relative(lastTouch(db, id)?.date)}
            </strong>
          </div>
          {isMine && (
            <div className="field" style={{ minWidth: 150 }}>
              <label htmlFor="rhythm">Check-in rhythm</label>
              <select id="rhythm" value={String(leader.rhythmWeeks ?? 6)} onChange={e => update(d => { d.people.find(p => p.id === id)!.rhythmWeeks = Number(e.target.value); })}>
                <option value="2">Every 2 weeks</option>
                <option value="4">Monthly</option>
                <option value="6">Every 6 weeks</option>
                <option value="12">Once a season</option>
              </select>
            </div>
          )}
        </div>
        {onlyGroupMessages(db, id) && (
          <div className="callout warn"><div className="callout-body"><span>Only group messages since {fmtDate(addDays(today(), -60))}. Maybe a quick call?</span></div></div>
        )}
        {isMine && <button className="btn primary big block" onClick={() => setSheet('log')}><Icon name="check" />Log a check-in</button>}
      </section>

      {isMine && next && (
        <section className="callout accent">
          <Icon name="bell" />
          <div className="callout-body">
            <span className="eyebrow">{next.planName} · due {fmtDate(next.due)}</span>
            <strong>{next.step.title}</strong>
            {next.step.text && <p className="quote">{fillTemplate(next.step.text, vars)}</p>}
            <div className="btn-row">
              {next.step.text && (
                <a className="btn" href={`sms:${leader.phone.replace(/[^0-9]/g, '')}?&body=${encodeURIComponent(fillTemplate(next.step.text, vars))}`}>
                  <Icon name="text" size={17} />Open in Messages
                </a>
              )}
              <button
                className="btn"
                disabled={planDone === next.step.id}
                onClick={() => {
                  setPlanDone(next.step.id);
                  update(d => { d.touchPoints.push({ id: uid('TP'), leader: id, coach: me.id, date: today(), type: next.step.type, notes: next.step.title, replied: false }); });
                  nav.toast('Logged. Nice work.');
                }}
              >
                <Icon name="check" size={17} />Mark done
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Topics</h2>
          <button className="btn ghost" onClick={() => setSheet('topic')}><Icon name="plus" size={17} />Add</button>
        </div>
        {topics.length === 0 ? (
          <div className="list"><Empty>No open topics. Add something to circle back on.</Empty></div>
        ) : (
          <div className="list">
            {topics.map(t => (
              <div key={t.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="row-main">
                  <span className="row-title">
                    <span className={`pill ${t.type === 'Urgent' ? 'crit' : 'info'}`}>{t.type === 'Urgent' && <Icon name="flag" size={12} />}{t.type}</span>
                    {t.title}
                  </span>
                  <span className="row-meta">{t.details}</span>
                  <span className="row-meta">
                    {t.createdBy !== t.assignedTo ? `Assigned by ${fullName(db, t.createdBy)} · ` : ''}{fmtDate(t.created)}
                  </span>
                </div>
                {(isMine || t.createdBy === me.id) && <button className="btn" onClick={() => resolve(t)}>Resolve</button>}
              </div>
            ))}
          </div>
        )}
        {resolvedTopics.length > 0 && <p className="row-meta">{resolvedTopics.length} resolved {resolvedTopics.length === 1 ? 'topic' : 'topics'}</p>}
      </section>

      {isMine && (
        <section className="section">
          <div className="section-head">
            <h2>My private notes</h2>
            <button className="btn ghost" onClick={() => setSheet('note')}><Icon name="plus" size={17} />Add</button>
          </div>
          <p className="row-meta"><Icon name="lock" size={13} /> Only you can see these. They stay with you if {leader.first} moves to another coach.</p>
          <div className="list">
            {notes.length === 0 && handoffs.length === 0 && <Empty>No notes yet.</Empty>}
            {handoffs.map(h => (
              <div key={h.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="row-main">
                  <span className="row-title"><span className="pill info">Handoff</span>From {fullName(db, h.from)}</span>
                  <span>{h.note}</span>
                  <span className="row-meta">{fmtDate(h.date)}</span>
                </div>
              </div>
            ))}
            {notes.map(n => (
              <div key={n.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="row-main"><span>{n.note}</span><span className="row-meta">{fmtDate(n.date)}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Check-in history</h2><span className="count">{history.length}</span></div>
        <div className="card">
          {history.length === 0 ? <Empty>No check-ins logged yet.</Empty> : (
            <div className="timeline">
              {history.map(t => (
                <div key={t.id} className="tl-item">
                  <span className="tl-icon"><Icon name={touchIcon(t.type)} size={17} /></span>
                  <div className="tl-body">
                    <div className="spread">
                      <strong>{t.type === 'Roster message' ? 'Group message' : t.type}</strong>
                      <span className="row-meta mono">{fmtDate(t.date)}</span>
                    </div>
                    <span className="row-meta">
                      {t.coach !== me.id ? `${fullName(db, t.coach)}` : 'You'}{t.location ? ` · ${t.location}` : ''}
                    </span>
                    {t.notes && t.coach === me.id && <span>{t.notes}</span>}
                    {t.notes && t.coach !== me.id && <span className="row-meta"><Icon name="lock" size={12} /> Notes are private to the coach</span>}
                    {t.coach === me.id && t.type !== 'In person' && t.type !== 'Call/Video' && (
                      <label className="row-meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={t.replied} onChange={() => toggleReplied(t.id)} style={{ accentColor: 'var(--accent)' }} />
                        They replied
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {isMine && !isStaff(me) && (
        <button className="btn block" onClick={() => setSheet('move')}><Icon name="swap" size={17} />Suggest a different coach</button>
      )}
      {isStaff(me) && <button className="btn block" onClick={() => setSheet('move')}><Icon name="swap" size={17} />Change coach</button>}

      {sheet === 'log' && <LogCheckin leader={leader} onClose={() => setSheet(null)} />}
      {sheet === 'topic' && <TopicSheet leader={leader} onClose={() => setSheet(null)} />}
      {sheet === 'note' && <NoteSheet leader={leader} onClose={() => setSheet(null)} />}
      {sheet === 'move' && <MoveSheet leader={leader} onClose={() => setSheet(null)} />}
    </div>
  );
}

function LogCheckin({ leader, onClose }: { leader: Person; onClose: () => void }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const [type, setType] = useState<TouchType>('Call/Video');
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const topics = openTopics(db, leader.id);
  const [resolved, setResolved] = useState<string[]>([]);
  const save = () => {
    update(d => {
      d.touchPoints.push({ id: uid('TP'), leader: leader.id, coach: userId, date, type, location: location || undefined, notes: notes || undefined, replied: true });
      for (const tid of resolved) {
        const t = d.topics.find(x => x.id === tid)!;
        t.status = 'Resolved';
        t.resolved = date;
      }
    });
    nav.toast(`Check-in with ${leader.first} logged`);
    onClose();
  };
  return (
    <Sheet title={`Check-in with ${leader.first}`} onClose={onClose}>
      <div className="field">
        <span className="label">How did you connect?</span>
        <Seg value={type} options={TOUCH_TYPES} onChange={setType} wrap />
      </div>
      <button className="btn primary big block" onClick={save}><Icon name="check" />We connected</button>
      <p className="row-meta" style={{ textAlign: 'center' }}>That’s all you need. Details below are optional.</p>
      <div className="divider" />
      <div className="field"><label htmlFor="ci-date">Date</label><input id="ci-date" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} /></div>
      <div className="field"><label htmlFor="ci-loc">Where</label><input id="ci-loc" type="text" placeholder="Coffee shop, church patio…" value={location} onChange={e => setLocation(e.target.value)} /></div>
      <div className="field"><label htmlFor="ci-notes">Notes (only you can see these)</label><textarea id="ci-notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      {topics.length > 0 && (
        <div className="field">
          <span className="label">Did you cover any open topics?</span>
          <div className="list">
            {topics.map(t => (
              <label key={t.id} className="checkline">
                <input type="checkbox" checked={resolved.includes(t.id)} onChange={e => setResolved(e.target.checked ? [...resolved, t.id] : resolved.filter(x => x !== t.id))} />
                <span className="row-main"><span className="row-title">{t.title}</span><span className="row-meta">Mark resolved</span></span>
              </label>
            ))}
          </div>
        </div>
      )}
      <button className="btn primary block" onClick={save}>Save check-in</button>
    </Sheet>
  );
}

function TopicSheet({ leader, onClose }: { leader: Person; onClose: () => void }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const coach = coachOf(db, leader.id) ?? userId;
  const [type, setType] = useState<'Follow-up' | 'Urgent'>('Follow-up');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const assigning = coach !== me.id && (isStaff(me) || isSenior(me));
  return (
    <Sheet title={`New topic · ${leader.first}`} onClose={onClose}>
      <Seg value={type} options={['Follow-up', 'Urgent'] as const} onChange={setType} />
      <p className="row-meta">
        {type === 'Urgent' ? 'Urgent topics also show up for the senior coach and staff.' : 'Follow-ups stay pinned on this leader until resolved.'}
      </p>
      <div className="field"><label htmlFor="tp-title">Topic</label><input id="tp-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ask how the new co-leader is working out" /></div>
      <div className="field"><label htmlFor="tp-details">Details</label><textarea id="tp-details" value={details} onChange={e => setDetails(e.target.value)} /></div>
      {assigning && <p className="row-meta">This will be assigned to {fullName(db, coach)}.</p>}
      <button
        className="btn primary block"
        disabled={!title.trim()}
        onClick={() => {
          update(d => { d.topics.push({ id: uid('TO'), leader: leader.id, type, title: title.trim(), details: details.trim(), createdBy: me.id, created: today(), assignedTo: coach, status: 'Open' }); });
          nav.toast(assigning ? `Topic assigned to ${firstName(db, coach)}` : 'Topic added');
          onClose();
        }}
      >
        {assigning ? `Assign to ${firstName(db, coach)}` : 'Add topic'}
      </button>
    </Sheet>
  );
}

function NoteSheet({ leader, onClose }: { leader: Person; onClose: () => void }) {
  const { userId, update } = useApp();
  const [note, setNote] = useState('');
  return (
    <Sheet title={`Private note · ${leader.first}`} onClose={onClose}>
      <div className="field"><label htmlFor="note">Note</label><textarea id="note" value={note} onChange={e => setNote(e.target.value)} /></div>
      <button className="btn primary block" disabled={!note.trim()} onClick={() => { update(d => { d.coachNotes.push({ id: uid('CN'), leader: leader.id, coach: userId, date: today(), note: note.trim() }); }); onClose(); }}>Save note</button>
    </Sheet>
  );
}
