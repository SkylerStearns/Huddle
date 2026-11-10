import React, { useState } from 'react';
import { useApp, uid } from '../data/store';
import type { Candidate, Interview, Commit, Person } from '../data/types';
import {
  person, fullName, firstName, ministryName, waiting, interviewFor, isStepDone, canReview, isStaff, today, fmtDate,
  flaggedChecks, leadersOf, coachesInScope, activeSeason, relative, daysSince, STALL_DAYS,
} from '../data/logic';
import { Avatar, Icon, Seg, Sheet, Back, Empty, ContactRow, useNav } from '../ui';

function CandidateRow({ c, showInterviewer }: { c: Candidate; showInterviewer?: boolean }) {
  const { db } = useApp();
  const nav = useNav();
  const p = person(db, c.person)!;
  const w = waiting(db, c);
  let side: React.ReactNode = null;
  if (w.party === 'Interviewer') side = <span className={`pill ${w.flag ? 'crit' : 'accent'}`}>{showInterviewer ? 'Interviewer' : 'Your turn'} · {w.days}d</span>;
  if (w.party === 'Candidate') side = <span className={`pill ${w.flag ? 'warn' : ''}`}>Their turn · {w.days}d</span>;
  if (w.party === 'Staff') side = <span className="pill info">Submitted</span>;
  if (c.status === 'Completed') side = <span className="pill accent">Complete</span>;
  if (c.status === 'Decided') side = <span className={`pill ${c.decision === 'Approved' ? 'accent' : ''}`}>{c.decision === 'Approved' ? 'Finishing up' : c.decision}</span>;
  return (
    <button className="row" onClick={() => nav.push({ kind: 'candidate', id: c.id })}>
      <Avatar p={p} />
      <div className="row-main">
        <span className="row-title">{p.first} {p.last}</span>
        <span className="row-meta">{showInterviewer ? `${ministryName(db, c.ministry)} · ${fullName(db, c.interviewer)}` : ministryName(db, c.ministry)}</span>
        <span className="row-meta">{w.label}{w.flag === 'candidate' ? ' · maybe send a nudge' : ''}</span>
      </div>
      <div className="row-side">{side}</div>
      <span className="chev"><Icon name="right" size={18} /></span>
    </button>
  );
}

const urgency = (db: any, c: Candidate) => {
  const w = waiting(db, c);
  return (w.flag ? 1000 : 0) + (w.party === 'Interviewer' ? 100 : 0) + w.days;
};

