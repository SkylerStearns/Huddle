import React from 'react';
import { useApp } from '../data/store';
import { person, isStaff, ministryName, spacesFor, spaceLink } from '../data/logic';
import { Icon, Empty } from '../ui';

export function SpacesHome() {
  const { db, userId, guildId } = useApp();
  const me = person(db, userId)!;
  const mine = spacesFor(db, me);
  const missingIds = mine.filter(s => !s.channelId && !s.link).length;
  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Discord</span>
        <h1>Spaces</h1>
        <p className="sub">Group conversations live in Discord. These are the channels you can see; tap one to open it in the Discord app.</p>
      </div>
      <div className="list">
        {mine.length === 0 && <Empty>No spaces for your role yet.</Empty>}
        {mine.map(s => {
          const href = spaceLink(s, guildId);
          return (
            <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="tl-icon"><Icon name={s.inFeed && !s.forPerson ? 'megaphone' : s.private ? 'lock' : 'chat'} size={18} /></span>
              <div className="row-main">
                <span className="row-title">
                  {s.name}
                  {s.channel && <span className="pill">#{s.channel}</span>}
                  {isStaff(me) && !!s.ministries?.length && <span className="pill">{s.ministries.map(m => ministryName(db, m)).join(', ')}</span>}
                </span>
                {s.about && <span className="row-meta">{s.about}</span>}
                {s.forPerson && <span className="row-meta">For {person(db, s.forPerson)?.first ?? 'a coach'}’s people</span>}
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
      {isStaff(me) && (
        <div className="callout">
          <Icon name="megaphone" />
          <div className="callout-body">
            <strong>Connecting a channel</strong>
            <span>
              In the sheet’s Spaces tab, paste each channel’s ID into Channel ID{missingIds ? ` (${missingIds} still missing)` : ''}.
              Set Show in App Feed to TRUE for channels whose posts should appear on the home screen, and add a webhook to the channel marked
              Huddle Posts Here so new coach assignments are announced automatically.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
