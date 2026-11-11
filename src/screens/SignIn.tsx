import React, { useEffect, useRef, useState } from 'react';
import { renderSignIn, tokenEmail } from '../data/api';
import type { Status } from '../data/store';

// Shown in the real app until someone signs in, and while their data loads.
export function SignInScreen({ status, error, onSignedIn, onSignOut }: {
  status: Status; error: string; onSignedIn: () => void; onSignOut: () => void;
}) {
  const btn = useRef<HTMLDivElement>(null);
  const [gisError, setGisError] = useState('');
  useEffect(() => {
    if (status !== 'signed-out' || !btn.current) return;
    renderSignIn(btn.current, onSignedIn).catch(e => setGisError((e as Error).message));
  }, [status]);

  return (
    <div className="shell">
      <main className="gutter">
        <div className="page" style={{ paddingTop: 64, alignItems: 'center', textAlign: 'center' }}>
          <div className="page-head" style={{ alignItems: 'center' }}>
            <span className="eyebrow">Young Adults · Mariners</span>
            <h1>Huddle</h1>
            <p className="sub">Your leaders, check-ins and announcements in one place.</p>
          </div>
          {status === 'signed-out' && (
            <>
              <div ref={btn} />
              <p className="sub" style={{ maxWidth: 320 }}>
                Use the Google account you already use for the coaching sheets. Your email doesn’t need to be Gmail.
              </p>
              {gisError && <p className="t-crit">{gisError}</p>}
            </>
          )}
          {status === 'loading' && <p className="sub">Loading your people…</p>}
          {status === 'error' && (
            <div className="callout warn" style={{ textAlign: 'left' }}>
              <div className="callout-body">
                <strong>Can’t open Huddle</strong>
                <span>{error}</span>
                {tokenEmail() && <span className="row-meta">Signed in as {tokenEmail()}</span>}
                <div><button className="btn" onClick={onSignOut}>Try a different account</button></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