export function InterviewsHome() {
  const { db, userId } = useApp();
  const me = person(db, userId)!;
  const season = activeSeason(db);
  const staff = isStaff(me);
  const inSeason = db.candidates.filter(c => !season || c.season === season.id);
  const mine = inSeason.filter(c => c.interviewer === me.id);
  const myOpen = mine.filter(c => c.status !== 'Completed' && c.status !== 'Decided').sort((a, b) => urgency(db, b) - urgency(db, a));
  const myDone = mine.filter(c => c.status === 'Completed' || c.status === 'Decided');
  const reviewable = inSeason.filter(c => canReview(me, c));
  const toReview = reviewable.filter(c => c.status === 'Submitted');
  const finishing = reviewable.filter(c => c.status === 'Decided' && c.decision === 'Approved');
  const inProgress = reviewable.filter(c => (c.status === 'Not started' || c.status === 'In progress') && c.interviewer !== me.id).sort((a, b) => urgency(db, b) - urgency(db, a));
  const closed = reviewable.filter(c => c.status === 'Completed' || (c.status === 'Decided' && c.decision !== 'Approved'));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">{season?.name ?? 'Onboarding'}</span>
        <h1>{staff ? 'Onboarding' : 'Interviews'}</h1>
        <p className="sub">{staff ? 'Every candidate this season, across ministries.' : `Flags appear after ${STALL_DAYS} days without movement.`}</p>
      </div>

      {me.isInterviewer && (
        <section className="section">
          <div className="section-head"><h2>My interviews</h2><span className="count">{myOpen.length}</span></div>
          <div className="list">
            {myOpen.length === 0 ? <Empty>No open interviews. Staff will assign new candidates here.</Empty> : myOpen.map(c => <CandidateRow key={c.id} c={c} />)}
          </div>
          {myDone.length > 0 && <p className="row-meta">{myDone.length} finished this season</p>}
        </section>
      )}

      {reviewable.length > 0 && (
        <>
          <section className="section">
            <div className="section-head"><h2>Ready for review</h2><span className="count">{toReview.length}</span></div>
            <div className="list">{toReview.length === 0 ? <Empty>No submitted interviews waiting.</Empty> : toReview.map(c => <CandidateRow key={c.id} c={c} showInterviewer />)}</div>
          </section>
          {finishing.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Approved · finishing up</h2><span className="count">{finishing.length}</span></div>
              <div className="list">{finishing.map(c => <CandidateRow key={c.id} c={c} showInterviewer />)}</div>
            </section>
          )}
          <section className="section">
            <div className="section-head"><h2>Interviews in progress</h2><span className="count">{inProgress.length}</span></div>
            <div className="list">{inProgress.length === 0 ? <Empty>None right now.</Empty> : inProgress.map(c => <CandidateRow key={c.id} c={c} showInterviewer />)}</div>
          </section>
          {closed.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Closed this season</h2><span className="count">{closed.length}</span></div>
              <div className="list">{closed.map(c => <CandidateRow key={c.id} c={c} showInterviewer />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function CandidateDetail({ id }: { id: string }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const c = db.candidates.find(x => x.id === id)!;
  const p = person(db, c.person)!;
  const w = waiting(db, c);
  const iv = interviewFor(db, c.id);
  const isInterviewer = c.interviewer === me.id;
  const reviewer = canReview(me, c);
  const staff = isStaff(me);
  const [nudging, setNudging] = useState(false);
  const nudges = db.nudges.filter(n => n.candidate === c.id);
  const editableSteps = isInterviewer || staff;
  const interviewerSteps = db.steps.filter(s => s.checkedBy === 'Interviewer').sort((a, b) => a.order - b.order);

  const toggleStep = (stepId: string) =>
    update(d => {
      const i = d.candidateSteps.findIndex(s => s.candidate === c.id && s.step === stepId);
      if (i >= 0) d.candidateSteps.splice(i, 1);
      else d.candidateSteps.push({ id: uid('CS'), candidate: c.id, step: stepId, date: today(), by: me.id });
      const cand = d.candidates.find(x => x.id === c.id)!;
      if (cand.status === 'Not started') cand.status = 'In progress';
    });

  const startInterview = () => {
    const newId = uid('I');
    update(d => {
      d.interviews.push({ id: newId, candidate: c.id, interviewer: me.id, type: 'In person', date: today(), otherNotes: '', potentialCoach: false, potentialNote: '', submitted: false, rockDone: false, answers: {}, checks: {} });
      d.candidates.find(x => x.id === c.id)!.status = 'In progress';
    });
    nav.push({ kind: 'interview', id: newId });
  };

  const tone = w.flag === 'interviewer' ? 'crit' : w.flag === 'candidate' ? 'warn' : w.party === 'Staff' ? '' : 'accent';

  return (
    <div className="page">
      <Back />
      <div className="stack">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar p={p} size="lg" />
          <div className="stack-sm" style={{ minWidth: 0 }}>
            <h1>{p.first} {p.last}</h1>
            <div className="chips">
              <span className="pill">{ministryName(db, c.ministry)}</span>
              <span className="pill">{db.seasons.find(s => s.id === c.season)?.name}</span>
            </div>
          </div>
        </div>
        <p className="sub">Nominated by {fullName(db, c.nominatedBy)} · interviewer {isInterviewer ? 'you' : fullName(db, c.interviewer)}</p>
        {(isInterviewer || staff) && c.status !== 'Completed' && <ContactRow p={p} />}
      </div>

      {c.status !== 'Completed' && c.status !== 'Decided' && (
        <div className={`callout ${tone}`}>
          <Icon name={w.party === 'Candidate' ? 'bell' : 'flag'} />
          <div className="callout-body">
            <strong>{w.label}</strong>
            <span className="row-meta" style={{ color: 'inherit' }}>
              {w.party === 'Interviewer' && `Waiting on ${isInterviewer ? 'you' : firstName(db, c.interviewer)} for ${w.days} ${w.days === 1 ? 'day' : 'days'}.`}
              {w.party === 'Candidate' && `Waiting on ${p.first} for ${w.days} ${w.days === 1 ? 'day' : 'days'}.`}
              {w.party === 'Staff' && `Submitted ${relative(w.since).toLowerCase()}. Staff review is next.`}
              {w.flag === 'interviewer' && ' Staff and the senior coach can see this flag.'}
              {w.flag === 'candidate' && ' A friend, their facilitator or a co-leader could give them a nudge.'}
            </span>
            {w.party === 'Candidate' && isInterviewer && <div><button className="btn" onClick={() => setNudging(true)}>Log a nudge</button></div>}
          </div>
        </div>
      )}
      {c.status === 'Decided' && c.decision !== 'Approved' && (
        <div className="callout"><div className="callout-body"><strong>{c.decision}</strong><span>{c.decisionNote}</span><span className="row-meta">Closed for this season. They won’t be carried into the next one.</span></div></div>
      )}

      {(isInterviewer || staff || reviewer) && (
        <section className="section">
          <div className="section-head"><h2>Interview checklist</h2></div>
          <div className="list">
            {interviewerSteps.map(s => {
              const done = isStepDone(db, c.id, s.id);
              return (
                <label key={s.id} className={`checkline ${done ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!done} disabled={!editableSteps || iv?.submitted && s.group === 'setup'} onChange={() => toggleStep(s.id)} />
                  <span className="row-main">
                    <span className="row-title">{s.name}</span>
                    <span className="row-meta">
                      {done ? `${fmtDate(done.date)} · ${done.by === me.id ? 'you' : firstName(db, done.by)}` : s.turnAfter === 'Candidate' ? 'Then it’s their turn to reply' : s.id === 'STEP-10' ? 'Optional · after training' : s.group === 'shared' ? 'Share during or after the interview' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {(nudges.length > 0 || (isInterviewer && w.party === 'Candidate')) && (
        <section className="section">
          <div className="section-head"><h2>Nudges</h2>{isInterviewer && <button className="btn ghost" onClick={() => setNudging(true)}><Icon name="plus" size={17} />Log</button>}</div>
          <div className="list">
            {nudges.length === 0 ? <Empty>No nudges logged.</Empty> : nudges.map(n => (
              <div key={n.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="row-main">
                  <span className="row-title">{n.contact} <span className="pill">{n.relationship}</span></span>
                  <span className="row-meta">{n.method} · {fmtDate(n.date)} · by {firstName(db, n.by)}</span>
                  {n.note && <span>{n.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isInterviewer && (
        <section className="section">
          <div className="section-head"><h2>Interview form</h2></div>
          {!iv && <button className="btn primary big block" onClick={startInterview}><Icon name="clipboard" />Start interview</button>}
          {iv && !iv.submitted && <button className="btn primary big block" onClick={() => nav.push({ kind: 'interview', id: iv.id })}><Icon name="pen" />Continue interview</button>}
          {iv?.submitted && (
            <button className="row card" style={{ border: '1px solid var(--line)' }} onClick={() => nav.push({ kind: 'interview', id: iv.id })}>
              <span className="row-main"><span className="row-title"><Icon name="lock" size={15} />Submitted {fmtDate(iv.submittedDate)}</span><span className="row-meta">Locked. Tap to read what you sent.</span></span>
              <span className="chev"><Icon name="right" size={18} /></span>
            </button>
          )}
        </section>
      )}

      {reviewer && iv?.submitted && <ReviewPanel c={c} iv={iv} />}
      {nudging && <NudgeSheet c={c} candidate={p} onClose={() => setNudging(false)} />}
    </div>
  );
}

function ReviewPanel({ c, iv }: { c: Candidate; iv: Interview }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const staff = isStaff(me);
  const [decision, setDecision] = useState<Candidate['decision']>(c.decision);
  const [note, setNote] = useState(c.decisionNote ?? '');
  const p = person(db, c.person)!;
  const decided = c.status === 'Decided' || c.status === 'Completed';

  return (
    <>
      <section className="section">
        <div className="section-head"><h2>Submitted interview</h2><span className="count">{fmtDate(iv.submittedDate)}</span></div>
        <p className="row-meta"><Icon name="lock" size={12} /> Visible to staff and senior coaches in this ministry. Coaches never see interview answers.</p>
        <InterviewReadout iv={iv} />
      </section>

      <section className="section">
        <div className="section-head"><h2>Staff review</h2></div>
        <div className="list">
          <label className="checkline">
            <input type="checkbox" checked={iv.rockDone} onChange={() => update(d => {
              const x = d.interviews.find(y => y.id === iv.id)!;
              x.rockDone = !x.rockDone; x.rockBy = x.rockDone ? me.id : undefined; x.rockDate = x.rockDone ? today() : undefined;
              const has = d.candidateSteps.findIndex(s => s.candidate === c.id && s.step === 'STEP-11');
              if (x.rockDone && has < 0) d.candidateSteps.push({ id: uid('CS'), candidate: c.id, step: 'STEP-11', date: today(), by: me.id });
              if (!x.rockDone && has >= 0) d.candidateSteps.splice(has, 1);
            })} />
            <span className="row-main">
              <span className="row-title">Entered in Rock</span>
              <span className="row-meta">{iv.rockDone ? `${fmtDate(iv.rockDate)} · ${iv.rockBy === me.id ? 'you' : firstName(db, iv.rockBy)}` : 'Tick once the notes are in Rock'}</span>
            </span>
          </label>
        </div>
        {staff && !decided && (
          <div className="card">
            <span className="label">Decision</span>
            <Seg value={decision} options={['Approved', 'Not yet', 'Not a fit'] as const} onChange={setDecision} wrap />
            {decision === 'Not yet' && <p className="row-meta">Usually means joining a group as a member. They won’t be carried into next season.</p>}
            <div className="field"><label htmlFor="dec-note">Note {decision === 'Not a fit' ? '(staff only)' : ''}</label><textarea id="dec-note" value={note} onChange={e => setNote(e.target.value)} /></div>
            <button className="btn primary block" disabled={!decision} onClick={() => {
              update(d => {
                const x = d.candidates.find(y => y.id === c.id)!;
                x.status = 'Decided'; x.decision = decision; x.decisionNote = note.trim(); x.decidedBy = me.id; x.decisionDate = today();
                if (decision !== 'Approved') d.people.find(y => y.id === c.person)!.status = 'Not onboarded';
              });
              nav.toast(`Saved: ${decision}`);
            }}>Save decision</button>
          </div>
        )}
        {!staff && !decided && <p className="row-meta">Staff make the final decision.</p>}
        {decided && <p className="row-meta">Decision: <strong>{c.decision}</strong> by {fullName(db, c.decidedBy)} on {fmtDate(c.decisionDate)}{c.decisionNote ? ` · “${c.decisionNote}”` : ''}</p>}
      </section>

      {staff && c.status === 'Decided' && c.decision === 'Approved' && <CompletePanel c={c} candidate={p} />}
    </>
  );
}

function CompletePanel({ c, candidate }: { c: Candidate; candidate: Person }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const staffSteps = db.steps.filter(s => s.checkedBy === 'Staff').sort((a, b) => a.order - b.order);
  const [coach, setCoach] = useState('');
  const [external, setExternal] = useState(false);
  const coaches = coachesInScope(db, me).filter(x => x.ministry === c.ministry);
  const interviewer = person(db, c.interviewer);
  return (
    <section className="section">
      <div className="section-head"><h2>Finish onboarding</h2></div>
      <div className="list">
        {staffSteps.map(s => {
          const done = isStepDone(db, c.id, s.id);
          return (
            <label key={s.id} className={`checkline ${done ? 'done' : ''}`}>
              <input type="checkbox" checked={!!done} onChange={() => update(d => {
                const i = d.candidateSteps.findIndex(x => x.candidate === c.id && x.step === s.id);
                if (i >= 0) d.candidateSteps.splice(i, 1); else d.candidateSteps.push({ id: uid('CS'), candidate: c.id, step: s.id, date: today(), by: me.id });
              })} />
              <span className="row-main"><span className="row-title">{s.name}</span>{done && <span className="row-meta">{fmtDate(done.date)}</span>}</span>
            </label>
          );
        })}
      </div>
      <div className="card">
        <span className="label">Assign a coach</span>
        <div className="chips">
          {coaches.map(x => (
            <button key={x.id} className="chip" aria-pressed={coach === x.id} onClick={() => setCoach(x.id)}>
              {x.first} · {leadersOf(db, x.id).length}{x.id === interviewer?.id ? ' · interviewed them' : ''}
            </button>
          ))}
        </div>
        <p className="row-meta">Numbers show each coach’s current leaders. {interviewer && `${interviewer.first} did the interview and sometimes becomes the coach.`}</p>
        <label className="checkline" style={{ borderTop: 0, padding: 0 }}>
          <input type="checkbox" checked={external} onChange={e => setExternal(e.target.checked)} />
          <span className="row-main"><span className="row-title">Updated in the church’s system</span></span>
        </label>
        <button className="btn primary block" disabled={!coach} onClick={() => {
          update(d => {
            d.assignments.push({ id: uid('A'), leader: candidate.id, coach, start: today(), temporary: false, reason: 'Completed onboarding', movedBy: me.id, externalUpdated: external, externalBy: external ? me.id : undefined, externalDate: external ? today() : undefined });
            d.planAttachments.push({ id: uid('PA'), leader: candidate.id, plan: 'PLAN-01', start: today(), active: true });
            const pp = d.people.find(y => y.id === candidate.id)!;
            pp.status = 'Active'; pp.rhythmWeeks = 2; pp.sLevel = pp.sLevel ?? 1; pp.lLevel = pp.lLevel ?? 1;
            const x = d.candidates.find(y => y.id === c.id)!;
            x.status = 'Completed'; x.completed = today();
          });
          nav.toast(`${candidate.first} is now on ${firstName(db, coach)}’s list with the 90-day plan`);
        }}>Complete and hand off</button>
      </div>
    </section>
  );
}

export function InterviewReadout({ iv }: { iv: Interview }) {
  const { db } = useApp();
  const flagged = flaggedChecks(db, iv);
  return (
    <div className="stack">
      {flagged.length > 0 && (
        <div className="callout crit">
          <Icon name="flag" />
          <div className="callout-body">
            <strong>Leadership Commitment: {flagged.length} {flagged.length === 1 ? 'point' : 'points'} to look at</strong>
            {flagged.map(pt => (
              <span key={pt.id}><b>{iv.checks[pt.id].response}:</b> {pt.text}{iv.checks[pt.id].note ? ` · “${iv.checks[pt.id].note}”` : ''}</span>
            ))}
          </div>
        </div>
      )}
      <dl className="kv" style={{ margin: 0 }}>
        <div><dt>Recommendation</dt><dd>{iv.recommendation ?? '—'}</dd></div>
        <div><dt>Interview</dt><dd>{iv.type} · {fmtDate(iv.date)}</dd></div>
        <div><dt>Interviewer</dt><dd>{fullName(db, iv.interviewer)}</dd></div>
        <div><dt>Potential coach</dt><dd>{iv.potentialCoach ? 'Yes' : 'No'}</dd></div>
      </dl>
      {iv.potentialCoach && iv.potentialNote && <p className="row-meta"><Icon name="star" size={13} /> {iv.potentialNote}</p>}
      <div className="card">
        {[...db.questions].sort((a, b) => a.order - b.order).map(q => (
          <div key={q.id} className="stack-sm">
            <h3>{q.title}</h3>
            <p className="quote">{iv.answers[q.id] || '—'}</p>
          </div>
        ))}
        <div className="stack-sm"><h3>Other notes and concerns</h3><p className="quote">{iv.otherNotes || '—'}</p></div>
      </div>
    </div>
  );
}

const COMMITS: Commit[] = ['Affirmed', 'Has questions', 'Concern'];

export function InterviewForm({ id }: { id: string }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const iv = db.interviews.find(x => x.id === id)!;
  const c = db.candidates.find(x => x.id === iv.candidate)!;
  const p = person(db, c.person)!;
  const season = db.seasons.find(s => s.id === c.season);
  const [confirming, setConfirming] = useState(false);
  const locked = iv.submitted || iv.interviewer !== userId;
  const set = (fn: (x: Interview) => void) => update(d => fn(d.interviews.find(y => y.id === id)!));
  const shared = db.steps.filter(s => s.group === 'shared' && s.id !== 'STEP-10').sort((a, b) => a.order - b.order);
  const answered = db.points.filter(pt => iv.checks[pt.id]?.response).length;
  const ready = !!iv.recommendation && answered === db.points.length;

  if (locked) {
    return (
      <div className="page">
        <Back />
        <div className="page-head"><span className="eyebrow">Interview · locked</span><h1>{p.first} {p.last}</h1></div>
        <InterviewReadout iv={iv} />
      </div>
    );
  }

  return (
    <div className="page">
      <Back label="Save and go back" />
      <div className="page-head">
        <span className="eyebrow">Interview · saves as you type</span>
        <h1>{p.first} {p.last}</h1>
        <p className="sub">{ministryName(db, c.ministry)} · nominated by {fullName(db, c.nominatedBy)}</p>
      </div>

      <div className="card">
        <div className="field"><span className="label">How are you meeting?</span>
          <Seg value={iv.type} options={['In person', 'Phone', 'Virtual'] as const} onChange={v => set(x => { x.type = v; })} />
        </div>
        <div className="field"><label htmlFor="iv-date">Date</label><input id="iv-date" type="date" value={iv.date} onChange={e => set(x => { x.date = e.target.value; })} /></div>
      </div>

      {[...db.questions].sort((a, b) => a.order - b.order).map((q, i) => (
        <section key={q.id} className="section">
          <div className="section-head"><h2>{i + 1}. {q.title}</h2></div>
          <details className="guide"><summary>Talking points</summary><p>{q.guide}</p></details>
          <textarea id={`ans-${q.id}`} aria-label={`${q.title} notes`} value={iv.answers[q.id] ?? ''} placeholder="Your notes" onChange={e => set(x => { x.answers[q.id] = e.target.value; })} />
          {q.id === 'Q-04' && (
            <div className="list">
              {[...db.points].sort((a, b) => a.order - b.order).map(pt => {
                const chk = iv.checks[pt.id] ?? { note: '' };
                return (
                  <div key={pt.id} className="checkline" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <span className="row-title" style={{ fontWeight: 500 }}>{pt.text}</span>
                    <Seg value={chk.response} options={COMMITS} onChange={v => set(x => { x.checks[pt.id] = { ...(x.checks[pt.id] ?? { note: '' }), response: v }; })} />
                    {chk.response && chk.response !== 'Affirmed' && (
                      <input type="text" aria-label="Note" placeholder="What did they say?" value={chk.note} onChange={e => set(x => { x.checks[pt.id] = { ...x.checks[pt.id], note: e.target.value }; })} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      <section className="section">
        <div className="section-head"><h2>5. What happens next</h2></div>
        <p className="row-meta">Tell them about each of these before you hang up.{season ? ` Training: ${season.training}.` : ''}</p>
        <div className="list">
          {shared.map(s => {
            const done = isStepDone(db, c.id, s.id);
            return (
              <label key={s.id} className={`checkline ${done ? 'done' : ''}`}>
                <input type="checkbox" checked={!!done} onChange={() => update(d => {
                  const i = d.candidateSteps.findIndex(x => x.candidate === c.id && x.step === s.id);
                  if (i >= 0) d.candidateSteps.splice(i, 1); else d.candidateSteps.push({ id: uid('CS'), candidate: c.id, step: s.id, date: today(), by: userId });
                })} />
                <span className="row-main"><span className="row-title">{s.name}</span></span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>6. Wrap-up</h2></div>
        <div className="field"><label htmlFor="iv-other">Other notes or concerns</label><textarea id="iv-other" value={iv.otherNotes} onChange={e => set(x => { x.otherNotes = e.target.value; })} /></div>
        <div className="field"><span className="label">Overall recommendation</span>
          <Seg value={iv.recommendation} options={['Recommend', 'Recommend with reservations', 'Not ready'] as const} onChange={v => set(x => { x.recommendation = v; })} wrap />
        </div>
        <label className="checkline card" style={{ borderTop: '1px solid var(--line)', flexDirection: 'row' }}>
          <input type="checkbox" checked={iv.potentialCoach} onChange={e => set(x => { x.potentialCoach = e.target.checked; })} />
          <span className="row-main"><span className="row-title"><Icon name="star" size={15} />Potential future coach</span><span className="row-meta">Adds them to the staff’s Future Coaches list for a check-in in 6 to 12 months.</span></span>
        </label>
        {iv.potentialCoach && <div className="field"><label htmlFor="iv-pc">Why?</label><input id="iv-pc" type="text" value={iv.potentialNote} onChange={e => set(x => { x.potentialNote = e.target.value; })} /></div>}
      </section>

      {!confirming ? (
        <button className="btn primary big block" disabled={!ready} onClick={() => setConfirming(true)}>Submit interview</button>
      ) : (
        <div className="callout warn">
          <div className="callout-body">
            <strong>Submit to staff?</strong>
            <span>You won’t be able to edit it afterwards.</span>
            <div className="btn-row">
              <button className="btn primary" onClick={() => {
                update(d => {
                  const x = d.interviews.find(y => y.id === id)!;
                  x.submitted = true; x.submittedDate = today();
                  d.candidates.find(y => y.id === c.id)!.status = 'Submitted';
                  if (!d.candidateSteps.some(s => s.candidate === c.id && s.step === 'STEP-05')) d.candidateSteps.push({ id: uid('CS'), candidate: c.id, step: 'STEP-05', date: today(), by: userId });
                });
                nav.toast('Submitted to staff');
                nav.back();
              }}>Submit</button>
              <button className="btn" onClick={() => setConfirming(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
      {!ready && <p className="row-meta" style={{ textAlign: 'center' }}>To submit, answer every commitment point and choose a recommendation.</p>}
    </div>
  );
}

function NudgeSheet({ c, candidate, onClose }: { c: Candidate; candidate: Person; onClose: () => void }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const nominator = person(db, c.nominatedBy);
  const [contact, setContact] = useState(nominator ? `${nominator.first} ${nominator.last}` : '');
  const [relationship, setRelationship] = useState<'Facilitator' | 'Co-leader' | 'Friend'>('Facilitator');
  const [method, setMethod] = useState<'Text' | 'Call' | 'In person'>('Text');
  const [note, setNote] = useState('');
  return (
    <Sheet title={`Nudge for ${candidate.first}`} onClose={onClose}>
      <p className="sub">Log who you asked to help {candidate.first} take the next step. It’s been {daysSince(waiting(db, c).since)} days.</p>
      <div className="field"><label htmlFor="ng-who">Who did you reach out to?</label><input id="ng-who" type="text" value={contact} onChange={e => setContact(e.target.value)} /></div>
      <div className="field"><span className="label">Their relationship</span><Seg value={relationship} options={['Facilitator', 'Co-leader', 'Friend'] as const} onChange={setRelationship} /></div>
      <div className="field"><span className="label">How</span><Seg value={method} options={['Text', 'Call', 'In person'] as const} onChange={setMethod} /></div>
      <div className="field"><label htmlFor="ng-note">Note</label><input id="ng-note" type="text" value={note} onChange={e => setNote(e.target.value)} /></div>
      <button className="btn primary block" disabled={!contact.trim()} onClick={() => {
        update(d => { d.nudges.push({ id: uid('N'), candidate: c.id, contact: contact.trim(), relationship, method, date: today(), by: userId, note: note.trim() }); });
        nav.toast('Nudge logged');
        onClose();
      }}>Log nudge</button>
    </Sheet>
  );
}
