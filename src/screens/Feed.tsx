import React, { useEffect, useState } from 'react';
import { LIVE } from '../config';
import { call } from '../data/api';
import { ago } from '../data/sample';
import type { Post } from '../data/types';
import { Icon } from '../ui';

// Read-only announcements from Discord. Reactions and replies happen in Discord itself.

const SAMPLE: Post[] = [
  { id: 'd1', text: 'New Leader Training is Thursday at 7pm in the Commons. Coaches, please remind your new leaders!', at: ago(1) + 'T18:00:00Z', author: 'Pastor Kim', images: [], reactions: 12, replies: 3, space: '20s/30s Announcements', link: '' },
  { id: 'd2', text: 'Reminder: check in with any leader you haven’t talked to in 6+ weeks before the holiday break.', at: ago(3) + 'T17:00:00Z', author: 'Dana', images: [], reactions: 5, replies: 0, space: '20s/30s Coaches', link: '' },
  { id: 'd3', text: 'Winter Rooted nominations open next week. Start thinking about who in your groups is ready.', at: ago(6) + 'T16:00:00Z', author: 'Dana', images: [], reactions: 8, replies: 2, space: 'Young Adults Announcements', link: '' },
];

function when(at: string) {
  const d = new Date(at);
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnnouncementsCard() {
  const [posts, setPosts] = useState<Post[] | null>(LIVE ? null : SAMPLE);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const fetchFeed = () => {
    if (!LIVE) return;
    setError('');
    call<{ posts: Post[] }>('feed').then(r => setPosts(r.posts)).catch(e => setError((e as Error).message));
  };
  useEffect(fetchFeed, []);

  if (LIVE && posts && posts.length === 0 && !error) return null; // no channels connected yet
  const list = showAll ? posts ?? [] : (posts ?? []).slice(0, 3);
  return (
    <section className="stack-sm" aria-label="Announcements">
      <div className="section-head">
        <h2>Announcements</h2>
        {LIVE && <button className="linkbtn" onClick={fetchFeed}>Refresh</button>}
      </div>
      {error && <div className="callout warn"><Icon name="flag" /><div className="callout-body"><span>Couldn’t load announcements: {error}</span></div></div>}
      {!posts && !error && <p className="sub">Loading…</p>}
      {!!list.length && (
        <div className="list">
          {list.map(p => (
            <div key={p.id} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="tl-icon"><Icon name="megaphone" size={18} /></span>
              <div className="row-main">
                <span className="row-meta"><span className="pill">{p.space}</span> {p.author} · {when(p.at)}</span>
                <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.text}</span>
                {p.images.map(src => <img key={src} src={src} alt="" style={{ maxWidth: '100%', borderRadius: 10 }} />)}
                <span className="row-meta">
                  {p.reactions > 0 && `${p.reactions} ${p.reactions === 1 ? 'reaction' : 'reactions'}`}
                  {p.reactions > 0 && p.replies > 0 && ' · '}
                  {p.replies > 0 && `${p.replies} ${p.replies === 1 ? 'reply' : 'replies'}`}
                </span>
                {p.link && <a className="linkbtn" href={p.link} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>View in Discord</a>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(posts?.length ?? 0) > 3 && (
        <button className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${posts!.length}`}
        </button>
      )}
    </section>
  );
}
