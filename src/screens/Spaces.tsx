import React from 'react';
import { useApp } from '../data/store';
import { person, isStaff, ministryName } from '../data/logic';
import { Icon, Empty } from '../ui';

export function SpacesHome() {
  const { db, userId } = useApp();
  const me = person(db, userId)!;
  const mine = db.spaces.filter(s => s.roles.includes(me.role) && (!s.ministry || isStaff(me) || s.ministry === me.ministry));
  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Google Chat</span>
        <h1>Spaces</h1>
        <p className="sub">Group conversations that replace long group texts. They open in the Chat tab of the Gmail app.</p>
      </div>
      <div className="list">
        {mine.length === 0 && <Empty>No spaces for your role yet.</Empty>}
        {mine.map(s => (
          <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
            <span className="tl-icon"><Icon name={s.name === 'Announcements' ? 'megaphone' : 'chat'} size={18} /></span>
            <div className="row-main">
              <span className="row-title">{s.name}{s.ministry && isStaff(me) && <span className="pill">{ministryName(db, s.ministry)}</span>}</span>
              <span className="row-meta">{s.about}</span>
              {s.link ? (
                <a className="btn" href={s.link} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Open space</a>
              ) : (
                <span className="row-meta t-warn">Join link not added yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {isStaff(me) && (
        <div className="callout">
          <Icon name="megaphone" />
          <div className="callout-body">
            <strong>Connecting a space</strong>
            <span>Paste each space’s join link into the Spaces tab of the sheet. Add the space’s webhook too, and announcements you send from Messages will post there automatically.</span>
          </div>
        </div>
      )}
    </div>
  );
}
