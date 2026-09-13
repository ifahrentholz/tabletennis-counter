/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Jest's 5s default is sized for pure-JS unit tests on a warm, idle
  // machine. It is the wrong budget for this suite on two counts, both
  // measured rather than guessed:
  //
  // 1. The first test in a component file pays for `jest-expo`'s module
  //    init and the first React Native render of that file. On a cold
  //    transform cache — which CI has on every single run — that is ~1.9s
  //    here versus ~0.14s warm, and on a 4-vCPU runner running the suites
  //    in parallel it has repeatedly landed the wrong side of 5s.
  // 2. The point counter's win-cascade tests drive 33 taps through
  //    `userEvent`, whose inter-event delay is wall-clock and machine-
  //    independent. They take ~4.8s warm on a fast machine — 96% of the
  //    default budget — so the suite was already one hiccup from red.
  //
  // Raising this ceiling weakens no assertion. "The element never appeared"
  // is bounded by RNTL's own `waitFor` timeout (1s), not by this one; all
  // this bounds is "the machine was too slow", which is exactly what needs
  // headroom. Everything except the userEvent-driven cascades is under
  // ~600ms, so 15s still fails a genuine hang loudly.
  testTimeout: 15000,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.config.js',
  ],
};
