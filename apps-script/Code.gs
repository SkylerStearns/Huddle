/**
 * Huddle back office (Google Apps Script web app).
 *
 * The website never touches the Google Sheet directly. It sends every request here with the
 * person's Google sign-in token. This script checks who they are, reads or writes the sheet
 * as Skyler (the owner), and only hands back what that person is allowed to see.
 *
 * Script Properties (Project Settings > Script Properties):
 *   DATA_SHEET_ID      ID of the "Life Group Leadership – App Data" sheet
 *   GOOGLE_CLIENT_ID   OAuth client ID used by the website's "Sign in with Google" button
 *   DISCORD_GUILD_ID   The Discord server's ID, used to build "View in Discord" links
 *   DISCORD_RELAY_URL  Address of the Huddle relay on Cloudflare (discord-relay/worker.js)
 *   DISCORD_RELAY_KEY  The relay's password (the same value as RELAY_KEY on the relay)
 * The bot token lives on the relay, not here: Discord turns away requests from Apps Script.
 *
 * Deploy: Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 */

// ---------------------------------------------------------------- table map
// [field, header, type]  types: s text, b true/false, n number, d date (yyyy-mm-dd), l comma list
var TABLES = {
  people: { tab: 'People', fields: [
    ['id', 'PersonID', 's'], ['first', 'First Name', 's'], ['last', 'Last Name', 's'], ['email', 'Email', 's'],
    ['phone', 'Phone', 's'], ['role', 'Role', 's'], ['ministry', 'Ministry', 's'], ['status', 'Status', 's'],
    ['seniorCoach', 'Senior Coach', 's'], ['isInterviewer', 'Is Interviewer', 'b'], ['canReview', 'Can Review Interviews', 'b'],
    ['sLevel', 'S Level', 'n'], ['lLevel', 'L Level', 'n'], ['rhythmWeeks', 'Check-in Rhythm (weeks)', 'n'],
    ['staffNotes', 'Staff Notes', 's'], ['created', 'Created Date', 'd'], ['discord', 'Discord', 's'], ['signInEmail', 'Sign-in Email', 's']] },
  ministries: { tab: 'Ministries', fields: [['id', 'MinistryID', 's'], ['name', 'Name', 's']] },
  groups: { tab: 'Groups', fields: [
    ['id', 'GroupID', 's'], ['ministry', 'Ministry', 's'], ['leader', 'Leader', 's'], ['coLeader', 'Co-Leader', 's'],
    ['night', 'Meeting Night', 's'], ['city', 'City', 's'], ['openClosed', 'Open/Closed', 's'], ['ageRange', 'Age Range', 's'], ['active', 'Active', 'b']] },
  assignments: { tab: 'Assignments', fields: [
    ['id', 'AssignmentID', 's'], ['leader', 'Leader', 's'], ['coach', 'Coach', 's'], ['start', 'Start Date', 'd'], ['end', 'End Date', 'd'],
    ['temporary', 'Temporary', 'b'], ['reason', 'Reason', 's'], ['movedBy', 'Moved By', 's'],
    ['externalUpdated', 'Updated in External Platform', 'b'], ['externalBy', 'Updated By', 's'], ['externalDate', 'Updated Date', 'd']] },
  moveRequests: { tab: 'Move Requests', fields: [
    ['id', 'RequestID', 's'], ['leader', 'Leader', 's'], ['suggestedCoach', 'Suggested Coach', 's'], ['reason', 'Reason', 's'],
    ['requestedBy', 'Requested By', 's'], ['date', 'Requested Date', 'd'], ['status', 'Status', 's'], ['resolvedBy', 'Resolved By', 's'], ['resolvedDate', 'Resolved Date', 'd']] },
  seasons: { tab: 'Seasons', fields: [
    ['id', 'SeasonID', 's'], ['name', 'Name', 's'], ['start', 'Start Date', 'd'], ['end', 'End Date', 'd'], ['training', 'Training Dates', 's'], ['active', 'Active', 'b']] },
  candidates: { tab: 'Candidates', fields: [
    ['id', 'CandidateID', 's'], ['person', 'Person', 's'], ['season', 'Season', 's'], ['ministry', 'Ministry', 's'], ['nominatedBy', 'Nominated By', 's'],
    ['interviewer', 'Interviewer', 's'], ['status', 'Status', 's'], ['waitingSince', 'Waiting Since', 'd'], ['decision', 'Staff Decision', 's'],
    ['decisionNote', 'Decision Note', 's'], ['decidedBy', 'Decided By', 's'], ['decisionDate', 'Decision Date', 'd'], ['completed', 'Completed Date', 'd']] },
  steps: { tab: 'Checklist Steps', fields: [
    ['id', 'StepID', 's'], ['name', 'Step Name', 's'], ['order', 'Order', 'n'], ['checkedBy', 'Checked By', 's'], ['turnAfter', 'Whose Turn After', 's'], ['active', 'Active', 'b']] },
  candidateSteps: { tab: 'Candidate Steps', fields: [
    ['id', 'CandidateStepID', 's'], ['candidate', 'Candidate', 's'], ['step', 'Step', 's'], ['date', 'Done Date', 'd'], ['by', 'Done By', 's']] },
  nudges: { tab: 'Nudges', fields: [
    ['id', 'NudgeID', 's'], ['candidate', 'Candidate', 's'], ['contact', 'Contacted Person', 's'], ['relationship', 'Relationship', 's'],
    ['method', 'Method', 's'], ['date', 'Date', 'd'], ['by', 'Logged By', 's'], ['note', 'Note', 's']] },
  questions: { tab: 'Interview Questions', fields: [['id', 'QuestionID', 's'], ['title', 'Section Title', 's'], ['guide', 'Guide', 's'], ['order', 'Order', 'n'], ['active', 'Active', 'b']] },
  points: { tab: 'Commitment Points', fields: [['id', 'PointID', 's'], ['text', 'Point', 's'], ['order', 'Order', 'n'], ['active', 'Active', 'b']] },
  interviews: { tab: 'Interviews', fields: [
    ['id', 'InterviewID', 's'], ['candidate', 'Candidate', 's'], ['interviewer', 'Interviewer', 's'], ['type', 'Interview Type', 's'],
    ['date', 'Interview Date', 'd'], ['otherNotes', 'Other Notes', 's'], ['recommendation', 'Recommendation', 's'], ['potentialCoach', 'Potential Coach', 'b'],
    ['potentialNote', 'Potential Coach Note', 's'], ['submitted', 'Submitted', 'b'], ['submittedDate', 'Submitted Date', 'd'],
    ['rockDone', 'Input in Rock Done', 'b'], ['rockBy', 'Rock Entered By', 's'], ['rockDate', 'Rock Entered Date', 'd']] },
  answers: { tab: 'Interview Answers', fields: [['id', 'AnswerID', 's'], ['interview', 'Interview', 's'], ['question', 'Question', 's'], ['notes', 'Notes', 's']] },
  checks: { tab: 'Commitment Checks', fields: [['id', 'CheckID', 's'], ['interview', 'Interview', 's'], ['point', 'Point', 's'], ['response', 'Response', 's'], ['note', 'Note', 's']] },
  touchPoints: { tab: 'Touch Points', fields: [
    ['id', 'TouchPointID', 's'], ['leader', 'Leader', 's'], ['coach', 'Coach', 's'], ['date', 'Date', 'd'], ['type', 'Type', 's'],
    ['location', 'Location', 's'], ['notes', 'Notes', 's'], ['replied', 'Replied', 'b'], ['rosterMessage', 'Roster Message', 's']] },
  topics: { tab: 'Topics', fields: [
    ['id', 'TopicID', 's'], ['leader', 'Leader', 's'], ['type', 'Type', 's'], ['title', 'Title', 's'], ['details', 'Details', 's'],
    ['createdBy', 'Created By', 's'], ['created', 'Created Date', 'd'], ['assignedTo', 'Assigned To', 's'], ['status', 'Status', 's'], ['resolved', 'Resolved Date', 'd']] },
  coachNotes: { tab: 'Coach Notes', fields: [['id', 'NoteID', 's'], ['leader', 'Leader', 's'], ['coach', 'Coach', 's'], ['date', 'Date', 'd'], ['note', 'Note', 's']] },
  handoffs: { tab: 'Handoff Notes', fields: [['id', 'HandoffID', 's'], ['leader', 'Leader', 's'], ['from', 'From Coach', 's'], ['to', 'To Coach', 's'], ['date', 'Date', 'd'], ['note', 'Note', 's']] },
  plans: { tab: 'Reminder Plans', fields: [['id', 'PlanID', 's'], ['name', 'Name', 's'], ['description', 'Description', 's'], ['active', 'Active', 'b']] },
  planSteps: { tab: 'Plan Steps', fields: [['id', 'PlanStepID', 's'], ['plan', 'Plan', 's'], ['day', 'Day Offset', 'n'], ['type', 'Touch Type', 's'], ['title', 'Title', 's'], ['text', 'Suggested Text', 's']] },
  planAttachments: { tab: 'Plan Attachments', fields: [['id', 'AttachmentID', 's'], ['leader', 'Leader', 's'], ['plan', 'Plan', 's'], ['start', 'Start Date', 'd'], ['active', 'Active', 'b'], ['attachedBy', 'Attached By', 's']] },
  templates: { tab: 'Templates', fields: [['id', 'TemplateID', 's'], ['name', 'Name', 's'], ['channel', 'Channel', 's'], ['subject', 'Subject', 's'], ['body', 'Body', 's'], ['mode', 'Mode', 's'], ['active', 'Active', 'b']] },
  pushes: { tab: 'Template Pushes', fields: [['id', 'PushID', 's'], ['template', 'Template', 's'], ['audience', 'Audience', 's'], ['sendBy', 'Send By', 'd'], ['pushedBy', 'Pushed By', 's'], ['pushed', 'Pushed Date', 'd']] },
  rosterMessages: { tab: 'Roster Messages', fields: [['id', 'MessageID', 's'], ['sender', 'Sender', 's'], ['template', 'Template', 's'], ['push', 'Push', 's'], ['audience', 'Audience', 's'], ['channel', 'Channel', 's'], ['date', 'Date', 'd']] },
  spaces: { tab: 'Spaces', fields: [
    ['id', 'SpaceID', 's'], ['platform', 'Platform', 's'], ['name', 'Name', 's'], ['channel', 'Channel', 's'], ['link', 'Invite Link', 's'],
    ['roles', 'Roles', 'l'], ['ministries', 'Ministry', 'l'], ['private', 'Private', 'b'], ['postsHere', 'Huddle Posts Here', 'b'],
    ['webhook', 'Webhook URL', 's'], ['channelId', 'Channel ID', 's'], ['inFeed', 'Show in App Feed', 'b'], ['forPerson', 'For Person', 's'], ['kind', 'Kind', 's']] },
};

