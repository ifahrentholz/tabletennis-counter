import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { addPoint, createMatch } from '../domain/match';
import type { Match, MatchConfig } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import { GamesOverviewScreen } from './GamesOverviewScreen';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    pointsToWin: 11,
    gamesToWinSet: 6,
    setsToWinMatch: 3,
    playerAName: 'Alice',
    playerBName: 'Bob',
    ...overrides,
  };
}

async function seedMatch(match: Match): Promise<string> {
  const stored = await saveMatch(match);
  return stored.id;
}

describe('GamesOverviewScreen games standing', () => {
  it('shows the games standing for both players in this set', async () => {
    let match = createMatch(makeConfig());
    match = addPoint(match, 'A'); // 1-0 in game 1 of set 0, nothing decided yet
    const matchId = await seedMatch(match);

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 0');
    expect(screen.getByLabelText('Spiele Bob')).toHaveTextContent('Spiele: 0');
  });
});

describe('GamesOverviewScreen games list navigation', () => {
  it('navigates to the live point counter when a game is tapped', async () => {
    const user = userEvent.setup();
    const onOpenPointCounter = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={onOpenPointCounter}
        onBack={jest.fn()}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /Spiel 1/ }));

    expect(onOpenPointCounter).toHaveBeenCalledWith(matchId);
  });
});

describe('GamesOverviewScreen back navigation', () => {
  it('calls onBack without requiring or offering a save action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={onBack}
      />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
  });
});

describe('GamesOverviewScreen edit mode', () => {
  it('offers an Editieren button while the match is not yet won', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Editieren' })).toBeOnTheScreen();
  });

  it('manually corrects this set’s games standing via a stepper, persisting immediately', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Bob +1' }));

    expect(screen.getByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 2');
    expect(screen.getByLabelText('Spiele Bob')).toHaveTextContent('Spiele: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.sets[0].gamesWon).toEqual({ A: 2, B: 1 });
  });

  it('allows correcting the games standing of an earlier, already-completed set', async () => {
    const user = userEvent.setup();
    let match = createMatch(makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 3 }));
    for (let game = 0; game < 3; game += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    } // finishes set 0, 3-0 for A
    const matchId = await seedMatch(match);

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Bob +1' }));

    expect(screen.getByLabelText('Spiele Bob')).toHaveTextContent('Spiele: 1');
    const stored = await getMatch(matchId);
    expect(stored?.match.sets[0].gamesWon).toEqual({ A: 3, B: 1 });
    // Editing an earlier set's aggregated stand never recalculates its winner.
    expect(stored?.match.sets[0].winner).toBe('A');
  });

  it('hides the Editieren button once the match is won', async () => {
    let match = createMatch(makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 }));
    for (let game = 0; game < 3; game += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    }
    const matchId = await seedMatch(match);

    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 3');
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();
  });
});

describe('GamesOverviewScreen safe area (#27)', () => {
  it('renders its content inside a device-safe-area-aware root, respecting the notch/status bar and home indicator', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <GamesOverviewScreen
        matchId={matchId}
        setIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    const root = await screen.findByTestId('games-overview-safe-area');

    expect(root.type).toBe('RNCSafeAreaView');
    expect(root.props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  });
});
