// Sample community that mirrors the "App Data (Starter)" Google Sheet.
// Every person is fictional. Dates are stored as "days from today" so the demo always looks current.
import type { DB, Person, Role, PersonStatus } from './types';

export function ago(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const ahead = (days: number) => ago(-days);

let phone = 1000;
function p(
  id: string, first: string, last: string, role: Role, ministry: string | undefined,
  status: PersonStatus, extra: Partial<Person> = {},
): Person {
  phone += 1;
  return {
    id, first, last, role, ministry, status,
    email: `${first}.${last}@example.com`.toLowerCase(),
    phone: `(555) 010-${String(phone)}`,
    isInterviewer: false, canReview: false, created: ago(300), ...extra,
  };
}

export function sampleDB(): DB {
  phone = 1000;
  return {
    ministries: [
      { id: 'MIN-01', name: '20s/30s Men' },
      { id: 'MIN-02', name: '20s/30s Women' },
      { id: 'MIN-03', name: 'College' },
    ],
    people: [
      p('P-001', 'Dana', 'Whitfield', 'Staff', undefined, 'Active', { discord: 'dana.whitfield', canReview: true, staffNotes: 'Sample staff member' }),
      p('P-002', 'Marcus', 'Lee', 'Senior Coach', 'MIN-01', 'Active', { discord: 'marcus.lee', isInterviewer: true, canReview: true, sLevel: 4, lLevel: 4, rhythmWeeks: 6 }),
      p('P-003', 'Priya', 'Shah', 'Senior Coach', 'MIN-02', 'Active', { discord: 'priya.shah', isInterviewer: true, canReview: true, sLevel: 4, lLevel: 4, rhythmWeeks: 6 }),
      p('P-004', 'Jordan', 'Ellis', 'Senior Coach', 'MIN-03', 'Active', { discord: 'jordan.ellis', isInterviewer: true, canReview: true, sLevel: 4, lLevel: 3, rhythmWeeks: 6 }),
      p('P-010', 'Ben', 'Carter', 'Coach', 'MIN-01', 'Active', { discord: 'bencarter', seniorCoach: 'P-002', isInterviewer: true, sLevel: 3, lLevel: 3, rhythmWeeks: 6 }),
      p('P-011', 'Tyler', 'Brooks', 'Coach', 'MIN-01', 'Active', { seniorCoach: 'P-002', sLevel: 3, lLevel: 2, rhythmWeeks: 6 }),
      p('P-012', 'Hannah', 'Kim', 'Coach', 'MIN-02', 'Active', { discord: 'hannah.kim', seniorCoach: 'P-003', isInterviewer: true, sLevel: 4, lLevel: 3, rhythmWeeks: 6 }),
      p('P-013', 'Olivia', 'Reyes', 'Coach', 'MIN-02', 'Active', { discord: 'olivia.reyes', seniorCoach: 'P-003', sLevel: 3, lLevel: 3, rhythmWeeks: 6 }),
      p('P-014', 'Sam', 'Patel', 'Coach', 'MIN-03', 'Active', { discord: 'sampatel', seniorCoach: 'P-004', isInterviewer: true, sLevel: 3, lLevel: 3, rhythmWeeks: 6 }),
      p('P-020', 'Ethan', 'Moore', 'Leader', 'MIN-01', 'Active', { sLevel: 2, lLevel: 2, rhythmWeeks: 6 }),
      p('P-021', 'Noah', 'Turner', 'Leader', 'MIN-01', 'Active', { sLevel: 3, lLevel: 2, rhythmWeeks: 6 }),
      p('P-022', 'Caleb', 'Ward', 'Leader', 'MIN-01', 'Active', { sLevel: 2, lLevel: 1, rhythmWeeks: 6 }),
      p('P-023', 'Luke', 'Fischer', 'Leader', 'MIN-01', 'Paused', { sLevel: 2, lLevel: 2, rhythmWeeks: 6, staffNotes: 'Taking the fall off; check back in January' }),
      p('P-024', 'Grace', 'Lin', 'Leader', 'MIN-02', 'Active', { sLevel: 3, lLevel: 3, rhythmWeeks: 4 }),
      p('P-025', 'Mia', 'Torres', 'Leader', 'MIN-02', 'Active', { sLevel: 2, lLevel: 2, rhythmWeeks: 6 }),
      p('P-026', 'Emma', 'Hayes', 'Leader', 'MIN-02', 'Active', { sLevel: 3, lLevel: 2, rhythmWeeks: 6 }),
      p('P-027', 'Zoe', 'Bennett', 'Leader', 'MIN-02', 'Active', { sLevel: 1, lLevel: 2, rhythmWeeks: 6 }),
      p('P-028', 'Isaac', 'Rivera', 'Leader', 'MIN-03', 'Active', { sLevel: 2, lLevel: 2, rhythmWeeks: 6 }),
      p('P-029', 'Ava', 'Sullivan', 'Leader', 'MIN-03', 'Active', { sLevel: 2, lLevel: 1, rhythmWeeks: 6 }),
      p('P-030', 'Owen', 'Price', 'Leader', 'MIN-03', 'No longer leading', { sLevel: 2, lLevel: 1, staffNotes: 'Graduated and moved away' }),
      p('P-040', 'Jack', 'Dalton', 'Leader', 'MIN-01', 'Onboarding', { created: ago(26) }),
      p('P-041', 'Ryan', 'Ortiz', 'Leader', 'MIN-01', 'Onboarding', { created: ago(26) }),
      p('P-042', 'Lily', 'Chen', 'Leader', 'MIN-02', 'Onboarding', { created: ago(26) }),
      p('P-043', 'Nora', 'Walsh', 'Leader', 'MIN-02', 'Active', { sLevel: 1, lLevel: 1, rhythmWeeks: 2, created: ago(46) }),
      p('P-044', 'Eli', 'Grant', 'Leader', 'MIN-03', 'Onboarding', { created: ago(26) }),
      p('P-045', 'Maya', 'Foster', 'Leader', 'MIN-03', 'Not onboarded', { created: ago(46), staffNotes: 'Not yet; joining a group as a member' }),
    ],
    groups: [
      { id: 'G-01', ministry: 'MIN-01', leader: 'P-020', coLeader: 'P-021', night: 'Tuesday', city: 'Costa Mesa', openClosed: 'Open', ageRange: '25 to 30', active: true },
      { id: 'G-02', ministry: 'MIN-01', leader: 'P-022', night: 'Wednesday', city: 'Irvine', openClosed: 'Closed', ageRange: '28 to 34', active: true },
      { id: 'G-03', ministry: 'MIN-01', leader: 'P-023', night: 'Thursday', city: 'Newport Beach', openClosed: 'Closed', ageRange: '30 to 35', active: false },
      { id: 'G-04', ministry: 'MIN-02', leader: 'P-024', coLeader: 'P-043', night: 'Monday', city: 'Irvine', openClosed: 'Open', ageRange: '24 to 29', active: true },
      { id: 'G-05', ministry: 'MIN-02', leader: 'P-025', coLeader: 'P-026', night: 'Tuesday', city: 'Huntington Beach', openClosed: 'Open', ageRange: '27 to 32', active: true },
      { id: 'G-06', ministry: 'MIN-02', leader: 'P-027', night: 'Thursday', city: 'Costa Mesa', openClosed: 'Closed', ageRange: '30 to 35', active: true },
      { id: 'G-07', ministry: 'MIN-03', leader: 'P-028', night: 'Wednesday', city: 'Irvine', openClosed: 'Open', ageRange: '18 to 22', active: true },
      { id: 'G-08', ministry: 'MIN-03', leader: 'P-029', night: 'Sunday', city: 'Irvine', openClosed: 'Open', ageRange: '18 to 22', active: true },
      { id: 'G-09', ministry: 'MIN-03', leader: 'P-030', night: 'Monday', city: 'Costa Mesa', openClosed: 'Closed', ageRange: '18 to 22', active: false },
    ],
    assignments: [
      { id: 'A-01', leader: 'P-020', coach: 'P-010', start: ago(294), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(293) },
      { id: 'A-02', leader: 'P-021', coach: 'P-010', start: ago(294), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(293) },
      { id: 'A-03', leader: 'P-022', coach: 'P-011', start: ago(426), end: ago(87), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(425) },
      { id: 'A-04', leader: 'P-022', coach: 'P-010', start: ago(87), temporary: false, reason: 'Better schedule fit with Ben', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(86) },
      { id: 'A-05', leader: 'P-023', coach: 'P-011', start: ago(426), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(425) },
      { id: 'A-06', leader: 'P-024', coach: 'P-012', start: ago(240), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(239) },
      { id: 'A-07', leader: 'P-025', coach: 'P-013', start: ago(240), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(239) },
      { id: 'A-08', leader: 'P-026', coach: 'P-013', start: ago(240), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(239) },
      { id: 'A-09', leader: 'P-027', coach: 'P-013', start: ago(240), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(239) },
      { id: 'A-10', leader: 'P-043', coach: 'P-012', start: ago(13), temporary: false, reason: 'Completed onboarding', movedBy: 'P-001', externalUpdated: false },
      { id: 'A-11', leader: 'P-028', coach: 'P-014', start: ago(426), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(425) },
      { id: 'A-12', leader: 'P-029', coach: 'P-004', start: ago(21), temporary: true, reason: 'Coach stepped down; with senior coach until reassigned', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(20) },
      { id: 'A-13', leader: 'P-030', coach: 'P-014', start: ago(426), end: ago(162), temporary: false, reason: 'Initial assignment', movedBy: 'P-001', externalUpdated: true, externalBy: 'P-001', externalDate: ago(425) },
    ],
    moveRequests: [
      { id: 'MR-01', leader: 'P-027', suggestedCoach: 'P-012', reason: 'Zoe connected well with Hannah at the spring retreat', requestedBy: 'P-013', date: ago(7), status: 'Pending' },
    ],
    seasons: [
      { id: 'SEA-01', name: 'Spring 2026', start: ago(254), end: ago(133), training: 'Thu Apr 16, 7:00pm', active: false },
      { id: 'SEA-02', name: 'Fall 2026', start: ago(70), end: ahead(35), training: 'Thu, Nov 19 at 7:00pm (Young Adult) · Sun, Nov 22 at 12:45pm (Men’s/Women’s)', active: true },
    ],
    candidates: [
      { id: 'C-01', person: 'P-040', season: 'SEA-02', ministry: 'MIN-01', nominatedBy: 'P-020', interviewer: 'P-010', status: 'In progress', waitingSince: ago(12) },
      { id: 'C-02', person: 'P-041', season: 'SEA-02', ministry: 'MIN-01', nominatedBy: 'P-021', interviewer: 'P-010', status: 'Not started', waitingSince: ago(9) },
      { id: 'C-03', person: 'P-042', season: 'SEA-02', ministry: 'MIN-02', nominatedBy: 'P-024', interviewer: 'P-012', status: 'Submitted', waitingSince: ago(6) },
      { id: 'C-04', person: 'P-043', season: 'SEA-02', ministry: 'MIN-02', nominatedBy: 'P-024', interviewer: 'P-012', status: 'Completed', waitingSince: ago(40), decision: 'Approved', decisionNote: 'Strong fit; co-leading with Grace', decidedBy: 'P-001', decisionDate: ago(17), completed: ago(13) },
      { id: 'C-05', person: 'P-044', season: 'SEA-02', ministry: 'MIN-03', nominatedBy: 'P-028', interviewer: 'P-014', status: 'In progress', waitingSince: ago(2) },
      { id: 'C-06', person: 'P-045', season: 'SEA-02', ministry: 'MIN-03', nominatedBy: 'P-029', interviewer: 'P-014', status: 'Decided', waitingSince: ago(21), decision: 'Not yet', decisionNote: 'Encouraged to join a group as a member this season', decidedBy: 'P-001', decisionDate: ago(11) },
    ],
    steps: [
      { id: 'STEP-01', name: 'Reached out to them', order: 1, checkedBy: 'Interviewer', turnAfter: 'Candidate', group: 'setup' },
      { id: 'STEP-02', name: 'Sent the scheduling link', order: 2, checkedBy: 'Interviewer', turnAfter: 'Candidate', group: 'setup' },
      { id: 'STEP-03', name: 'Interview date confirmed', order: 3, checkedBy: 'Interviewer', turnAfter: 'Interviewer', group: 'setup' },
      { id: 'STEP-04', name: 'Sent meeting details or calendar invite', order: 4, checkedBy: 'Interviewer', turnAfter: 'Interviewer', group: 'setup' },
      { id: 'STEP-05', name: 'Interview completed', order: 5, checkedBy: 'Interviewer', turnAfter: 'Interviewer', group: 'setup' },
      { id: 'STEP-06', name: 'Told them about the background check email', order: 6, checkedBy: 'Interviewer', group: 'shared' },
      { id: 'STEP-07', name: 'Told them about the Leadership Commitment email', order: 7, checkedBy: 'Interviewer', group: 'shared' },
      { id: 'STEP-08', name: 'Shared the new leader training date', order: 8, checkedBy: 'Interviewer', group: 'shared' },
      { id: 'STEP-09', name: 'Explained they’ll be connected with a coach', order: 9, checkedBy: 'Interviewer', group: 'shared' },
      { id: 'STEP-10', name: 'Attended new leader training', order: 10, checkedBy: 'Interviewer', group: 'shared' },
      { id: 'STEP-11', name: 'Entered in Rock', order: 11, checkedBy: 'Staff', group: 'staff' },
      { id: 'STEP-12', name: 'Background check cleared', order: 12, checkedBy: 'Staff', group: 'staff' },
      { id: 'STEP-13', name: 'Leadership Commitment signed', order: 13, checkedBy: 'Staff', group: 'staff' },
    ],
    candidateSteps: [
      ['C-01', 'STEP-01', 19, 'P-010'], ['C-01', 'STEP-02', 12, 'P-010'],
      ...['01', '02', '03', '04', '05', '06', '07', '08', '09'].map((s, i) => ['C-03', `STEP-${s}`, [21, 20, 17, 17, 7, 7, 7, 7, 7][i], 'P-012']),
      ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((s, i) => ['C-04', `STEP-${s}`, [40, 39, 35, 35, 28, 28, 28, 28, 28, 19][i], 'P-012']),
      ['C-04', 'STEP-11', 26, 'P-001'], ['C-04', 'STEP-12', 21, 'P-001'], ['C-04', 'STEP-13', 17, 'P-001'],
      ['C-05', 'STEP-01', 8, 'P-014'], ['C-05', 'STEP-02', 7, 'P-014'], ['C-05', 'STEP-03', 2, 'P-014'], ['C-05', 'STEP-04', 2, 'P-014'],
      ...['01', '02', '03', '04', '05'].map((s, i) => ['C-06', `STEP-${s}`, [36, 35, 29, 29, 21][i], 'P-014']),
    ].map((r, i) => ({ id: `CS-${String(i + 1).padStart(3, '0')}`, candidate: r[0] as string, step: r[1] as string, date: ago(r[2] as number), by: r[3] as string })),
    nudges: [
      { id: 'N-01', candidate: 'C-01', contact: 'Ethan Moore', relationship: 'Facilitator', method: 'Text', date: ago(4), by: 'P-010', note: 'Asked Ethan to remind Jack to pick an interview time' },
    ],
    questions: [
      { id: 'Q-01', order: 1, title: 'Faith story', guide: 'Review their application. Ask: What is your faith story? What led you to this church? How are you involved here today?' },
      { id: 'Q-02', order: 2, title: 'Expectations and growth', guide: 'Ask: What expectations do you have as you step into leading a life group? Where do you see yourself struggling or growing?' },
      { id: 'Q-03', order: 3, title: 'Transformation Loop', guide: 'Briefly walk through each stop on the Loop. Ask: How do you see your group growing through the Loop together? What does serving one another and changing the world look like?' },
      { id: 'Q-04', order: 4, title: 'Leadership Commitment', guide: 'Walk through the Leadership Commitment and Volunteer Agreement, pausing after each section to ask whether they support it. Record each point below.' },
    ],
    points: [
      { id: 'PT-01', order: 1, text: 'Supports the Leadership Commitment and Volunteer Agreement' },
      { id: 'PT-02', order: 2, text: 'Agrees with the Change the World points' },
      { id: 'PT-03', order: 3, text: 'This is their home church, where they attend and serve regularly' },
      { id: 'PT-04', order: 4, text: 'Commits to living above reproach and upholding the church’s teaching on marriage and sexuality' },
    ],
    interviews: [
      {
        id: 'I-01', candidate: 'C-03', interviewer: 'P-012', type: 'In person', date: ago(7),
        otherNotes: 'Thoughtful and prepared. Would like a co-leader for her first season.',
        recommendation: 'Recommend with reservations', potentialCoach: false, potentialNote: '',
        submitted: true, submittedDate: ago(6), rockDone: false,
        answers: {
          'Q-01': 'Came back to faith in college. Started attending two years ago through a friend.',
          'Q-02': 'Wants to grow in consistency and prayer. A little nervous about leading discussion.',
          'Q-03': 'Excited about serving together as a group once a quarter.',
          'Q-04': 'Supports the commitment. Had a question about the home church point.',
        },
        checks: {
          'PT-01': { response: 'Affirmed', note: '' }, 'PT-02': { response: 'Affirmed', note: '' },
          'PT-03': { response: 'Has questions', note: 'Sometimes attends her family’s church on holidays; wanted to clarify' },
          'PT-04': { response: 'Affirmed', note: '' },
        },
      },
      {
        id: 'I-02', candidate: 'C-04', interviewer: 'P-012', type: 'Virtual', date: ago(28),
        otherNotes: 'Already helping run Grace’s group. A natural fit.',
        recommendation: 'Recommend', potentialCoach: true, potentialNote: 'Great with people. Revisit for coaching in about a year.',
        submitted: true, submittedDate: ago(28), rockDone: true, rockBy: 'P-001', rockDate: ago(26),
        answers: {
          'Q-01': 'Grew up in church. Joined Grace’s group last year and has helped lead since.',
          'Q-02': 'Expects leading to stretch her. Wants to grow in hospitality.',
          'Q-03': 'Already planning a group serve day for the spring.',
          'Q-04': 'Affirmed every point without hesitation.',
        },
        checks: { 'PT-01': { response: 'Affirmed', note: '' }, 'PT-02': { response: 'Affirmed', note: '' }, 'PT-03': { response: 'Affirmed', note: '' }, 'PT-04': { response: 'Affirmed', note: '' } },
      },
      {
        id: 'I-03', candidate: 'C-06', interviewer: 'P-014', type: 'Phone', date: ago(21),
        otherNotes: 'Newer to the church. Encouraged to join a group first.',
        recommendation: 'Not ready', potentialCoach: false, potentialNote: '',
        submitted: true, submittedDate: ago(21), rockDone: true, rockBy: 'P-001', rockDate: ago(19),
        answers: {
          'Q-01': 'New to faith and to the church this year.',
          'Q-02': 'Eager to serve; still finding her footing.',
          'Q-03': 'Hasn’t been in a life group yet.',
          'Q-04': 'Supports the commitment; only recently started attending.',
        },
        checks: {
          'PT-01': { response: 'Affirmed', note: '' }, 'PT-02': { response: 'Affirmed', note: '' },
          'PT-03': { response: 'Concern', note: 'Only started attending a few months ago' },
          'PT-04': { response: 'Affirmed', note: '' },
        },
      },
    ],
    touchPoints: [
      { id: 'TP-01', leader: 'P-020', coach: 'P-010', date: ago(8), type: 'In person', location: 'Coffee shop', notes: 'Group is growing. Wants to plan a serve day.', replied: true },
      { id: 'TP-02', leader: 'P-021', coach: 'P-010', date: ago(51), type: 'Call/Video', notes: 'Quick check-in; busy season at work.', replied: true },
      { id: 'TP-03', leader: 'P-022', coach: 'P-010', date: ago(16), type: '1:1 text', notes: 'Checked in after the reassignment.', replied: true },
      { id: 'TP-04', leader: 'P-023', coach: 'P-011', date: ago(72), type: 'Call/Video', notes: 'Decided to pause for the fall.', replied: true },
      { id: 'TP-05', leader: 'P-024', coach: 'P-012', date: ago(5), type: 'Call/Video', notes: 'Planning Nora’s co-leading role.', replied: true },
      { id: 'TP-06', leader: 'P-043', coach: 'P-012', date: ago(13), type: '1:1 text', notes: 'Welcome text from the 90-day plan.', replied: true },
      { id: 'TP-07', leader: 'P-043', coach: 'P-012', date: ago(6), type: '1:1 text', notes: 'Asked how her first group went.', replied: true },
      { id: 'TP-08', leader: 'P-025', coach: 'P-013', date: ago(74), type: 'In person', location: 'Church patio', notes: 'Talked through group dynamics.', replied: true },
      { id: 'TP-09', leader: 'P-026', coach: 'P-013', date: ago(56), type: 'Roster message', replied: false, rosterMessage: 'RM-01' },
      { id: 'TP-10', leader: 'P-025', coach: 'P-013', date: ago(3), type: 'Roster message', replied: false, rosterMessage: 'RM-02' },
      { id: 'TP-11', leader: 'P-026', coach: 'P-013', date: ago(3), type: 'Roster message', replied: false, rosterMessage: 'RM-02' },
      { id: 'TP-12', leader: 'P-027', coach: 'P-013', date: ago(11), type: 'Call/Video', notes: 'Zoe mentioned feeling stretched.', replied: true },
      { id: 'TP-13', leader: 'P-028', coach: 'P-014', date: ago(29), type: 'In person', location: 'Campus', notes: 'Planning a winter retreat.', replied: true },
      { id: 'TP-14', leader: 'P-029', coach: 'P-004', date: ago(19), type: '1:1 text', notes: 'Intro from Jordan while a new coach is chosen.', replied: false },
    ],
    topics: [
      { id: 'TO-01', leader: 'P-020', type: 'Follow-up', title: 'Serve day idea', details: 'Help Ethan pick a date for a group serve day.', createdBy: 'P-010', created: ago(8), assignedTo: 'P-010', status: 'Open' },
      { id: 'TO-02', leader: 'P-027', type: 'Urgent', title: 'Feeling stretched', details: 'Zoe mentioned burnout. Check in this week. Does she need a co-leader?', createdBy: 'P-013', created: ago(11), assignedTo: 'P-013', status: 'Open' },
      { id: 'TO-03', leader: 'P-021', type: 'Follow-up', title: 'Co-leader nomination', details: 'Noah nominated Ryan Ortiz. See how Noah feels about sharing leadership.', createdBy: 'P-002', created: ago(9), assignedTo: 'P-010', status: 'Open' },
      { id: 'TO-04', leader: 'P-024', type: 'Follow-up', title: 'Nora’s first month', details: 'Check how co-leading with Nora is going.', createdBy: 'P-012', created: ago(13), assignedTo: 'P-012', status: 'Resolved', resolved: ago(5) },
    ],
    coachNotes: [
      { id: 'CN-01', leader: 'P-022', coach: 'P-011', date: ago(153), note: 'Caleb prefers texts over calls.' },
      { id: 'CN-02', leader: 'P-020', coach: 'P-010', date: ago(8), note: 'Group is growing fast; may need to split in the spring.' },
      { id: 'CN-03', leader: 'P-027', coach: 'P-013', date: ago(11), note: 'Her work schedule changes in January.' },
    ],
    handoffs: [
      { id: 'HO-01', leader: 'P-022', from: 'P-011', to: 'P-010', date: ago(87), note: 'Caleb is quiet at first but opens up one-on-one. Prefers texts.' },
    ],
    plans: [
      { id: 'PLAN-01', name: 'New Leader · First 90 Days', description: 'Extra touch points for brand-new leaders, about every two weeks for three months.' },
    ],
    planSteps: [
      { id: 'PS-01', plan: 'PLAN-01', day: 0, type: '1:1 text', title: 'Welcome text', text: 'Hi {first name}! This is {coach name}. I’ll be your coach. So glad you’re leading this season. When’s a good time to connect?' },
      { id: 'PS-02', plan: 'PLAN-01', day: 7, type: '1:1 text', title: 'After their first group', text: 'Hey {first name}, how did your first group go? Anything I can help with?' },
      { id: 'PS-03', plan: 'PLAN-01', day: 14, type: 'Call/Video', title: 'Two-week call', text: '' },
      { id: 'PS-04', plan: 'PLAN-01', day: 30, type: 'In person', title: 'Coffee at one month', text: 'Hey {first name}! Want to grab coffee this week? I’d love to hear how the first month has gone.' },
      { id: 'PS-05', plan: 'PLAN-01', day: 45, type: '1:1 text', title: 'Mid-point check-in', text: 'Hi {first name}, just thinking about you and your group. How are things going?' },
      { id: 'PS-06', plan: 'PLAN-01', day: 60, type: 'Call/Video', title: 'Two-month call', text: '' },
      { id: 'PS-07', plan: 'PLAN-01', day: 75, type: '1:1 text', title: 'Check-in', text: 'Hey {first name}! Anything you’d like to talk through this week?' },
      { id: 'PS-08', plan: 'PLAN-01', day: 90, type: 'In person', title: 'Wrap-up and set your rhythm', text: '' },
    ],
    planAttachments: [{ id: 'PA-01', leader: 'P-043', plan: 'PLAN-01', start: ago(13), active: true }],
    templates: [
      { id: 'T-01', name: 'Season kickoff', channel: 'Email', subject: 'Kicking off the season', body: 'Hi {first name},\n\nI’m excited to walk alongside you this season. Let’s find a time to connect in the next couple of weeks.\n\n{coach name}', mode: 'Make it yours' },
      { id: 'T-02', name: 'Training reminder', channel: 'Text', subject: '', body: 'Hi {first name}! Reminder: New Leader Training is {date}. Details: {link}', mode: 'Send as-is' },
      { id: 'T-03', name: 'Christmas encouragement', channel: 'Email', subject: 'Merry Christmas from your coach', body: 'Hi {first name},\n\nThank you for leading this season. I’ve loved seeing your group grow. Praying for you and your family this Christmas!\n\n{coach name}', mode: 'Make it yours' },
    ],
    pushes: [{ id: 'TPU-01', template: 'T-03', audience: 'All coaches', sendBy: ahead(40), pushedBy: 'P-001', pushed: ago(1) }],
    rosterMessages: [
      { id: 'RM-01', sender: 'P-013', template: 'T-01', audience: 'All my leaders', channel: 'Email', date: ago(56) },
      { id: 'RM-02', sender: 'P-013', template: 'T-02', audience: 'All my leaders', channel: 'Text', date: ago(3) },
    ],
    spaces: [
      { id: 'SP-01', platform: 'Discord', name: 'Young Adults Announcements', channel: 'announcements', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], inFeed: true, about: 'Staff updates for everyone. Only staff post; react and reply in threads.' },
      { id: 'SP-02', platform: 'Discord', name: 'Staff', channel: 'staff', roles: ['Staff'], private: true, about: 'Staff-only conversation.' },
      { id: 'SP-03', platform: 'Discord', name: 'Young Adults General', channel: 'general', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], about: 'Open message board for everyone.' },
      { id: 'SP-04', platform: 'Discord', name: '20s/30s Announcements', channel: '2030s-announcements', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-01', 'MIN-02'], inFeed: true, postsHere: true, about: 'Updates for 20s/30s coaches and leaders.' },
      { id: 'SP-05', platform: 'Discord', name: '20s/30s Senior Coaches', channel: '2030s-sr-coaches', roles: ['Senior Coach', 'Staff'], ministries: ['MIN-01', 'MIN-02'], private: true, inFeed: true, about: 'Planning, escalations and reassignments.' },
      { id: 'SP-06', platform: 'Discord', name: '20s/30s Coaches', channel: '2030s-coaches', roles: ['Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-01', 'MIN-02'], private: true, inFeed: true, about: 'Day-to-day questions, prayer requests and encouragement.' },
      { id: 'SP-07', platform: 'Discord', name: 'College Coaches', channel: 'college-coaches', roles: ['Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-03'], private: true, inFeed: true, about: 'Day-to-day questions, prayer requests and encouragement.' },
      { id: 'SP-08', platform: 'Discord', name: 'Group A', channel: 'group-a', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-01'], private: true, inFeed: true, forPerson: 'P-002', kind: 'Group', about: 'Marcus and the coaches and leaders he oversees.' },
      { id: 'SP-09', platform: 'Discord', name: 'Huddle A1', channel: 'huddle-a1', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-01'], private: true, forPerson: 'P-010', kind: 'Huddle', about: 'Ben and his leaders.' },
      { id: 'SP-10', platform: 'Discord', name: 'Huddle A2', channel: 'huddle-a2', roles: ['Leader', 'Coach', 'Senior Coach', 'Staff'], ministries: ['MIN-01'], private: true, forPerson: 'P-011', kind: 'Huddle', about: 'Tyler and his leaders.' },
    ],
  };
}