// Tables the website is allowed to change, and who may change them. Staff may change any of these.
var WRITABLE = ['people', 'groups', 'assignments', 'moveRequests', 'candidates', 'candidateSteps', 'nudges', 'interviews',
  'touchPoints', 'topics', 'coachNotes', 'handoffs', 'planAttachments', 'pushes', 'rosterMessages'];

// ---------------------------------------------------------------- entry points
function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var email = verifyToken_(req.token);
    var ctx = context_(email);
    if (req.action === 'load') out = { ok: true, me: ctx.me.id, db: visibleDb_(ctx), guildId: prop_('DISCORD_GUILD_ID') };
    else if (req.action === 'save') out = save_(ctx, req.changes || {});
    else if (req.action === 'feed') out = { ok: true, posts: feed_(ctx) };
    else if (req.action === 'post') out = postToSpace_(ctx, req.space, req.text);
    else throw new Error('Unknown request.');
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Huddle back office is running.');
}

// ---------------------------------------------------------------- sign-in
function verifyToken_(token) {
  if (!token) throw new Error('Please sign in.');
  var cache = CacheService.getScriptCache();
  var key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  var hit = cache.get(key);
  if (hit) return hit;
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Your sign-in expired. Please sign in again.');
  var info = JSON.parse(res.getContentText());
  if (info.aud !== prop_('GOOGLE_CLIENT_ID')) throw new Error('This sign-in is not for Huddle.');
  if (String(info.email_verified) !== 'true') throw new Error('Your Google email is not verified.');
  var email = String(info.email).toLowerCase();
  var ttl = Math.max(60, Math.min(3000, Number(info.exp) - Math.floor(Date.now() / 1000) - 60));
  cache.put(key, email, ttl);
  return email;
}

