// Re-exports the React global loaded by index.html from cdnjs.
const R = (window as any).React;
export default R;
export const { useState, useEffect, useMemo, useRef, useCallback, Fragment } = R;
