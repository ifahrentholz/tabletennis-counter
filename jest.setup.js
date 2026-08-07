// Use the community-maintained in-memory mock for AsyncStorage so tests can
// exercise the real persistence module (src/persistence/matchStore.ts)
// through its public interface without touching a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
