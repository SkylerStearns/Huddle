// Fill these in to switch from the demo to the real app (see SETUP.md).
// Neither is a secret: the client ID is public by design, and the back office checks every request.

// The Apps Script web app URL, ending in /exec.
export const API_URL = 'https://script.google.com/macros/s/AKfycbzPSR1RCSZifDIU3kPqVFXNhNlqG1otXZ0bcvz-KgpE1WKz7Ju_ztfOO1kouobx0RGn/exec';
// The OAuth client ID from Google Cloud, ending in .apps.googleusercontent.com.
export const GOOGLE_CLIENT_ID = '171738272289-qksh0rvsnl35phqta4tum3lbqicnkbt9.apps.googleusercontent.com';

// Add ?demo to the address to see the sample-data demo even after the real app is set up.
const forceDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
export const LIVE = !!API_URL && !!GOOGLE_CLIENT_ID && !forceDemo;