// ---------------------------------------------------------------- reading
function prop_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}
var SS_;
function ss_() {
  if (!SS_) SS_ = SpreadsheetApp.openById(prop_('DATA_SHEET_ID'));
  return SS_;
}
var CACHE_ = {};
function read_(table) {
  if (CACHE_[table]) return CACHE_[table];
  var def = TABLES[table];
  var sh = ss_().getSheetByName(def.tab);
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var tz = ss_().getSpreadsheetTimeZone();
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    def.fields.forEach(function (f) {
      var c = headers.indexOf(f[1]);
      obj[f[0]] = c < 0 ? undefined : fromCell_(row[c], f[2], tz);
    });
    if (obj.id) rows.push(obj);
  }
  CACHE_[table] = rows;
  return rows;
}
function fromCell_(v, type, tz) {
  if (v === '' || v === null || v === undefined) return type === 'b' ? false : type === 'l' ? [] : undefined;
  if (type === 'b') return v === true || String(v).toUpperCase() === 'TRUE';
  if (type === 'n') { var n = Number(v); return isNaN(n) ? undefined : n; }
  if (type === 'd') return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v).slice(0, 10);
  if (type === 'l') return String(v).split(',').map(function (s) { return s.trim(); }).filter(String);
  return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v).trim();
}

// ---------------------------------------------------------------- who can see what
function context_(email) {
  var people = read_('people');
  var me = people.filter(function (p) { return (p.signInEmail || '').toLowerCase() === email; })[0] ||
    people.filter(function (p) { return (p.email || '').toLowerCase() === email; })[0];
  if (!me) throw new Error('No Huddle account for ' + email + '. Ask Skyler or your senior coach to add you.');
  if (me.role === 'Leader') throw new Error('Huddle is for coaches right now. Your announcements are in Discord.');
  var active = read_('assignments').filter(function (a) { return !a.end; });
  var coachOf = {};
  active.forEach(function (a) { coachOf[a.leader] = a.coach; });
  var byId = {};
  people.forEach(function (p) { byId[p.id] = p; });

  var staff = me.role === 'Staff';
  var senior = me.role === 'Senior Coach';
  // coaches this person oversees (a senior coach also counts as coaching their own direct leaders)
  var coaches = {};
  coaches[me.id] = true;
  if (senior) people.forEach(function (p) { if (p.seniorCoach === me.id) coaches[p.id] = true; });
  // leaders in scope: leaders currently coached by any of those coaches
  var leaders = {};
  active.forEach(function (a) { if (staff || coaches[a.coach]) leaders[a.leader] = true; });
  // contact info: people below me, people above me, myself
  var contact = {};
  contact[me.id] = true;
  Object.keys(coaches).forEach(function (id) { contact[id] = true; });
  Object.keys(leaders).forEach(function (id) { contact[id] = true; });
  if (me.seniorCoach) contact[me.seniorCoach] = true;
  return { me: me, staff: staff, senior: senior, coaches: coaches, leaders: leaders, contact: contact, coachOf: coachOf, byId: byId };
}

function inMinistry_(ctx, ministry) {
  return ctx.staff || !ministry || ministry === ctx.me.ministry;
}
function candidateVisible_(ctx, c) {
  return ctx.staff || c.interviewer === ctx.me.id || (ctx.senior && c.ministry === ctx.me.ministry);
}
function answersVisible_(ctx, iv, cand) {
  return ctx.staff || iv.interviewer === ctx.me.id || (ctx.senior && cand && cand.ministry === ctx.me.ministry);
}
function spaceVisible_(ctx, s) {
  if (ctx.staff) return true;
  if ((s.roles || []).indexOf(ctx.me.role) < 0) return false;
  if ((s.ministries || []).length && s.ministries.indexOf(ctx.me.ministry) < 0) return false;
  if (!s.forPerson) return true;
  var owner = ctx.byId[s.forPerson];
  if (!owner) return false;
  if (owner.id === ctx.me.id) return true;
  // Group: a senior coach's channel with their coaches. Huddle: one coach's channel with their leaders.
  if (s.kind === 'Group') return ctx.me.seniorCoach === owner.id;
  return owner.seniorCoach === ctx.me.id; // the huddle of a coach I oversee
}

