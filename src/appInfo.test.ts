import { getWelcomeMessage } from './appInfo';

describe('getWelcomeMessage', () => {
  it('returns a welcome message that names the app', () => {
    expect(getWelcomeMessage()).toBe('Tabletennis Counter');
  });
});
