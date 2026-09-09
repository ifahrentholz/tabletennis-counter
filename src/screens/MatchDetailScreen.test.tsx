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
    gamesToWinSet: 6,
    setsToWinMatch: 3,
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

describe('MatchDetailScreen sets standing', () => {
  it('shows the current sets standing for both players', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 0');
    expect(screen.getByLabelText('Sätze Bob')).toHaveTextContent('Sätze: 0');
  });
});

describe('MatchDetailScreen sets list navigation', () => {
  it('navigates to the games overview of the tapped set', async () => {
    const user = userEvent.setup();
    const onOpenGamesOverview = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen
        matchId={matchId}
        onOpenGamesOverview={onOpenGamesOverview}
        onBack={jest.fn()}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /Satz 1/ }));

    expect(onOpenGamesOverview).toHaveBeenCalledWith(matchId, 0);
  });
});

describe('MatchDetailScreen back navigation', () => {
  it('calls onBack without requiring or offering a save action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={onBack} />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeOnTheScreen();
  });
});

describe('MatchDetailScreen edit mode', () => {
  it('offers an Editieren button while the match is not yet won', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByRole('button', { name: 'Editieren' })).toBeOnTheScreen();
  });

  it('manually corrects the sets standing via a stepper, persisting immediately', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Bob +1' }));

    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 2');
    expect(screen.getByLabelText('Sätze Bob')).toHaveTextContent('Sätze: 1');

    const stored = await getMatch(matchId);
    expect(stored?.match.setsWon).toEqual({ A: 2, B: 1 });
  });

  it('does not recalculate the match winner when the sets standing is edited', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig({ setsToWinMatch: 3 })));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );
    await screen.findByLabelText('Sätze Alice');

    await user.press(screen.getByRole('button', { name: 'Editieren' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));
    await user.press(screen.getByRole('button', { name: 'Sätze Alice +1' }));

    expect(screen.getByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 3');
    const stored = await getMatch(matchId);
    expect(stored?.match.winner).toBeNull();
  });

  it('hides the Editieren button once the match is won', async () => {
    let match = createMatch(makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1 }));
    for (let set = 0; set < 3; set += 1) {
      for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
    }
    const matchId = await seedMatch(match);

    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Sätze Alice')).toHaveTextContent('Sätze: 1');
    expect(screen.queryByRole('button', { name: 'Editieren' })).not.toBeOnTheScreen();
  });
});

describe('MatchDetailScreen safe area (#27)', () => {
  it('renders its content inside a device-safe-area-aware root, respecting the notch/status bar and home indicator', async () => {
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(
      <MatchDetailScreen matchId={matchId} onOpenGamesOverview={jest.fn()} onBack={jest.fn()} />,
    );

    const root = await screen.findByTestId('match-detail-safe-area');

    expect(root.type).toBe('RNCSafeAreaView');
    expect(root.props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  });
});
