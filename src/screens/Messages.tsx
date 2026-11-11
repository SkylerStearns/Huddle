import React, { useState } from 'react';
import { useApp, uid } from '../data/store';
import type { Person, Push, Template } from '../data/types';
import { person, leadersOf, coachesInScope, isStaff, isSenior, fillTemplate, today, fmtDate, firstName, daysSince } from '../data/logic';
import { Icon, Seg, Sheet, Empty, useNav } from '../ui';

type Channel = 'Email' | 'Text';

function audiences(db: any, me: Person): { key: string; label: string; people: Person[]; leaders: boolean }[] {
  const out: { key: string; label: string; people: Person[]; leaders: boolean }[] = [];
  const mine = leadersOf(db, me.id).filter(l => l.status === 'Active');
  if (mine.length) {
    out.push({ key: 'mine', label: 'All my leaders', people: mine, leaders: true });
    const fresh = mine.filter(l => db.planAttachments.some((p: any) => p.leader === l.id && p.active));
    if (fresh.length) out.push({ key: 'new', label: 'New leaders', people: fresh, leaders: true });
  }
  if (isSenior(me) || isStaff(me)) {
    const coaches = coachesInScope(db, me).filter(c => c.id !== me.id);
    out.push({ key: 'coaches', label: isStaff(me) ? 'All coaches' : 'My coaches', people: coaches, leaders: false });
    if (isStaff(me)) {
      for (const m of db.ministries) out.push({ key: `min-${m.id}`, label: `${m.name} coaches`, people: coaches.filter(c => c.ministry === m.id), leaders: false });
    }
  }
  return out;
}

