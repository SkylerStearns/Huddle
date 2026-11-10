import type { DB, Person, Candidate, Party, PlanStep, TouchPoint, Interview } from './types';
import { ago } from './sample';

export const STALL_DAYS = 7; // interviewer flag and candidate nudge, per the decisions doc

export const today = () => ago(0);
export function daysSince(date: string): number {
  const a = new Date(date + 'T12:00:00');
  const b = new Date(today() + 'T12:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
export function fmtDate(date?: string): string {
  if (!date) return '';
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function relative(date?: string): string {
  if (!date) return 'Never';
  const n = daysSince(date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n === -1) return 'Tomorrow';
  if (n < 0) return `In ${-n} days`;
  if (n < 14) return `${n} days ago`;
  if (n < 60) return `${Math.round(n / 7)} weeks ago`;
  return `${Math.round(n / 30)} months ago`;
}

export const person = (db: DB, id?: string): Person | undefined => db.people.find(p => p.id === id);
export const fullName = (db: DB, id?: string) => {
  const p = person(db, id);
  return p ? `${p.first} ${p.last}` : '—';
};
export const firstName = (db: DB, id?: string) => person(db, id)?.first ?? '—';
export const ministryName = (db: DB, id?: string) => db.ministries.find(m => m.id === id)?.name ?? 'All ministries';

export const isStaff = (p?: Person) => p?.role === 'Staff';
export const isSenior = (p?: Person) => p?.role === 'Senior Coach';
export const isCoachLike = (p?: Person) => p?.role === 'Coach' || p?.role === 'Senior Coach';

// ---------- coaching ----------
export const currentAssignment = (db: DB, leader: string) => db.assignments.find(a => a.leader === leader && !a.end);
export const coachOf = (db: DB, leader: string) => currentAssignment(db, leader)?.coach;

export function leadersOf(db: DB, coach: string): Person[] {
  return db.assignments
    .filter(a => a.coach === coach && !a.end)
    .map(a => person(db, a.leader))
    .filter((p): p is Person => !!p && (p.status === 'Active' || p.status === 'Paused'));
}
export const groupOf = (db: DB, leader: string) =>
  db.groups.find(g => g.active && (g.leader === leader || g.coLeader === leader)) ??
  db.groups.find(g => g.leader === leader || g.coLeader === leader);

export const touchesFor = (db: DB, leader: string): TouchPoint[] =>
  db.touchPoints.filter(t => t.leader === leader).sort((a, b) => b.date.localeCompare(a.date));
export const lastTouch = (db: DB, leader: string) => touchesFor(db, leader)[0];

export type Freshness = 'fresh' | 'soon' | 'due';
export function freshness(db: DB, leader: Person): { state: Freshness; days: number | null } {
  const last = lastTouch(db, leader.id);
  const rhythm = (leader.rhythmWeeks ?? 6) * 7;
  if (!last) return { state: 'due', days: null };
  const days = daysSince(last.date);
  return { state: days >= rhythm ? 'due' : days >= rhythm * 0.75 ? 'soon' : 'fresh', days };
}
/** True when every touch in the last 60 days was a group message. */
export function onlyGroupMessages(db: DB, leader: string): boolean {
  const recent = touchesFor(db, leader).filter(t => daysSince(t.date) <= 60);
  return recent.length > 0 && recent.every(t => t.type === 'Roster message');
}
export const openTopics = (db: DB, leader: string) => db.topics.filter(t => t.leader === leader && t.status === 'Open');

export interface DueItem { leader: Person; step: PlanStep; due: string; planName: string }
/** Reminder-plan touch points due within the next week (or overdue) for a coach's leaders. */
export function planDue(db: DB, coach: string): DueItem[] {
  const out: DueItem[] = [];
  for (const leader of leadersOf(db, coach)) {
    for (const att of db.planAttachments.filter(a => a.leader === leader.id && a.active)) {
      const steps = db.planSteps.filter(s => s.plan === att.plan).sort((a, b) => a.day - b.day);
      const touches = touchesFor(db, leader.id);
      for (let i = 0; i < steps.length; i++) {
        const due = addDays(att.start, steps[i].day);
        const windowStart = addDays(due, -3);
        const windowEnd = steps[i + 1] ? addDays(att.start, steps[i + 1].day - 3) : '9999-12-31';
        const done = touches.some(t => t.date >= windowStart && t.date < windowEnd && t.type !== 'Roster message');
        if (done) continue;
        if (daysSince(due) >= -7) out.push({ leader, step: steps[i], due, planName: db.plans.find(p => p.id === att.plan)?.name ?? '' });
        break; // only the next open step per leader
      }
    }
  }
  return out;
}

export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([^}]+)\}/g, (m, key: string) => vars[key.trim()] ?? m);
}

