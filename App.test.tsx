import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import App from './App';
import { addPoint, createMatch } from './src/domain/match';
import { getMatch, listMatches, saveMatch } from './src/persistence/matchStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Answers the match list's delete confirmation (spec: "with confirmation").
 *
 * The confirmation is a `ConfirmDialog` the app draws itself rather than a
 * native `Alert` (ADR 0010), so it is answered by pressing a real button
 * instead of by stubbing a native module.
 */
async function answerDeleteConfirmation(
  user: ReturnType<typeof userEvent.setup>,
  answer: 'Löschen' | 'Abbrechen',
) {
  await user.press(await screen.findByRole('button', { name: answer }));
}

async function createMatchViaSetup(user: ReturnType<typeof userEvent.setup>) {
  await user.press(await screen.findByRole('button', { name: 'Neues Match' }));
  await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
  await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');
  await user.press(screen.getByRole('button', { name: 'Match starten' }));
}

describe('App', () => {
  it('starts on the match list and navigates to the games overview of a newly created match', async () => {
    const user = userEvent.setup();
    await render(<App />);

    expect(await screen.findByRole('button', { name: 'Neues Match' })).toBeOnTheScreen();
    expect(screen.getByText('Noch keine Matches vorhanden.')).toBeOnTheScreen();

    await createMatchViaSetup(user);

    const all = await listMatches();
    expect(all).toHaveLength(1);

    expect(await screen.findByLabelText('Spiele Alice')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Name Spieler A')).not.toBeOnTheScreen();
    expect(all[0].match.config.playerAName).toBe('Alice');
    expect(all[0].match.config.playerBName).toBe('Bob');
  });

  it('navigates match list -> games overview -> sets overview -> point counter and back again, one level at a time, landing back on the match list (closes #20)', async () => {
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

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Spiele Alice')).not.toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Name Spieler A')).not.toBeOnTheScreen();
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

  it('resumes a match straight from the match list at its current games overview state', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await createMatchViaSetup(user);
    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    await user.press(await screen.findByRole('button', { name: 'Alice vs Bob' }));

    expect(await screen.findByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 1');
  });

  it('deletes a match from the match list, persisting the removal, once the deletion is confirmed', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await createMatchViaSetup(user);
    await user.press(screen.getByRole('button', { name: 'Zurück' }));
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));
    await answerDeleteConfirmation(user, 'Löschen');

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(await listMatches()).toHaveLength(0);
  });

  it('leaves the match in the list when the delete confirmation is cancelled', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await createMatchViaSetup(user);
    await user.press(screen.getByRole('button', { name: 'Zurück' }));
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));
    await answerDeleteConfirmation(user, 'Abbrechen');

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(await listMatches()).toHaveLength(1);
  });
});

describe('App safe area (#27)', () => {
  it('wraps every screen in a SafeAreaProvider so root-level insets are available app-wide', async () => {
    await render(<App />);

    // The match list is the entry screen; its own root SafeAreaView proves
    // it actually receives the insets context this provider makes
    // available (see MatchListScreen.test.tsx for the per-screen contract).
    const root = await screen.findByTestId('match-list-safe-area');
    expect(root.type).toBe('RNCSafeAreaView');
  });
});

describe('App lock enforcement for a finished match reached fresh from the match list', () => {
  it('offers no Editieren, +1, or -1 controls anywhere in the hierarchy', async () => {
    const user = userEvent.setup();
    let match = createMatch({
      pointsToWin: 11,
      setsToWinGame: 3,
      gamesToWinMatch: 1,
      playerAName: 'Alice',
      playerBName: 'Bob',
    });
    for (let set = 0; set < 3; set += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    }
    await saveMatch(match);

    await render(<App />);

    await user.press(await screen.findByRole('button', { name: 'Alice vs Bob' }));

    expect(await screen.findByText('Alice gewinnt das Match!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Spiel 1/ }));

    expect(await screen.findByLabelText('Sätze Alice')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Satz 1/ }));

    expect(await screen.findByLabelText('Punktestand Alice')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Alice +1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Alice -1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bob +1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bob -1' })).toBeDisabled();
  });
});
