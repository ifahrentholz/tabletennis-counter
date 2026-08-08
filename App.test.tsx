import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import App from './App';
import { listMatches } from './src/persistence/matchStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('App', () => {
  it('starts on the setup form and navigates to the newly created match after "Match starten"', async () => {
    const user = userEvent.setup();
    await render(<App />);

    expect(screen.getByPlaceholderText('Name Spieler A')).toBeOnTheScreen();

    await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
    await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');
    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    const all = await listMatches();
    expect(all).toHaveLength(1);
    const stored = all[0];

    expect(screen.getByText(`Match ${stored.id}`)).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Name Spieler A')).not.toBeOnTheScreen();
    expect(stored.match.config.playerAName).toBe('Alice');
    expect(stored.match.config.playerBName).toBe('Bob');
  });
});