// ---------- onboarding ----------
export const doneSteps = (db: DB, cand: string) => db.candidateSteps.filter(s => s.candidate === cand);
export const isStepDone = (db: DB, cand: string, step: string) => db.candidateSteps.find(s => s.candidate === cand && s.step === step);
export const interviewFor = (db: DB, cand: string): Interview | undefined => db.interviews.find(i => i.candidate === cand);

export interface Waiting { party: Party | null; since: string; label: string; flag: 'interviewer' | 'candidate' | null; days: number }
export function waiting(db: DB, c: Candidate): Waiting {
  const iv = interviewFor(db, c.id);
  if (c.status === 'Completed') return { party: null, since: c.completed ?? '', label: 'Onboarding complete', flag: null, days: 0 };
  if (c.status === 'Decided') return { party: null, since: c.decisionDate ?? '', label: `Decision: ${c.decision}`, flag: null, days: 0 };
  if (iv?.submitted) {
    const since = iv.submittedDate ?? today();
    return { party: 'Staff', since, label: 'Submitted · waiting on staff review', flag: null, days: daysSince(since) };
  }
  const setup = db.steps.filter(s => s.group === 'setup').sort((a, b) => a.order - b.order);
  let last: { stepId: string; date: string } | null = null;
  for (const s of setup) {
    const d = isStepDone(db, c.id, s.id);
    if (d) last = { stepId: s.id, date: d.date };
  }
  const labels: Record<string, [Party, string]> = {
    none: ['Interviewer', 'Reach out to them'],
    'STEP-01': ['Candidate', 'Waiting for their reply'],
    'STEP-02': ['Candidate', 'Waiting for them to schedule'],
    'STEP-03': ['Interviewer', 'Send meeting details'],
    'STEP-04': ['Interviewer', 'Interview coming up'],
    'STEP-05': ['Interviewer', 'Write-up due'],
  };
  const [party, label] = labels[last?.stepId ?? 'none'];
  const since = last?.date ?? c.waitingSince;
  const days = daysSince(since);
  const stallable = last?.stepId !== 'STEP-04';
  const flag = stallable && days >= STALL_DAYS ? (party === 'Candidate' ? 'candidate' : 'interviewer') : null;
  return { party, since, label, flag, days };
}

export const flaggedChecks = (db: DB, iv: Interview) =>
  db.points.filter(p => iv.checks[p.id]?.response && iv.checks[p.id].response !== 'Affirmed');

export function canReview(me: Person | undefined, c: Candidate): boolean {
  if (!me) return false;
  if (isStaff(me)) return true;
  return isSenior(me) && me.canReview && me.ministry === c.ministry;
}

/** Coaches a senior coach or staff member looks after (staff: everyone who coaches). */
export function coachesInScope(db: DB, me: Person): Person[] {
  if (isStaff(me)) return db.people.filter(p => isCoachLike(p) && p.status === 'Active');
  if (isSenior(me)) return [me, ...db.people.filter(p => p.seniorCoach === me.id && p.status === 'Active')];
  return [me];
}
export const activeSeason = (db: DB) => db.seasons.find(s => s.active);
