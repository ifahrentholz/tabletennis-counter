/**
 * Service worker generation for the web build (ADR 0010).
 *
 * Runs *after* `expo export -p web`, over the finished `dist/`, because the
 * JS bundle's filename carries a content hash — the precache list has to be
 * generated from the real output rather than written by hand.
 *
 * The app is a scorekeeper used next to a table, frequently in a hall with
 * no usable signal, and it holds no server state whatsoever (matches live in
 * `localStorage` via the persistence layer). So the whole shell is
 * precached and served cache-first: once installed, it starts and counts
 * with the network switched off entirely.
 */

module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,json,ico,png,svg,woff,woff2}'],
  swDest: 'dist/service-worker.js',

  // Every navigation in this app resolves to the single-page shell — there
  // are no server routes (`web.output: "single"`), so an offline navigation
  // must fall back to the exported index.html.
  navigateFallback: '/tabletennis-counter/index.html',

  // Take over from a previous shell as soon as a new one is installed. The
  // app carries no in-memory state worth preserving across an update (every
  // mutation is already persisted immediately, per ADR 0003), so waiting for
  // every tab to close would only serve a stale build for no benefit.
  skipWaiting: true,
  clientsClaim: true,

  // The bundle is ~575KB; the 2MB default would silently drop it from the
  // precache if it ever grew past it, which would break offline start
  // without failing the build.
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

  // `metadata.json` is Expo's build bookkeeping and is never requested by
  // the running app.
  globIgnores: ['metadata.json'],
};
