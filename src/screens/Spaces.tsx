import React, { useState } from 'react';
import { useApp } from '../data/store';
import { person, isStaff, ministryName, coachesInScope, spacesFor, spaceLink } from '../data/logic';
import { Icon, Empty, useNav } from '../ui';

export function SpacesHome() {
  const { db, userId, update, guildId } = useApp();
  const nav = useNav();
  const me = person(db, userId)!;
  const staff = isStaff(me);
  const [editing, setEditing] = useState(!me.discord);
  const [handle, setHandle] = useState(me.discord ?? '');
  const mine = spacesFor(db, me);
  const team = coachesInScope(db, me).filter(p => p.id !== me.id);
  const unlinked = team.filter(p => !p.discord);
  const unconnected = mine.filter(s => !spaceLink(s, guildId)).length;

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
          <p><Icon name="check" size={15} /> Linked as <strong>@{me.discord}</strong>. This is how staff know which Discord account is yours when they give out channel access.</p>
        ) : (
          <>
            <p className="row-meta">Add your Discord username so you can be given the right channels. No account yet? <a href="https://discord.com/download" target="_blank" rel="noreferrer">Get Discord</a>, it’s free.</p>
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
          {mine.map(s => {
            const href = spaceLink(s, guildId);
            return (
              <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
                <span className="tl-icon" aria-hidden="true"><Icon name={s.private ? 'lock' : s.inFeed ? 'megaphone' : 'chat'} size={17} /></span>
                <div className="row-main">
                  <span className="row-title">
                    {s.channel ? `#${s.channel}` : s.name}
                    {staff && !!s.ministries?.length && <span className="pill">{s.ministries.map(m => ministryName(db, m)).join(', ')}</span>}
                    {s.postsHere && <span className="pill accent">Huddle posts here</span>}
                  </span>
                  <span className="row-meta">
                    {s.about ?? s.name + '.'}
                    {!s.about && s.forPerson && s.kind === 'Huddle' && ` ${person(db, s.forPerson)?.first ?? 'A coach'}’s huddle.`}
                    {!s.about && s.forPerson && s.kind === 'Group' && ` ${person(db, s.forPerson)?.first ?? 'A senior coach'}’s group.`}
                    {s.private ? ' Private to these people.' : ''}
                  </span>
                  {href ? (
                    <a className="btn" href={href} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Open in Discord</a>
                  ) : (
                    <span className="row-meta t-warn">Channel not connected yet</span>
                  )}
                </div>
              </div>
            );
          })}
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
              <li>Create the server, channels and roles (see SETUP.md in the Huddle repo).</li>
              <li>Paste each channel’s ID into Channel ID in the Spaces tab of the sheet{unconnected ? ` (${unconnected} still missing)` : ''}.</li>
              <li>Set Show in App Feed to TRUE for channels whose posts should appear on the home screen.</li>
              <li>Add a webhook to the channel marked Huddle Posts Here. New coach assignments and staff announcements post there.</li>
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
