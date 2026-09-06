import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { addPoint, createMatch } from '../domain/match';
import type { Match, MatchConfig } from '../domain/match';
import { getMatch, listMatches, saveMatch } from '../persistence/matchStore';
import { MatchListScreen } from './MatchListScreen';

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Drives the two-step delete the spec asks for ("Delete a match from the
 * list (with confirmation)"): taps the row's delete action, then answers
 * the confirmation dialog the way `answer` says.
 *
 * The confirmation is drawn by the app itself rather than by `Alert.alert`
 * (ADR 0010), so it is now reachable through the same public surface as
 * every other control here — a role and an accessible name — instead of
 * needing a native module to be spied on.
 */
async function deleteMatchNamed(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  answer: 'Löschen' | 'Abbrechen',
) {
  await user.press(screen.getByRole('button', { name: `${label} löschen` }));
  await user.press(await screen.findByRole('button', { name: answer }));
}

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

/** Persists `match` and returns its assigned id. */
async function seedMatch(match: Match): Promise<string> {
  const stored = await saveMatch(match);
  return stored.id;
}

/** A match that has already been won (single game, straight sweep). */
function wonMatch(overrides: Partial<MatchConfig> = {}): Match {
  let match = createMatch(
    makeConfig({ pointsToWin: 11, setsToWinGame: 3, gamesToWinMatch: 1, ...overrides }),
  );
  for (let set = 0; set < 3; set += 1) {
    for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
  }
  return match;
}

describe('MatchListScreen listing', () => {
  it('shows every persisted match as "playerAName vs playerBName"', async () => {
    await seedMatch(createMatch(makeConfig({ playerAName: 'Alice', playerBName: 'Bob' })));
    await seedMatch(createMatch(makeConfig({ playerAName: 'Carol', playerBName: 'Dave' })));

    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carol vs Dave' })).toBeOnTheScreen();
  });

  it('sorts matches by most recently changed first', async () => {
    let now = 1000;
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now++);
    await seedMatch(createMatch(makeConfig({ playerAName: 'Older', playerBName: 'Match' })));
    await seedMatch(createMatch(makeConfig({ playerAName: 'Newer', playerBName: 'Match' })));
    dateSpy.mockRestore();

    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    const buttons = await screen.findAllByRole('button', { name: /vs Match$/ });
    expect(buttons[0]).toHaveAccessibleName('Newer vs Match');
    expect(buttons[1]).toHaveAccessibleName('Older vs Match');
  });

  it('shows an empty state when there are no persisted matches yet', async () => {
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByText('Noch keine Matches vorhanden.')).toBeOnTheScreen();
  });
});

describe('MatchListScreen resume/read-only navigation', () => {
  it('opens a running match at its current games overview state when tapped', async () => {
    const user = userEvent.setup();
    const onOpenMatch = jest.fn();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={onOpenMatch} onCreateMatch={jest.fn()} />);

    await user.press(await screen.findByRole('button', { name: 'Alice vs Bob' }));

    expect(onOpenMatch).toHaveBeenCalledWith(matchId);
  });

  it('opens a finished match the same way, for a fully read-only view of its result', async () => {
    const user = userEvent.setup();
    const onOpenMatch = jest.fn();
    const matchId = await seedMatch(wonMatch());
    await render(<MatchListScreen onOpenMatch={onOpenMatch} onCreateMatch={jest.fn()} />);

    await user.press(await screen.findByRole('button', { name: 'Alice vs Bob' }));

    expect(onOpenMatch).toHaveBeenCalledWith(matchId);
  });

  it('labels a finished match as beendet and a running match as laufend', async () => {
    await seedMatch(wonMatch({ playerAName: 'Finished', playerBName: 'One' }));
    await seedMatch(createMatch(makeConfig({ playerAName: 'Running', playerBName: 'One' })));

    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByText('Beendet')).toBeOnTheScreen();
    expect(screen.getByText('Läuft')).toBeOnTheScreen();
  });
});

describe('MatchListScreen new match action', () => {
  it('offers a visible action that navigates to the setup form to start a new match', async () => {
    const user = userEvent.setup();
    const onCreateMatch = jest.fn();
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={onCreateMatch} />);

    await user.press(await screen.findByRole('button', { name: 'Neues Match' }));

    expect(onCreateMatch).toHaveBeenCalledTimes(1);
  });

  it('offers the new match action even when the list is empty', async () => {
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Neues Match' })).toBeOnTheScreen();
  });
});

describe('MatchListScreen delete (with confirmation)', () => {
  it('asks for confirmation naming the match before deleting anything', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    // The question names the match it is about, so the wrong row can't be
    // confirmed away blindly.
    expect(await screen.findByText(/Alice vs Bob/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeOnTheScreen();
    // Nothing is deleted until the user confirms.
    expect(screen.getByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(await getMatch(matchId)).not.toBeNull();
  });

  it('removes a match from the list and persistence once the deletion is confirmed', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await deleteMatchNamed(user, 'Alice vs Bob', 'Löschen');

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(await getMatch(matchId)).toBeNull();
    expect(await listMatches()).toHaveLength(0);
  });

  it('leaves the match in the list and in persistence when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await deleteMatchNamed(user, 'Alice vs Bob', 'Abbrechen');

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(await getMatch(matchId)).not.toBeNull();
    expect(await listMatches()).toHaveLength(1);
  });

  it('only removes the tapped match, leaving other persisted matches untouched', async () => {
    const user = userEvent.setup();
    await seedMatch(createMatch(makeConfig({ playerAName: 'Alice', playerBName: 'Bob' })));
    const keepId = await seedMatch(
      createMatch(makeConfig({ playerAName: 'Carol', playerBName: 'Dave' })),
    );
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await deleteMatchNamed(user, 'Alice vs Bob', 'Löschen');

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carol vs Dave' })).toBeOnTheScreen();
    expect(await getMatch(keepId)).not.toBeNull();
  });
});

describe('MatchListScreen safe area (#27)', () => {
  it('renders its content inside a device-safe-area-aware root, respecting the notch/status bar and home indicator', async () => {
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    const root = await screen.findByTestId('match-list-safe-area');

    // `RNCSafeAreaView` is the native host component `SafeAreaView` (from
    // `react-native-safe-area-context`) renders to — asserting on it (rather
    // than on real inset pixel values, which only a native device/simulator
    // ever produces) is exactly what's meaningfully testable here.
    expect(root.type).toBe('RNCSafeAreaView');
    expect(root.props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  });
});
