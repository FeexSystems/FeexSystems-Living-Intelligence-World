 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useEffect, } from "react";





export function useIntersectionPlay(
  ref,
  threshold = 0.25,
  opts
) {
  const [element, setElement] = useState(null);

  // Sync the observed element after mount and whenever the ref points at a
  // different node.
  //
  // This effect intentionally has NO dependency array. The observed element
  // can change without any prop/state change of this hook: e.g. a hero that
  // renders a static poster while `prefers-reduced-motion: reduce` is active
  // mounts its <video> only *after* the preference flips back, and the ref
  // object identity stays the same the whole time. A dependency list of
  // [ref, element] would therefore never re-run, and the IntersectionObserver
  // would stay detached from the freshly mounted element.
  //
  // The functional updater returns the previous state when nothing changed,
  // so React bails out of the re-render instead of looping (the previous
  // implementation used a bare `setElement(ref.current)` with a dependency
  // list, which spun forever whenever `ref.current !== element`).
  useEffect(() => {
    const current = _nullishCoalesce(ref.current, () => ( null));
    setElement((prev) => (prev === current ? prev : current));
  });

  useEffect(() => {
    const el = element || ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (_optionalChain([opts, 'optionalAccess', _ => _.pausedRef]) && opts.pausedRef.current) {
            // User explicitly paused playback; preserve paused state
            return;
          }
          try {
            const p = el.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => {});
            }
          } catch (e) {}
        } else {
          el.pause();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [element, ref, threshold, _optionalChain([opts, 'optionalAccess', _2 => _2.pausedRef])]);

  return element;
}

export default useIntersectionPlay;
