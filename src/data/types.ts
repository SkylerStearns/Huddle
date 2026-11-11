// One type per tab in the Google Sheet. Field names are camelCase versions of the sheet headers.

export type Role = 'Leader' | 'Coach' | 'Senior Coach' | 'Staff';
export type PersonStatus = 'Active' | 'Onboarding' | 'Paused' | 'No longer leading' | 'Not onboarded';
export type TouchType = 'In person' | 'Call/Video' | '1:1 text' | '1:1 email' | 'Roster message';
export type Party = 'Interviewer' | 'Candidate' | 'Staff';

export interface Person {
  id: string; first: string; last: string; email: string; phone: string;
  role: Role; ministry?: string; status: PersonStatus; seniorCoach?: string;
  isInterviewer: boolean; canReview: boolean; sLevel?: number; lLevel?: number;
  rhythmWeeks?: number; staffNotes?: string; created: string; discord?: string;
}
export interface Ministry { id: string; name: string }
export interface Group {
  id: string; ministry: string; leader: string; coLeader?: string; night: string;
  city: string; openClosed: 'Open' | 'Closed'; ageRange: string; active: boolean;
}
export interface Assignment {
  id: string; leader: string; coach: string; start: string; end?: string; temporary: boolean;
  reason: string; movedBy: string; externalUpdated: boolean; externalBy?: string; externalDate?: string;
}
export interface MoveRequest {
  id: string; leader: string; suggestedCoach: string; reason: string; requestedBy: string;
  date: string; status: 'Pending' | 'Approved' | 'Declined'; resolvedBy?: string; resolvedDate?: string;
}
export interface Season { id: string; name: string; start: string; end: string; training: string; active: boolean }
export interface Candidate {
  id: string; person: string; season: string; ministry: string; nominatedBy: string; interviewer: string;
  status: 'Not started' | 'In progress' | 'Submitted' | 'Decided' | 'Completed';
  waitingSince: string; decision?: 'Approved' | 'Not yet' | 'Not a fit'; decisionNote?: string;
  decidedBy?: string; decisionDate?: string; completed?: string;
}
export interface Step {
  id: string; name: string; order: number; checkedBy: 'Interviewer' | 'Staff';
  turnAfter?: Party; group: 'setup' | 'shared' | 'staff';
}
export interface CandidateStep { id: string; candidate: string; step: string; date: string; by: string }
export interface Nudge {
  id: string; candidate: string; contact: string; relationship: string; method: string;
  date: string; by: string; note: string;
}
export interface Question { id: string; title: string; guide: string; order: number }
export interface Point { id: string; text: string; order: number }
export type Commit = 'Affirmed' | 'Has questions' | 'Concern';
export interface Interview {
  id: string; candidate: string; interviewer: string; type: 'In person' | 'Phone' | 'Virtual';
  date: string; otherNotes: string;
  recommendation?: 'Recommend' | 'Recommend with reservations' | 'Not ready';
  potentialCoach: boolean; potentialNote: string; submitted: boolean; submittedDate?: string;
  rockDone: boolean; rockBy?: string; rockDate?: string;
  answers: Record<string, string>;
  checks: Record<string, { response?: Commit; note: string }>;
}
export interface TouchPoint {
  id: string; leader: string; coach: string; date: string; type: TouchType;
  location?: string; notes?: string; replied: boolean; rosterMessage?: string;
}
export interface Topic {
  id: string; leader: string; type: 'Follow-up' | 'Urgent'; title: string; details: string;
  createdBy: string; created: string; assignedTo: string; status: 'Open' | 'Resolved'; resolved?: string;
}
export interface CoachNote { id: string; leader: string; coach: string; date: string; note: string }
export interface Handoff { id: string; leader: string; from: string; to: string; date: string; note: string }
export interface Plan { id: string; name: string; description: string }
export interface PlanStep { id: string; plan: string; day: number; type: TouchType; title: string; text: string }
export interface PlanAttachment { id: string; leader: string; plan: string; start: string; active: boolean }
export interface Template {
  id: string; name: string; channel: 'Email' | 'Text'; subject: string; body: string;
  mode: 'Send as-is' | 'Make it yours';
}
export interface Push { id: string; template: string; audience: string; sendBy: string; pushedBy: string; pushed: string }
export interface RosterMessage {
  id: string; sender: string; template?: string; push?: string; audience: string;
  channel: 'Email' | 'Text'; date: string;
}
// A Discord channel (or other chat space). The back office never sends webhook URLs to the app.
export interface Space {
  id: string; platform?: string; name: string; channel?: string; link?: string; roles: Role[];
  ministries?: string[]; private?: boolean; postsHere?: boolean; hasWebhook?: boolean;
  channelId?: string; inFeed?: boolean; forPerson?: string; kind?: 'Group' | 'Huddle'; about?: string;
}
// A post read from a Discord channel for the home-screen feed (read-only in Huddle).
export interface Post {
  id: string; text: string; at: string; author: string; images: string[];
  reactions: number; replies: number; space: string; link: string;
}

export interface DB {
  people: Person[]; ministries: Ministry[]; groups: Group[]; assignments: Assignment[];
  moveRequests: MoveRequest[]; seasons: Season[]; candidates: Candidate[]; steps: Step[];
  candidateSteps: CandidateStep[]; nudges: Nudge[]; questions: Question[]; points: Point[];
  interviews: Interview[]; touchPoints: TouchPoint[]; topics: Topic[]; coachNotes: CoachNote[];
  handoffs: Handoff[]; plans: Plan[]; planSteps: PlanStep[]; planAttachments: PlanAttachment[];
  templates: Template[]; pushes: Push[]; rosterMessages: RosterMessage[]; spaces: Space[];
}
