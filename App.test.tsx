import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import App from './App';
import { getMatch, listMatches } from './src/persistence/matchStore';

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

  it('navigates from the match detail stub into the point counter and back again', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
    await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');
    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    const [stored] = await listMatches();

    await user.press(screen.getByRole('button', { name: 'Punkte zählen' }));

    expect(await screen.findByLabelText('Punktestand Alice')).toBeOnTheScreen();
    expect(screen.getByLabelText('Punktestand Bob')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));

    const afterPoint = await getMatch(stored.id);
    const game = afterPoint?.match.games[afterPoint.match.games.length - 1];
    const set = game?.sets[game.sets.length - 1];
    expect(set?.points).toEqual({ A: 1, B: 0 });

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByText(`Match ${stored.id}`)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Punktestand Alice')).not.toBeOnTheScreen();
  });
});
