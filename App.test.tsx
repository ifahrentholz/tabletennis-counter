import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import App from './App';
import { getMatch, listMatches } from './src/persistence/matchStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function createMatchViaSetup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
  await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');
  await user.press(screen.getByRole('button', { name: 'Match starten' }));
}

describe('App', () => {
  it('starts on the setup form and navigates to the games overview of the newly created match', async () => {
    const user = userEvent.setup();
    await render(<App />);

    expect(screen.getByPlaceholderText('Name Spieler A')).toBeOnTheScreen();

    await createMatchViaSetup(user);

    const all = await listMatches();
    expect(all).toHaveLength(1);

    expect(await screen.findByLabelText('Spiele Alice')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Name Spieler A')).not.toBeOnTheScreen();
    expect(all[0].match.config.playerAName).toBe('Alice');
    expect(all[0].match.config.playerBName).toBe('Bob');
  });

  it('navigates games overview -> sets overview -> point counter and back again, one level at a time', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await createMatchViaSetup(user);
    const [stored] = await listMatches();

    await user.press(await screen.findByRole('button', { name: /Spiel 1/ }));

    expect(await screen.findByLabelText('Sätze Alice')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Satz 1/ }));

    expect(await screen.findByLabelText('Punktestand Alice')).toBeOnTheScreen();
    expect(screen.getByLabelText('Punktestand Bob')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));

    const afterPoint = await getMatch(stored.id);
    const game = afterPoint?.match.games[afterPoint.match.games.length - 1];
    const set = game?.sets[game.sets.length - 1];
    expect(set?.points).toEqual({ A: 1, B: 0 });

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByLabelText('Sätze Alice')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Punktestand Alice')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByLabelText('Spiele Alice')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Sätze Alice')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(await screen.findByPlaceholderText('Name Spieler A')).toBeOnTheScreen();
  });

  it('persists an edit-mode games standing correction made from the games overview', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await createMatchViaSetup(user);
    const [stored] = await listMatches();
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));

    expect(screen.getByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 1');
    const afterEdit = await getMatch(stored.id);
    expect(afterEdit?.match.gamesWon).toEqual({ A: 1, B: 0 });
  });
});
