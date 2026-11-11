import React, { useState } from 'react';
import { useApp } from '../data/store';
import { person, isStaff, ministryName, coachesInScope } from '../data/logic';
import { Icon, Empty, useNav } from '../ui';

export function SpacesHome() {
  const { db, userId, update } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const staff = isStaff(me);
  const [editing, setEditing] = useState(!me.discord);
  const [handle, setHandle] = useState(me.discord ?? '');
  const mine = db.spaces.filter(s => staff || (s.roles.includes(me.role) && (!s.ministry || s.ministry === me.ministry)));
  const team = coachesInScope(db, me).filter(p => p.id !== me.id);
  const unlinked = team.filter(p => !p.discord);

  const save = () => {
    const clean = handle.trim().replace(/^@/, '');
    update(d => { d.people.find(p => p.id === me.id)!.discord = clean || undefined; });
    setEditing(!clean);
    nav.toast(clean ? `Linked as @${clean}` : 'Discord username removed');
  };

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Discord</span>
        <h1>Your channels</h1>
        <p className="sub">Group conversations that replace group texts. They work on any phone or computer, so nobody gets left out.</p>
      </div>

      <section className="card">
        <div className="spread">
          <h2>Your Discord</h2>
          {me.discord && !editing && <button className="btn ghost" onClick={() => setEditing(true)}>Change</button>}
        </div>
        {me.discord && !editing ? (
          <p><Icon name="check" size={15} /> Linked as <strong>@{me.discord}</strong>. Huddle sends your reminders here and keeps your channel access up to date.</p>
        ) : (
          <>
            <p className="row-meta">Add your Discord username so Huddle can send you reminders and give you the right channels. No account yet? <a href="https://discord.com/download" target="_blank" rel="noreferrer">Get Discord</a>, it’s free.</p>
            <div className="field">
              <label htmlFor="discord-handle">Discord username</label>
              <input id="discord-handle" type="text" autoCapitalize="none" autoCorrect="off" placeholder="e.g. bencarter" value={handle} onChange={e => setHandle(e.target.value)} />
            </div>
            <button className="btn primary" disabled={!handle.trim()} onClick={save}>Save</button>
          </>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Channels for you</h2><span className="count">{mine.length}</span></div>
        <div className="list">
          {mine.length === 0 && <Empty>No channels for your role yet.</Empty>}
          {mine.map(s => (
            <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="tl-icon" aria-hidden="true"><Icon name={s.private ? 'lock' : s.name === 'Announcements' ? 'megaphone' : 'chat'} size={17} /></span>
              <div className="row-main">
                <span className="row-title">
                  #{s.channel}
                  {s.ministry && staff && <span className="pill">{ministryName(db, s.ministry)}</span>}
                  {s.autoPost && <span className="pill accent">Huddle posts here</span>}
                </span>
                <span className="row-meta">{s.about}{s.private ? ' Private to these roles.' : ''}</span>
                {s.link ? (
                  <a className="btn" href={s.link} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Open in Discord</a>
                ) : (
                  <span className="row-meta t-warn">Invite link not added yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {staff && (
        <section className="section">
          <div className="section-head"><h2>Discord setup</h2></div>
          <div className="card">
            <div className="spread">
              <strong>Coaches linked</strong>
              <span className="mono">{team.length - unlinked.length} of {team.length}</span>
            </div>
            {unlinked.length > 0 && <span className="row-meta">Not linked yet: {unlinked.map(p => p.first).join(', ')}</span>}
            <div className="divider" />
            <ol className="stack-sm" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Create the church server with these channels and the Staff, Senior Coach and Coach roles.</li>
              <li>Paste each channel’s invite link into the Spaces tab of the Huddle sheet.</li>
              <li>Add a webhook to #announcements and paste it into the sheet. Messages you send from Huddle will post there too.</li>
              <li>Later: add the Huddle bot to send reminders by direct message and keep roles in sync.</li>
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
