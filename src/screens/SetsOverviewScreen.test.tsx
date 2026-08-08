import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { addPoint, createMatch } from '../domain/match';
import type { Match, MatchConfig } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import { SetsOverviewScreen } from './SetsOverviewScreen';

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

async function seedMatch(match: Match): Promise<string> {
  const stored = await saveMatch(match);
  return stored.id;
}

describe('SetsOverviewScreen sets standing', () => {
  it('shows the sets standing for both players in this game', async () => {
    let match = createMatch(makeConfig());
    match = addPoint(match, 'A'); // 1-0 in set 1 of game 0, nothing decided yet
    const matchId = await seedMatch(match);

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 0');
    expect(screen.getByLabelText('Sätze Bob')).toHaveTextContent('Sätze: 0');
  });
});

describe('SetsOverviewScreen sets list navigation', () => {
  it('navigates to the live point counter when a set is tapped', async () => {
    const user = userEvent.setup();
    const onOpenPointCounter = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={onOpenPointCounter}
        onBack={jest.fn()}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /Satz 1/ }));

    expect(onOpenPointCounter).toHaveBeenCalledWith(matchId);
  });
});

describe('SetsOverviewScreen back navigation', () => {
  it('calls onBack without requiring or offering a save action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={onBack}
      />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
  });
});

describe('SetsOverviewScreen edit mode', () => {
  it('offers an Editieren button while the match is not yet won', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Editieren' })).toBeOnTheScreen();
  });

  it('manually corrects this game’s sets standing via a stepper, persisting immediately', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Bob +1' }));

    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 2');
    expect(screen.getByLabelText('Sätze Bob')).toHaveTextContent('Sätze: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.games[0].setsWon).toEqual({ A: 2, B: 1 });
  });

  it('allows correcting the sets standing of an earlier, already-completed game', async () => {
    const user = userEvent.setup();
    let match = createMatch(makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 3 }));
    for (let set = 0; set < 3; set += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    } // finishes game 0, 3-0 for A
    const matchId = await seedMatch(match);

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Bob +1' }));

    expect(screen.getByLabelText('Sätze Bob')).toHaveTextContent('Sätze: 1');
    const stored = await getMatch(matchId);
    expect(stored?.match.games[0].setsWon).toEqual({ A: 3, B: 1 });
    // Editing an earlier game's aggregated stand never recalculates its winner.
    expect(stored?.match.games[0].winner).toBe('A');
  });

  it('hides the Editieren button once the match is won', async () => {
    let match = createMatch(makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 }));
    for (let set = 0; set < 3; set += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    }
    const matchId = await seedMatch(match);

    await render(
      <SetsOverviewScreen
        matchId={matchId}
        gameIndex={0}
        onOpenPointCounter={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(await screen.findByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 3');
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();
  });
});
