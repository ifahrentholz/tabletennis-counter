// Use the community-maintained in-memory mock for AsyncStorage so tests can
// exercise the real persistence module (src/persistence/matchStore.ts)
// through its public interface without touching a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Use the library's own RNTL-oriented mock so `SafeAreaProvider` supplies
// insets/frame synchronously (real `SafeAreaProvider` only renders children
// once a native `onInsetsChange` event fires, which never happens under
// Jest/react-test-renderer, so tests would hang rendering nothing without
// this). `SafeAreaView` itself is left untouched by the mock — it renders
// as a plain native host component and needs no provider to render in tests.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
