import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { createMatch } from '../domain/match';
import type { MatchConfig } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import { PointCounterScreen } from './PointCounterScreen';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    pointsToWin: 11,
    setsToWinGame: 6,
    gamesToWinMatch: 3,
    playerAName: 'Alice',
    playerBName: 'Bob',
    ...overrides,
  };
}

/** Persists a fresh match built from `config` and returns its assigned id. */
async function seedMatch(config: Partial<MatchConfig> = {}): Promise<string> {
  const match = createMatch(makeConfig(config));
  const stored = await saveMatch(match);
  return stored.id;
}

/** Awards `count` points to `player` via the on-screen +1 button. */
async function pressPointsFor(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    await user.press(screen.getByRole('button', { name: `${name} +1` }));
  }
}

describe('PointCounterScreen initial render', () => {
  it('shows both players at 0 for the running set', async () => {
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);

    expect(await screen.findByLabelText('Punktestand Alice')).toHaveTextContent('0');
    expect(screen.getByLabelText('Punktestand Bob')).toHaveTextContent('0');
  });

  it('offers a +1 and a -1 button for each player', async () => {
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Alice +1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Alice -1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bob +1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bob -1' })).toBeOnTheScreen();
  });
});

describe('PointCounterScreen scoring a point', () => {
  it("increments the tapped player's score in the running set", async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));

    expect(screen.getByLabelText('Punktestand Alice')).toHaveTextContent('1');
    expect(screen.getByLabelText('Punktestand Bob')).toHaveTextContent('0');
  });

  it('persists the point immediately, with no save button', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));

    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
    const stored = await getMatch(matchId);
    const currentGame = stored?.match.games[stored.match.games.length - 1];
    const currentSet = currentGame?.sets[currentGame.sets.length - 1];
    expect(currentSet?.points).toEqual({ A: 1, B: 0 });
  });
});

describe('PointCounterScreen undo', () => {
  it('reverses the most recently awarded point when the set is not yet decided', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Bob +1' }));
    await user.press(screen.getByRole('button', { name: 'Bob -1' }));

    expect(screen.getByLabelText('Punktestand Alice')).toHaveTextContent('2');
    expect(screen.getByLabelText('Punktestand Bob')).toHaveTextContent('0');

    const stored = await getMatch(matchId);
    const currentGame = stored?.match.games[stored.match.games.length - 1];
    const currentSet = currentGame?.sets[currentGame.sets.length - 1];
    expect(currentSet?.points).toEqual({ A: 2, B: 0 });
  });
});

describe('PointCounterScreen set/game/match win cascade', () => {
  it('marks the set won at the point limit with a 2-point lead, resetting the next set to 0-0', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch({ pointsToWin: 11 });
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await pressPointsFor(user, 'Alice', 11);

    expect(screen.getByLabelText('Punktestand Alice')).toHaveTextContent('0');
    expect(screen.getByLabelText('Punktestand Bob')).toHaveTextContent('0');
    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.games[0].sets[0].winner).toBe('A');
    expect(stored?.match.games[0].sets).toHaveLength(2);
  });

  it('plays out deuce past the point limit until a 2-point lead is reached', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch({ pointsToWin: 11 });
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await pressPointsFor(user, 'Alice', 10);
    await pressPointsFor(user, 'Bob', 10);
    await user.press(screen.getByRole('button', { name: 'Alice +1' })); // 11-10, not yet won

    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 0');

    await user.press(screen.getByRole('button', { name: 'Bob +1' })); // 11-11
    await user.press(screen.getByRole('button', { name: 'Alice +1' })); // 12-11
    await user.press(screen.getByRole('button', { name: 'Alice +1' })); // 13-11, 2-point lead

    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 1');
  });

  it('marks the game won once the configured number of sets is reached', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 3 });
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await pressPointsFor(user, 'Alice', 11);
    await pressPointsFor(user, 'Alice', 11);
    await pressPointsFor(user, 'Alice', 11);

    expect(screen.getByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.games[0].winner).toBe('A');
    expect(stored?.match.games).toHaveLength(2);
  });

  it('marks the match won and final once the configured number of games is reached', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 });
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);
    await screen.findByLabelText('Punktestand Alice');

    await pressPointsFor(user, 'Alice', 11);
    await pressPointsFor(user, 'Alice', 11);
    await pressPointsFor(user, 'Alice', 11);

    expect(await screen.findByText('Alice gewinnt das Match!')).toBeOnTheScreen();

    const stored = await getMatch(matchId);
    expect(stored?.match.winner).toBe('A');

    expect(screen.getByRole('button', { name: 'Alice +1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Alice -1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bob +1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bob -1' })).toBeDisabled();
  });
});

describe('PointCounterScreen back navigation', () => {
  it('calls onBack without requiring or offering a save action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={onBack} />);
    await screen.findByLabelText('Punktestand Alice');

    await user.press(screen.getByRole('button', { name: 'Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
  });
});

describe('PointCounterScreen safe area (#27)', () => {
  it('renders its content inside a device-safe-area-aware root, respecting the notch/status bar and home indicator', async () => {
    const matchId = await seedMatch();
    await render(<PointCounterScreen matchId={matchId} onBack={jest.fn()} />);

    const root = await screen.findByTestId('point-counter-safe-area');

    expect(root.type).toBe('RNCSafeAreaView');
    expect(root.props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  });
});
