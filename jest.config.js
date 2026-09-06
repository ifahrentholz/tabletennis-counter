/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Jest's 5s default is measured against a warm, idle machine. A component
  // test here pays for `jest-expo`'s module init plus a first React Native
  // render, which on a loaded 2-core CI runner running ten suites in
  // parallel has repeatedly landed just the wrong side of 5s — the same
  // commit passing on one run and timing out on the next.
  //
  // This is headroom, not a fix for slow code: locally the slowest test in
  // the suite is ~200ms, so anything approaching 15s is a genuine problem
  // and should still fail.
  testTimeout: 15000,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.config.js',
  ],
};