function visibleDb_(ctx) {
  var staff = ctx.staff;
  var me = ctx.me;
  var leaderIn = function (id) { return staff || ctx.leaders[id] === true; };

  var people = read_('people').map(function (p) {
    var full = staff || ctx.contact[p.id];
    var o = { id: p.id, first: p.first, last: p.last, role: p.role, ministry: p.ministry, status: p.status,
      seniorCoach: p.seniorCoach, isInterviewer: p.isInterviewer, canReview: p.canReview, rhythmWeeks: p.rhythmWeeks,
      created: p.created, email: '', phone: '' };
    if (full) { o.email = p.email; o.phone = p.phone; o.discord = p.discord; o.sLevel = p.sLevel; o.lLevel = p.lLevel; }
    if (staff) o.staffNotes = p.staffNotes;
    return o;
  });
  var candidates = read_('candidates').filter(function (c) { return candidateVisible_(ctx, c); });
  var candIds = {};
  candidates.forEach(function (c) { candIds[c.id] = c; });
  var answers = read_('answers');
  var checks = read_('checks');
  var interviews = read_('interviews').filter(function (i) { return candIds[i.candidate]; }).map(function (i) {
    var o = JSON.parse(JSON.stringify(i));
    o.answers = {};
    o.checks = {};
    if (answersVisible_(ctx, i, candIds[i.candidate])) {
      answers.forEach(function (a) { if (a.interview === i.id) o.answers[a.question] = a.notes || ''; });
      checks.forEach(function (c) { if (c.interview === i.id) o.checks[c.point] = { response: c.response, note: c.note || '' }; });
    }
    return o;
  });
  // the app needs to know each candidate's person, even if they are not a leader yet
  candidates.forEach(function (c) {
    if (ctx.contact[c.person] !== true && !staff) {
      var p = people.filter(function (x) { return x.id === c.person; })[0];
      var src = ctx.byId[c.person];
      if (p && src && c.interviewer === me.id) { p.email = src.email; p.phone = src.phone; }
    }
  });

  return {
    people: people,
    ministries: read_('ministries'),
    groups: read_('groups').filter(function (g) { return staff || leaderIn(g.leader) || leaderIn(g.coLeader); }),
    assignments: read_('assignments').filter(function (a) { return staff || leaderIn(a.leader) || ctx.coaches[a.coach]; }),
    moveRequests: read_('moveRequests').filter(function (m) { return staff || m.requestedBy === me.id || leaderIn(m.leader); }),
    seasons: read_('seasons'),
    candidates: candidates,
    steps: read_('steps').filter(function (s) { return s.active !== false; }).map(function (s) {
      return { id: s.id, name: s.name, order: s.order, checkedBy: s.checkedBy, turnAfter: s.turnAfter || undefined,
        group: s.checkedBy === 'Staff' ? 'staff' : s.turnAfter ? 'setup' : 'shared' };
    }),
    candidateSteps: read_('candidateSteps').filter(function (s) { return candIds[s.candidate]; }),
    nudges: read_('nudges').filter(function (n) { return candIds[n.candidate]; }),
    questions: read_('questions').filter(function (q) { return q.active !== false; }),
    points: read_('points').filter(function (q) { return q.active !== false; }),
    interviews: interviews,
    touchPoints: read_('touchPoints').filter(function (t) { return leaderIn(t.leader); }),
    topics: read_('topics').filter(function (t) { return leaderIn(t.leader); }),
    coachNotes: read_('coachNotes').filter(function (n) { return n.coach === me.id; }), // private to the coach who wrote them
    handoffs: read_('handoffs').filter(function (h) { return leaderIn(h.leader); }),
    plans: read_('plans').filter(function (p) { return p.active !== false; }),
    planSteps: read_('planSteps'),
    planAttachments: read_('planAttachments').filter(function (a) { return leaderIn(a.leader); }),
    templates: read_('templates').filter(function (t) { return t.active !== false; }),
    pushes: read_('pushes'),
    rosterMessages: read_('rosterMessages').filter(function (m) { return staff || m.sender === me.id; }),
    spaces: read_('spaces').filter(function (s) { return spaceVisible_(ctx, s); }).map(function (s) {
      var o = JSON.parse(JSON.stringify(s));
      o.hasWebhook = !!s.webhook;
      delete o.webhook; // anyone with a webhook URL can post, so it never leaves the server
      return o;
    }),
  };
}

// ---------------------------------------------------------------- writing
function canWrite_(ctx, table, row) {
  if (ctx.staff) return true;
  var me = ctx.me.id;
  var leaderIn = function (id) { return ctx.leaders[id] === true; };
  var cand = function (id) {
    var c = read_('candidates').filter(function (x) { return x.id === id; })[0];
    return c && candidateVisible_(ctx, c);
  };
  switch (table) {
    case 'touchPoints': return leaderIn(row.leader) && (row.coach === me || ctx.senior);
    case 'topics': case 'handoffs': case 'planAttachments': return leaderIn(row.leader);
    case 'coachNotes': return row.coach === me && leaderIn(row.leader);
    case 'moveRequests': return row.requestedBy === me || (ctx.senior && leaderIn(row.leader));
    case 'assignments': return ctx.senior && (leaderIn(row.leader) || ctx.coaches[row.coach]) && !!ctx.coaches[row.coach];
    case 'candidateSteps': case 'nudges': return cand(row.candidate);
    case 'interviews': return cand(row.candidate) && (row.interviewer === me || ctx.senior);
    case 'candidates': return candidateVisible_(ctx, row) && ctx.senior;
    case 'rosterMessages': return row.sender === me;
    default: return false; // people, groups, pushes: staff only
  }
}

