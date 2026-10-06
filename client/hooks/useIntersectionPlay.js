 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useEffect, } from "react";





export function useIntersectionPlay(
  ref,
  threshold = 0.25,
  opts
) {
  const [element, setElement] = useState(null);

  useEffect(() => {
    if (ref.current !== element) {
      setElement(ref.current);
    }
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