export function MessagesHome() {
  const { db, userId } = useApp();
  const me = person(db, userId)!;
  const staff = isStaff(me);
  const [compose, setCompose] = useState<{ template?: Template; push?: Push } | null>(null);
  const [pushing, setPushing] = useState<Template | null>(null);
  const pending = db.pushes.filter(p => daysSince(p.sendBy) <= 0 && !staff && !db.rosterMessages.some(r => r.push === p.id && r.sender === me.id));
  const sent = db.rosterMessages.filter(r => r.sender === me.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Messages</span>
        <h1>Reach your {staff ? 'coaches' : isSenior(me) ? 'people' : 'leaders'}</h1>
        <p className="sub">Emails go out from your own Gmail, one per person. Texts open your Messages app one person at a time.</p>
      </div>

      <button className="btn primary big block" onClick={() => setCompose({})}><Icon name="send" />New message</button>

      {pending.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>From staff</h2></div>
          <div className="list">
            {pending.map(p => {
              const t = db.templates.find(x => x.id === p.template)!;
              return (
                <div key={p.id} className="row">
                  <div className="row-main">
                    <span className="row-title">{t.name} <span className="pill">{t.mode}</span></span>
                    <span className="row-meta">Send by {fmtDate(p.sendBy)} · from {firstName(db, p.pushedBy)}</span>
                  </div>
                  <button className="btn" onClick={() => setCompose({ template: t, push: p })}>Start</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {staff && (
        <section className="section">
          <div className="section-head"><h2>Templates</h2></div>
          <p className="row-meta">Push a template to coaches with a send-by date. It shows up in their “Coming up” list so the message still comes from them.</p>
          <div className="list">
            {db.templates.map(t => {
              const pu = db.pushes.find(p => p.template === t.id);
              const coaches = coachesInScope(db, me).filter(c => leadersOf(db, c.id).length);
              const done = pu ? coaches.filter(c => db.rosterMessages.some(r => r.push === pu.id && r.sender === c.id)).length : 0;
              return (
                <div key={t.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <div className="row-main">
                    <span className="row-title">{t.name} <span className="pill">{t.channel}</span><span className="pill">{t.mode}</span></span>
                    <span className="row-meta" style={{ whiteSpace: 'pre-wrap' }}>{t.body.slice(0, 110)}{t.body.length > 110 ? '…' : ''}</span>
                    {pu && <span className="row-meta t-warn">{done} of {coaches.length} coaches have sent it · due {fmtDate(pu.sendBy)}</span>}
                  </div>
                  {!pu && <button className="btn" onClick={() => setPushing(t)}>Send to coaches</button>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Sent</h2><span className="count">{sent.length}</span></div>
        <div className="list">
          {sent.length === 0 ? <Empty>Nothing sent yet.</Empty> : sent.map(r => (
            <div key={r.id} className="row">
              <Icon name={r.channel === 'Email' ? 'mail' : 'text'} />
              <div className="row-main">
                <span className="row-title">{db.templates.find(t => t.id === r.template)?.name ?? 'Message'}</span>
                <span className="row-meta">{r.audience} · {fmtDate(r.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {compose && <Compose me={me} template={compose.template} push={compose.push} onClose={() => setCompose(null)} />}
      {pushing && <PushSheet t={pushing} onClose={() => setPushing(null)} />}
    </div>
  );
}

function Compose({ me, template, push, onClose }: { me: Person; template?: Template; push?: Push; onClose: () => void }) {
  const { db, update } = useApp();
  const nav = useNav();
  const options = audiences(db, me);
  const [aud, setAud] = useState(options[0]?.key ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const [channel, setChannel] = useState<Channel>(template?.channel ?? 'Email');
  const [tid, setTid] = useState(template?.id ?? '');
  const t0 = db.templates.find(t => t.id === tid);
  const [subject, setSubject] = useState(t0?.subject ?? '');
  const [body, setBody] = useState(t0?.body ?? '');
  const season = db.seasons.find(s => s.active);
  const [date, setDate] = useState(season?.training ?? '');
  const [link, setLink] = useState('');
  const [chat, setChat] = useState(false);
  const [step, setStep] = useState<'write' | 'send'>('write');
  const [cursor, setCursor] = useState(0);
  const [opened, setOpened] = useState<string[]>([]);

  const a = options.find(o => o.key === aud);
  const handPick = aud === 'pick';
  const recipients: Person[] = handPick ? leadersOf(db, me.id).filter(l => picked.includes(l.id)) : a?.people ?? [];
  const toLeaders = handPick || !!a?.leaders;
  const vars = (p: Person) => ({ 'first name': p.first, 'coach name': me.first, date, link });
  const pickTemplate = (id: string) => {
    setTid(id);
    const t = db.templates.find(x => x.id === id);
    if (t) { setBody(t.body); setSubject(t.subject); setChannel(t.channel); }
  };
  const finish = () => {
    const rmId = uid('RM');
    update(d => {
      d.rosterMessages.push({ id: rmId, sender: me.id, template: tid || undefined, push: push?.id, audience: handPick ? `${recipients.length} picked` : a?.label ?? '', channel, date: today() });
      if (toLeaders) for (const r of recipients) d.touchPoints.push({ id: uid('TP'), leader: r.id, coach: me.id, date: today(), type: 'Roster message', replied: false, rosterMessage: rmId });
    });
    nav.toast(`Logged ${recipients.length} ${channel === 'Email' ? 'emails' : 'texts'}${chat ? ' and posted to Discord #announcements' : ''}`);
    onClose();
  };
  const linkFor = (p: Person) => {
    const text = fillTemplate(body, vars(p));
    return channel === 'Email'
      ? `mailto:${p.email}?subject=${encodeURIComponent(fillTemplate(subject, vars(p)))}&body=${encodeURIComponent(text)}`
      : `sms:${p.phone.replace(/[^0-9]/g, '')}?&body=${encodeURIComponent(text)}`;
  };

  if (step === 'send') {
    const cur = recipients[cursor];
    return (
      <Sheet title={channel === 'Email' ? 'Send emails' : 'Send texts'} onClose={onClose}>
        {channel === 'Text' && cur ? (
          <>
            <p className="sub">Person {cursor + 1} of {recipients.length}. Tap to open Messages with the text filled in, send it, then come back for the next one.</p>
            <div className="card">
              <strong>{cur.first} {cur.last}</strong>
              <span className="row-meta">{cur.phone}</span>
              <p className="quote">{fillTemplate(body, vars(cur))}</p>
              <a className="btn primary block" href={linkFor(cur)} onClick={() => setOpened([...opened, cur.id])}><Icon name="text" size={17} />Open Messages for {cur.first}</a>
            </div>
            <div className="btn-row">
              <button className="btn" disabled={cursor === 0} onClick={() => setCursor(cursor - 1)}>Previous</button>
              {cursor < recipients.length - 1 ? <button className="btn primary" onClick={() => setCursor(cursor + 1)}>Next person</button> : <button className="btn primary" onClick={finish}>Done</button>}
            </div>
          </>
        ) : (
          <>
            <p className="sub">Each button opens your email app with one personalized message.</p>
            <div className="list">
              {recipients.map(p => (
                <div key={p.id} className="row">
                  <div className="row-main"><span className="row-title">{p.first} {p.last}</span><span className="row-meta">{p.email}</span></div>
                  <a className="btn" href={linkFor(p)} onClick={() => setOpened([...opened, p.id])}>{opened.includes(p.id) ? <><Icon name="check" size={16} />Opened</> : 'Open'}</a>
                </div>
              ))}
            </div>
            <button className="btn primary block" onClick={finish}>Done · log as sent</button>
          </>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title={template ? template.name : 'New message'} onClose={onClose}>
      <div className="field">
        <span className="label">To</span>
        <div className="chips">
          {options.map(o => <button key={o.key} className="chip" aria-pressed={aud === o.key} onClick={() => setAud(o.key)}>{o.label} · {o.people.length}</button>)}
          {leadersOf(db, me.id).length > 0 && <button className="chip" aria-pressed={handPick} onClick={() => setAud('pick')}>Hand-pick</button>}
        </div>
        {handPick && (
          <div className="chips">
            {leadersOf(db, me.id).map(l => (
              <button key={l.id} className="chip" aria-pressed={picked.includes(l.id)} onClick={() => setPicked(picked.includes(l.id) ? picked.filter(x => x !== l.id) : [...picked, l.id])}>{l.first}</button>
            ))}
          </div>
        )}
        {options.length === 0 && !handPick && <span className="row-meta">You don’t have anyone to message yet.</span>}
      </div>
      <div className="field"><span className="label">How</span><Seg value={channel} options={['Email', 'Text'] as const} onChange={setChannel} /></div>
      <div className="field">
        <label htmlFor="cm-tpl">Template</label>
        <select id="cm-tpl" value={tid} onChange={e => pickTemplate(e.target.value)}>
          <option value="">Start blank</option>
          {db.templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.mode.toLowerCase()})</option>)}
        </select>
      </div>
      {channel === 'Email' && <div className="field"><label htmlFor="cm-subj">Subject</label><input id="cm-subj" type="text" value={subject} onChange={e => setSubject(e.target.value)} /></div>}
      {/\{date\}/.test(body) && <div className="field"><label htmlFor="cm-date">Date for {'{date}'}</label><input id="cm-date" type="text" value={date} onChange={e => setDate(e.target.value)} /></div>}
      {/\{link\}/.test(body) && <div className="field"><label htmlFor="cm-link">Link for {'{link}'}</label><input id="cm-link" type="text" value={link} onChange={e => setLink(e.target.value)} placeholder="https://" /></div>}
      <div className="field">
        <label htmlFor="cm-body">Message</label>
        <textarea id="cm-body" rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Use {first name} to personalize" />
        <span className="row-meta">{t0?.mode === 'Send as-is' ? 'Staff asked for this one to go out as written.' : 'Make it yours. {first name} fills in for each person.'}</span>
      </div>
      {recipients[0] && body && (
        <div className="field">
          <span className="label">Preview for {recipients[0].first}</span>
          <p className="quote">{fillTemplate(body, vars(recipients[0]))}</p>
        </div>
      )}
      {isStaff(me) && !toLeaders && (
        <label className="checkline" style={{ borderTop: 0, padding: 0 }}>
          <input type="checkbox" checked={chat} onChange={e => setChat(e.target.checked)} />
          <span className="row-main"><span className="row-title">Also post to Discord #announcements</span><span className="row-meta">Posts automatically once the channel’s webhook is added</span></span>
        </label>
      )}
      <button className="btn primary block" disabled={!recipients.length || !body.trim()} onClick={() => { setCursor(0); setStep('send'); }}>
        Continue to send · {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
      </button>
    </Sheet>
  );
}

function PushSheet({ t, onClose }: { t: Template; onClose: () => void }) {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const [sendBy, setSendBy] = useState('');
  const [audience, setAudience] = useState('All coaches');
  return (
    <Sheet title={`Send “${t.name}” to coaches`} onClose={onClose}>
      <p className="sub">Each coach gets a reminder to send it to their own leaders. {t.mode === 'Make it yours' ? 'They’re encouraged to personalize it.' : 'It’s marked send as-is.'}</p>
      <div className="field"><span className="label">Which coaches</span>
        <div className="chips">
          {['All coaches', ...db.ministries.map(m => `${m.name} coaches`)].map(a => <button key={a} className="chip" aria-pressed={audience === a} onClick={() => setAudience(a)}>{a}</button>)}
        </div>
      </div>
      <div className="field"><label htmlFor="ps-by">Send by</label><input id="ps-by" type="date" min={today()} value={sendBy} onChange={e => setSendBy(e.target.value)} /></div>
      <button className="btn primary block" disabled={!sendBy} onClick={() => {
        update(d => { d.pushes.push({ id: uid('TPU'), template: t.id, audience, sendBy, pushedBy: userId, pushed: today() }); });
        nav.toast(`Sent to ${audience.toLowerCase()}`);
        onClose();
      }}>Send to coaches</button>
      <p className="row-meta">Templates live in the shared sheet, so staff can edit the wording any time.</p>
    </Sheet>
  );
}