function save_(ctx, changes) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var posted = [];
    Object.keys(changes).forEach(function (table) {
      if (WRITABLE.indexOf(table) < 0) throw new Error('Huddle cannot change ' + table + ' from the app.');
      var ch = changes[table] || {};
      var existing = {};
      read_(table).forEach(function (r) { existing[r.id] = r; });
      (ch.upsert || []).forEach(function (row) {
        var before = existing[row.id];
        // Anyone may set their own Discord username; everything else in People is staff-only.
        if (table === 'people' && !ctx.staff) {
          if (row.id !== ctx.me.id) throw new Error('You can’t change someone else’s details.');
          upsertRow_('people', { id: row.id, discord: String(row.discord || '').replace(/^@/, '').trim() });
          return;
        }
        if (before && !canWrite_(ctx, table, before)) throw new Error('You can’t change that record.');
        if (!canWrite_(ctx, table, row)) throw new Error('You can’t save that record.');
        if (table === 'interviews') writeInterview_(row);
        else upsertRow_(table, row);
        if (table === 'assignments' && !before && !row.end) posted.push(row);
      });
      (ch.remove || []).forEach(function (id) {
        var before = existing[id];
        if (!before) return;
        if (!canWrite_(ctx, table, before)) throw new Error('You can’t remove that record.');
        removeRow_(table, id);
      });
    });
    posted.forEach(function (a) { announceAssignment_(a); });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function sheetAndHeaders_(table) {
  var sh = ss_().getSheetByName(TABLES[table].tab);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  return { sh: sh, headers: headers };
}
function rowIndex_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) return i + 2;
  return -1;
}
function toCell_(v, type) {
  if (v === undefined || v === null) return '';
  if (type === 'b') return v === true;
  if (type === 'l') return (v || []).join(', ');
  if (type === 'n') return v === '' ? '' : Number(v);
  if (type === 'd') return String(v);
  var s = String(v);
  // keep phone numbers and IDs as text, and never let user text become a formula
  if (/^[=+\-@]/.test(s) || /^[\d\s().\/-]+$/.test(s)) return "'" + s;
  return s;
}
function upsertRow_(table, row) {
  var t = sheetAndHeaders_(table);
  var at = rowIndex_(t.sh, row.id);
  var current = at > 0 ? t.sh.getRange(at, 1, 1, t.headers.length).getValues()[0] : t.headers.map(function () { return ''; });
  TABLES[table].fields.forEach(function (f) {
    var c = t.headers.indexOf(f[1]);
    if (c >= 0 && row.hasOwnProperty(f[0])) current[c] = toCell_(row[f[0]], f[2]);
  });
  if (at > 0) t.sh.getRange(at, 1, 1, current.length).setValues([current]);
  else t.sh.appendRow(current);
  delete CACHE_[table];
}
function removeRow_(table, id) {
  var t = sheetAndHeaders_(table);
  var at = rowIndex_(t.sh, id);
  if (at > 0) t.sh.deleteRow(at);
  delete CACHE_[table];
}
function writeInterview_(iv) {
  var base = {};
  TABLES.interviews.fields.forEach(function (f) { if (iv.hasOwnProperty(f[0])) base[f[0]] = iv[f[0]]; });
  upsertRow_('interviews', base);
  var answers = read_('answers');
  Object.keys(iv.answers || {}).forEach(function (q) {
    var hit = answers.filter(function (a) { return a.interview === iv.id && a.question === q; })[0];
    upsertRow_('answers', { id: hit ? hit.id : 'IA-' + iv.id + '-' + q, interview: iv.id, question: q, notes: iv.answers[q] });
  });
  var checks = read_('checks');
  Object.keys(iv.checks || {}).forEach(function (p) {
    var hit = checks.filter(function (c) { return c.interview === iv.id && c.point === p; })[0];
    var v = iv.checks[p] || {};
    upsertRow_('checks', { id: hit ? hit.id : 'CC-' + iv.id + '-' + p, interview: iv.id, point: p, response: v.response || '', note: v.note || '' });
  });
}

// ---------------------------------------------------------------- Discord
// Reading: Discord turns away requests that come from Apps Script, so reads go through the Huddle
// relay on Cloudflare (discord-relay/worker.js), which holds the bot token.
// Posting: channel webhooks work straight from here (postWebhook_ below).
var RELAY_MAX_PATHS = 25;
function discordReady_() {
  return !!(prop_('DISCORD_RELAY_URL') && prop_('DISCORD_RELAY_KEY'));
}
/** Asks Discord for each path through the relay. Returns one answer per path, or null where it failed. */
function relay_(paths) {
  var out = [];
  for (var i = 0; i < paths.length; i += RELAY_MAX_PATHS) {
    out = out.concat(relayBatch_(paths.slice(i, i + RELAY_MAX_PATHS)));
  }
  return out;
}
function relayBatch_(paths) {
  var none = paths.map(function () { return null; });
  var res;
  try {
    res = UrlFetchApp.fetch(prop_('DISCORD_RELAY_URL').trim(), {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'X-Relay-Key': prop_('DISCORD_RELAY_KEY').trim() },
      payload: JSON.stringify({ paths: paths }),
    });
  } catch (err) {
    Logger.log('Relay could not be reached: ' + err);
    return none;
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Relay → ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
    return none;
  }
  var results;
  try { results = JSON.parse(res.getContentText()).results || []; } catch (err) { return none; }
  return paths.map(function (path, i) {
    var r = results[i];
    if (r && r.status === 200 && r.body) return r.body;
    Logger.log('Discord ' + path + ' → ' + (r ? r.status + ' ' + JSON.stringify(r.body).slice(0, 200) : 'no answer'));
    return null;
  });
}
function discordGet_(path) {
  return relay_([path])[0];
}

var FEED_FRESH_SECONDS = 90;   // a channel's posts are reused this long before asking Discord again
var FEED_KEEP_SECONDS = 21600; // last good copy (6 hours), shown if Discord or the relay has a hiccup

