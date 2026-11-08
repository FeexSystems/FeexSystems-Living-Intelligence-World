import type { ThreeElements } from '@react-three/fiber';

/**
 * React 19 moved the JSX namespace: R3F v8's own `declare global { namespace JSX }`
 * lands in the legacy global JSX namespace, which react-jsx (React 19) does not
 * read. Re-bridge it onto React 19's React.JSX namespace so <mesh>, <group>, etc.
 * type-check again.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
