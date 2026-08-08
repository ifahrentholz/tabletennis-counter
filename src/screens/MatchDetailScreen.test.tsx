import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { addPoint, createMatch } from '../domain/match';
import type { Match, MatchConfig } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import { MatchDetailScreen } from './MatchDetailScreen';

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

/** Persists `match` (or a fresh default match) and returns its assigned id. */
async function seedMatch(match: Match): Promise<string> {
  const stored = await saveMatch(match);
  return stored.id;
}

describe('MatchDetailScreen games standing', () => {
  it('shows the current games standing for both players', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 0');
    expect(screen.getByLabelText('Spiele Bob')).toHaveTextContent('Spiele: 0');
  });
});

describe('MatchDetailScreen games list navigation', () => {
  it('navigates to the sets overview of the tapped game', async () => {
    const user = userEvent.setup();
    const onOpenSetsOverview = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen
        matchId={matchId}
        onOpenSetsOverview={onOpenSetsOverview}
        onBack={jest.fn()}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /Spiel 1/ }));

    expect(onOpenSetsOverview).toHaveBeenCalledWith(matchId, 0);
  });
});

describe('MatchDetailScreen back navigation', () => {
  it('calls onBack without requiring or offering a save action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={onBack} />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
  });
});

describe('MatchDetailScreen edit mode', () => {
  it('offers an Editieren button while the match is not yet won', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByRole('button', { name: 'Editieren' })).toBeOnTheScreen();
  });

  it('manually corrects the games standing via a stepper, persisting immediately', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={jest.fn()} />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Bob +1' }));

    expect(screen.getByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 2');
    expect(screen.getByLabelText('Spiele Bob')).toHaveTextContent('Spiele: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.gamesWon).toEqual({ A: 2, B: 1 });
  });

  it('does not recalculate the match winner when the games standing is edited', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig({ gamesToWinMatch: 3 })));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={jest.fn()} />,
    );
    await screen.findByLabelText('Spiele Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Spiele Alice +1' }));

    expect(screen.getByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 3');
    const stored = await getMatch(matchId);
    expect(stored?.match.winner).toBeNull();
  });

  it('hides the Editieren button once the match is won', async () => {
    let match = createMatch(makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1 }));
    for (let set = 0; set < 3; set += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    }
    const matchId = await seedMatch(match);

    await render(
      <MatchDetailScreen matchId={matchId} onOpenSetsOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Spiele Alice')).toHaveTextContent('Spiele: 1');
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();
  });
});