// Discord stores "@Coaches" as <@&123…>. This turns those codes back into readable names.
function feedText_(m, roleNames, channelNames) {
  var users = {};
  (m.mentions || []).forEach(function (u) { users[u.id] = u.global_name || u.username; });
  return String(m.content || '')
    .replace(/<@&(\d+)>/g, function (x, id) { return '@' + String(roleNames[id] || 'role').replace(/^@/, ''); })
    .replace(/<@!?(\d+)>/g, function (x, id) { return '@' + (users[id] || 'someone'); })
    .replace(/<#(\d+)>/g, function (x, id) { return '#' + (channelNames[id] || 'channel'); })
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/<t:(\d+)(?::[a-zA-Z])?>/g, function (x, secs) {
      return Utilities.formatDate(new Date(Number(secs) * 1000), Session.getScriptTimeZone(), 'EEE, MMM d, h:mm a');
    });
}
function feedPost_(m, roleNames, channelNames) {
  return {
    id: m.id, text: feedText_(m, roleNames, channelNames), at: m.timestamp,
    author: (m.member && m.member.nick) || m.author.global_name || m.author.username,
    images: (m.attachments || []).filter(function (a) { return /^image\//.test(a.content_type || ''); }).map(function (a) { return a.url; }),
    reactions: (m.reactions || []).reduce(function (n, r) { return n + (r.count || 0); }, 0),
    replies: m.thread ? (m.thread.message_count || 0) : 0,
  };
}

/** The latest posts from the Discord channels this person is allowed to see. Read-only. */
function feed_(ctx) {
  if (!discordReady_()) return [];
  var guild = prop_('DISCORD_GUILD_ID');
  var cache = CacheService.getScriptCache();
  var allSpaces = read_('spaces');
  var spaces = allSpaces.filter(function (s) { return s.inFeed && s.channelId && spaceVisible_(ctx, s); });
  if (!spaces.length) return [];

  var byChannel = {};
  var hits = cache.getAll(spaces.map(function (s) { return 'feed_' + s.channelId; }));
  Object.keys(hits).forEach(function (k) { byChannel[k.slice(5)] = JSON.parse(hits[k]); });
  var missing = [];
  spaces.forEach(function (s) { if (!byChannel[s.channelId] && missing.indexOf(s.channelId) < 0) missing.push(s.channelId); });

  if (missing.length) {
    // One trip to the relay for every channel that needs refreshing (plus role names, if we don't have them)
    var roleHit = cache.get('feed_roles');
    var paths = missing.map(function (id) { return '/channels/' + id + '/messages?limit=10'; });
    var askRoles = !roleHit && !!guild;
    if (askRoles) paths.push('/guilds/' + guild + '/roles');
    var answers = relay_(paths);

    var roleNames = roleHit ? JSON.parse(roleHit) : {};
    if (askRoles && answers[missing.length]) {
      answers[missing.length].forEach(function (r) { roleNames[r.id] = r.name; });
      cache.put('feed_roles', JSON.stringify(roleNames), FEED_KEEP_SECONDS);
    }
    var channelNames = {};
    allSpaces.forEach(function (s) { if (s.channelId) channelNames[s.channelId] = String(s.channel || '').replace(/^#/, ''); });

    var fresh = {}, keep = {}, failed = [];
    missing.forEach(function (id, i) {
      if (!answers[i]) { failed.push(id); return; }
      byChannel[id] = answers[i]
        .filter(function (m) { return m.type === 0 || m.type === 19 || m.type === 20; })
        .map(function (m) { return feedPost_(m, roleNames, channelNames); });
      var text = JSON.stringify(byChannel[id]);
      fresh['feed_' + id] = text;
      keep['feedkeep_' + id] = text;
    });
    if (Object.keys(fresh).length) {
      cache.putAll(fresh, FEED_FRESH_SECONDS);
      cache.putAll(keep, FEED_KEEP_SECONDS);
    }
    if (failed.length) {
      // Discord or the relay didn't answer: show the last good copy rather than an empty feed
      var old = cache.getAll(failed.map(function (id) { return 'feedkeep_' + id; }));
      failed.forEach(function (id) { if (old['feedkeep_' + id]) byChannel[id] = JSON.parse(old['feedkeep_' + id]); });
    }
  }

  var posts = [];
  spaces.forEach(function (s) {
    (byChannel[s.channelId] || []).forEach(function (m) {
      posts.push({
        id: m.id, text: m.text, at: m.at, author: m.author, images: m.images, reactions: m.reactions, replies: m.replies,
        space: s.name, link: 'https://discord.com/channels/' + guild + '/' + s.channelId + '/' + m.id,
      });
    });
  });
  posts.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  return posts.slice(0, 30);
}

function postWebhook_(url, text) {
  if (!url || !text) return false;
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ content: String(text).slice(0, 1900), allowed_mentions: { parse: ['roles'] } }),
  });
  return res.getResponseCode() < 300;
}

function postToSpace_(ctx, spaceId, text) {
  var s = read_('spaces').filter(function (x) { return x.id === spaceId; })[0];
  if (!s || !spaceVisible_(ctx, s)) throw new Error('That space isn’t yours to post in.');
  if (!(ctx.staff || ctx.senior)) throw new Error('Only staff and senior coaches post from Huddle.');
  if (!postWebhook_(s.webhook, text)) throw new Error('Discord didn’t accept the post. Check the space’s webhook.');
  return { ok: true };
}

function announceAssignment_(a) {
  var people = {};
  read_('people').forEach(function (p) { people[p.id] = p; });
  var leader = people[a.leader];
  var coach = people[a.coach];
  if (!leader || !coach) return;
  var space = read_('spaces').filter(function (s) {
    return s.postsHere && s.webhook && (!(s.ministries || []).length || s.ministries.indexOf(leader.ministry) >= 0);
  })[0];
  if (space) postWebhook_(space.webhook, '🙌 ' + leader.first + ' ' + leader.last + ' is now being coached by ' + coach.first + ' ' + coach.last + '.');
}

// ---------------------------------------------------------------- setup helpers (run once from the editor)
/** Run this once from the editor to check the sheet and Discord settings. Results show in the log. */
function checkSetup() {
  ['DATA_SHEET_ID', 'GOOGLE_CLIENT_ID', 'DISCORD_GUILD_ID', 'DISCORD_RELAY_URL', 'DISCORD_RELAY_KEY'].forEach(function (k) {
    Logger.log(k + ': ' + (prop_(k) ? 'set' : 'MISSING'));
  });
  Object.keys(TABLES).forEach(function (t) {
    var sh = ss_().getSheetByName(TABLES[t].tab);
    if (!sh) { Logger.log('Missing tab: ' + TABLES[t].tab); return; }
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var missing = TABLES[t].fields.filter(function (f) { return headers.indexOf(f[1]) < 0; }).map(function (f) { return f[1]; });
    Logger.log(TABLES[t].tab + ': ' + read_(t).length + ' rows' + (missing.length ? ' · missing columns: ' + missing.join(', ') : ''));
  });
  if (!discordReady_()) { Logger.log('Announcements feed: off until DISCORD_RELAY_URL and DISCORD_RELAY_KEY are set.'); return; }
  var spaces = read_('spaces').filter(function (s) { return s.channelId; });
  var seen = relay_(spaces.map(function (s) { return '/channels/' + s.channelId; }));
  spaces.forEach(function (s, i) {
    Logger.log('Discord ' + s.name + ': ' + (seen[i] ? 'bot can read it' : 'bot CANNOT read it'));
  });
  // Can the bot read what the posts say? Without Message Content Intent, Discord blanks the text.
  var feedSpaces = spaces.filter(function (s) { return s.inFeed; });
  var posts = [];
  relay_(feedSpaces.map(function (s) { return '/channels/' + s.channelId + '/messages?limit=5'; })).forEach(function (list) {
    (list || []).forEach(function (m) { if (m.type === 0 || m.type === 19) posts.push(m); });
  });
  var blank = posts.filter(function (m) { return !m.content && !(m.attachments || []).length && !(m.embeds || []).length; });
  if (!posts.length) Logger.log('Announcements feed: no posts in the feed channels yet. Post one in Discord, then run this again.');
  else if (blank.length === posts.length) Logger.log('Announcements feed: read ' + posts.length + ' posts but their text is BLANK. Turn on Message Content Intent for the bot (Discord developer portal > Bot).');
  else Logger.log('Announcements feed: read ' + posts.length + ' posts and their text is coming through.');
}

/**
 * Run once from the editor after the bot is in the server and the relay and
 * DISCORD_GUILD_ID are set. Looks up every channel in the server and writes its ID into
 * Spaces > Channel ID wherever the Channel column matches the Discord channel name.
 * The log lists anything it couldn't match.
 */
function fillChannelIds() {
  var guild = prop_('DISCORD_GUILD_ID');
  if (!guild || !discordReady_()) throw new Error('Set DISCORD_GUILD_ID, DISCORD_RELAY_URL and DISCORD_RELAY_KEY in Script Properties first.');
  var channels = discordGet_('/guilds/' + guild + '/channels');
  if (!channels) throw new Error('The bot could not list the server’s channels. Is it in the server, and is DISCORD_GUILD_ID right?');
  var byName = {};
  channels.filter(function (c) { return c.type === 0 || c.type === 5 || c.type === 15; }).forEach(function (c) {
    var key = c.name.toLowerCase();
    (byName[key] = byName[key] || []).push(c.id);
  });
  var t = sheetAndHeaders_('spaces');
  var nameCol = t.headers.indexOf('Channel');
  var idCol = t.headers.indexOf('Channel ID');
  var rows = t.sh.getRange(2, 1, t.sh.getLastRow() - 1, t.headers.length).getValues();
  var used = {};
  rows.forEach(function (r, i) {
    var name = String(r[nameCol]).replace(/^#/, '').trim().toLowerCase();
    if (!name) return;
    var ids = byName[name] || [];
    if (ids.length === 1) {
      t.sh.getRange(i + 2, idCol + 1).setValue("'" + ids[0]);
      used[name] = true;
      Logger.log('✓ #' + name);
    } else if (ids.length > 1) {
      Logger.log('? #' + name + ' matches ' + ids.length + ' channels. Rename one in Discord, or paste the right ID by hand.');
    } else {
      Logger.log('✗ #' + name + ' is not in Discord. Rename the channel to match, or fix the Channel column.');
    }
  });
  Object.keys(byName).forEach(function (n) { if (!used[n]) Logger.log('· #' + n + ' is in Discord but not in the Spaces tab (fine if Huddle doesn’t need it).'); });
}

// ---------------------------------------------------------------- auto posts
// Friendly Discord posts when something new shows up in the sheet. The "Auto Posts" tab holds, for
// each event, where it posts, an on/off switch and the wording; "Auto Post Log" records what has
// been posted so nothing posts twice. A timer runs checkAutoPosts every 15 minutes (setupAutoPosts).
//
// Events:  New coach · New senior coach · New leader · Leader moved
// Posts To: Group channel · Huddle channel · Senior coaches channel

var AUTO_LOG_TAB = 'Auto Post Log';
var AUTO_EVENTS = ['New coach', 'New senior coach', 'New leader', 'Leader moved'];

function autoPostSettings_() {
  var out = {};
  var sh = ss_().getSheetByName('Auto Posts');
  if (!sh) return out;
  sh.getDataRange().getValues().slice(1).forEach(function (r) {
    var ev = String(r[0]).trim();
    if (ev) out[ev] = { postsTo: String(r[1]).trim(), on: r[2] === true || String(r[2]).toUpperCase() === 'TRUE', message: String(r[3] || '') };
  });
  return out;
}
function autoLogged_() {
  var sh = ss_().getSheetByName(AUTO_LOG_TAB);
  var done = {};
  if (!sh || sh.getLastRow() < 2) return done;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { done[r[0] + '|' + r[1]] = true; });
  return done;
}
function autoLog_(event, key, where, note) {
  ss_().getSheetByName(AUTO_LOG_TAB).appendRow([event, key, new Date(), where, note || '']);
}
function fill_(template, vars) {
  return template.replace(/\{(\w+)\}/g, function (m, k) { return vars.hasOwnProperty(k) ? vars[k] : m; });
}
function channelMention_(space) {
  return space && space.channelId ? '<#' + space.channelId + '>' : (space ? '#' + space.channel : 'their huddle');
}

// Who's involved, for filling in a message and choosing the channel.
function autoContext_(ids) {
  var people = {};
  read_('people').forEach(function (p) { people[p.id] = p; });
  var leader = people[ids.leader], coach = people[ids.coach];
  var senior = people[ids.senior || (coach && coach.seniorCoach)];
  if (coach && coach.role === 'Senior Coach' && !ids.senior) senior = coach; // a senior coach coaching leaders directly
  var spaces = read_('spaces');
  var group = senior && spaces.filter(function (s) { return s.kind === 'Group' && s.forPerson === senior.id; })[0];
  var huddle = coach && spaces.filter(function (s) { return s.kind === 'Huddle' && s.forPerson === coach.id; })[0];
  var ministry = (senior || coach || leader || {}).ministry;
  var srCoaches = spaces.filter(function (s) {
    return !s.forPerson && s.roles.join(',') === 'Senior Coach,Staff' && (s.ministries || []).indexOf(ministry) >= 0;
  })[0];
  var name = function (p) { return p ? p.first + ' ' + p.last : ''; };
  return {
    channels: { 'Group channel': group, 'Huddle channel': huddle, 'Senior coaches channel': srCoaches },
    vars: {
      leader: name(leader), leaderFirst: leader ? leader.first : '',
      coach: name(coach), coachFirst: coach ? coach.first : '',
      seniorCoach: name(senior), seniorCoachFirst: senior ? senior.first : '',
      group: group ? group.name : 'their group', huddle: channelMention_(huddle),
    },
  };
}

// Builds the post for one event, or says why it can't post yet.
function autoPost_(setting, ids) {
  var c = autoContext_(ids);
  var space = c.channels[setting.postsTo];
  if (!space) return { skip: 'no "' + setting.postsTo + '" channel in Spaces for them yet' };
  if (!space.webhook) return { skip: 'no webhook on ' + space.name };
  return { space: space, text: fill_(setting.message, c.vars) };
}

// Everything that should have a post: [event, log key, ids]
function autoCandidates_() {
  var out = [];
  var people = read_('people');
  var assignments = read_('assignments');
  people.forEach(function (p) {
    if (p.status !== 'Active') return;
    if (p.role === 'Coach' && p.seniorCoach) out.push(['New coach', p.id, { coach: p.id }]);
    if (p.role === 'Senior Coach') out.push(['New senior coach', p.id, { senior: p.id }]);
  });
  var hadEarlier = {};
  assignments.forEach(function (a) { if (a.end) hadEarlier[a.leader] = true; });
  assignments.forEach(function (a) {
    if (a.end) return;
    if (hadEarlier[a.leader]) out.push(['Leader moved', a.id, { leader: a.leader, coach: a.coach }]);
    else out.push(['New leader', a.leader, { leader: a.leader, coach: a.coach }]);
  });
  return out;
}

/** Runs on a timer. Posts anything new that hasn't been posted yet. */
function checkAutoPosts() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    CACHE_ = {};
    var settings = autoPostSettings_();
    var done = autoLogged_();
    autoCandidates_().forEach(function (c) {
      var setting = settings[c[0]];
      if (!setting || !setting.on || done[c[0] + '|' + c[1]]) return;
      var post = autoPost_(setting, c[2]);
      if (post.skip) { Logger.log(c[0] + ' ' + c[1] + ' waiting: ' + post.skip); return; } // tries again next run
      if (postWebhook_(post.space.webhook, post.text)) {
        autoLog_(c[0], c[1], post.space.name, post.text);
        done[c[0] + '|' + c[1]] = true;
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run once from the editor (and again after adding a new event to Auto Posts). Marks everything
 * that already exists as posted, so turning this on doesn't flood Discord, then starts the timer.
 */
function setupAutoPosts() {
  if (!ss_().getSheetByName('Auto Posts')) throw new Error('Add the "Auto Posts" tab to the sheet first.');
  if (!ss_().getSheetByName(AUTO_LOG_TAB)) throw new Error('Add the "' + AUTO_LOG_TAB + '" tab to the sheet first.');
  var done = autoLogged_();
  var n = 0;
  autoCandidates_().forEach(function (c) {
    if (!done[c[0] + '|' + c[1]]) { autoLog_(c[0], c[1], '', 'Already in place when auto posts started'); done[c[0] + '|' + c[1]] = true; n++; }
  });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'checkAutoPosts') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkAutoPosts').timeBased().everyMinutes(15).create();
  Logger.log('Marked ' + n + ' existing people and assignments as already posted. Checking every 15 minutes.');
}

/** Run from the editor to see each kind of post in Discord without changing anything. Marked as a test. */
function sendTestAutoPosts() {
  var settings = autoPostSettings_();
  var seen = {};
  autoCandidates_().forEach(function (c) {
    if (seen[c[0]] || !settings[c[0]]) return;
    var post = autoPost_(settings[c[0]], c[2]);
    if (post.skip) return;
    seen[c[0]] = true;
    Logger.log(c[0] + ' → ' + post.space.name + ': ' + (postWebhook_(post.space.webhook, '🧪 Test: ' + post.text) ? 'posted' : 'Discord didn’t accept it'));
  });
  AUTO_EVENTS.forEach(function (e) { if (!seen[e]) Logger.log(e + ': nothing to test with yet (or its channel has no webhook).'); });
}
