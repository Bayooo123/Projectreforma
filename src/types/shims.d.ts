// Ambient shims for build environments where type packages may be missing.
// These are intentionally permissive and only used to silence type errors
// during migration/refactor. Prefer installing proper `@types/*` packages
// in long-term maintenance.

/*
declare module 'next/server' {
  export type NextRequest = any;
  export type NextResponse = any;
}
*/

declare module 'crypto' {
  const crypto: any;
  export default crypto;
}

declare var Buffer: any;
