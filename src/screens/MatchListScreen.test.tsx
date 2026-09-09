import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

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
 * Stubs the confirmation `Alert.alert` (spec: "Delete a match from the
 * list (with confirmation)") to immediately invoke whichever button
 * matches `buttonText` — simulating the user tapping "Löschen" (confirm)
 * or "Abbrechen" (cancel) without needing a real native alert in tests.
 */
function stubDeleteConfirmation(buttonText: 'Löschen' | 'Abbrechen') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === buttonText)?.onPress?.();
  });
}

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

/** Persists `match` and returns its assigned id. */
async function seedMatch(match: Match): Promise<string> {
  const stored = await saveMatch(match);
  return stored.id;
}

/** A match that has already been won (single set, straight sweep). */
function wonMatch(overrides: Partial<MatchConfig> = {}): Match {
  let match = createMatch(
    makeConfig({ pointsToWin: 11, gamesToWinSet: 3, setsToWinMatch: 1, ...overrides }),
  );
  for (let game = 0; game < 3; game += 1) {
    for (let point = 0; point < 11; point += 1) match = addPoint(match, 'A');
  }
  return match;
}

/**
 * Persists a match in the pre-#33-rename shape (ADR 0010 §6): match-level
 * `games`/`gamesWon` instead of today's `sets`/`setsWon`, same values, old
 * field names. `saveMatch`'s `Match` parameter type doesn't allow this shape
 * directly (by design — it's not a valid `Match` anymore), so the legacy
 * value is built as its own type and only asserted to `Match` at the
 * `saveMatch` boundary, mirroring what a real pre-rename record already
 * sitting in `AsyncStorage` looks like once JSON-parsed back in.
 */
interface LegacyMatch {
  config: MatchConfig;
  games: unknown[];
  gamesWon: { A: number; B: number };
  winner: null;
}

async function seedLegacyMatch(overrides: Partial<MatchConfig> = {}): Promise<string> {
  const legacy: LegacyMatch = {
    config: makeConfig(overrides),
    games: [],
    gamesWon: { A: 2, B: 1 },
    winner: null,
  };
  const stored = await saveMatch(legacy as unknown as Match);
  return stored.id;
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
  it('opens a running match at its current sets overview state when tapped', async () => {
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
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, message] = alertSpy.mock.calls[0];
    expect(message).toContain('Alice vs Bob');
    // Nothing is deleted until the user confirms.
    expect(screen.getByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(await getMatch(matchId)).not.toBeNull();
  });

  it('removes a match from the list and persistence once the deletion is confirmed', async () => {
    const user = userEvent.setup();
    stubDeleteConfirmation('Löschen');
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(await getMatch(matchId)).toBeNull();
    expect(await listMatches()).toHaveLength(0);
  });

  it('leaves the match in the list and in persistence when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    stubDeleteConfirmation('Abbrechen');
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(await getMatch(matchId)).not.toBeNull();
    expect(await listMatches()).toHaveLength(1);
  });

  it('only removes the tapped match, leaving other persisted matches untouched', async () => {
    const user = userEvent.setup();
    stubDeleteConfirmation('Löschen');
    await seedMatch(createMatch(makeConfig({ playerAName: 'Alice', playerBName: 'Bob' })));
    const keepId = await seedMatch(
      createMatch(makeConfig({ playerAName: 'Carol', playerBName: 'Dave' })),
    );
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carol vs Dave' })).toBeOnTheScreen();
    expect(await getMatch(keepId)).not.toBeNull();
  });
});

describe('MatchListScreen legacy data (#33 follow-up, ADR 0010 §6)', () => {
  it('renders a pre-rename match without crashing, offering only its name and a delete action', async () => {
    await seedLegacyMatch({ playerAName: 'Legacy', playerBName: 'Data' });

    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByText('Legacy vs Data')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Legacy vs Data löschen' })).toBeOnTheScreen();
    // No "open" action for a match this list can't safely open.
    expect(screen.queryByRole('button', { name: 'Legacy vs Data' })).not.toBeOnTheScreen();
  });

  it('deletes a pre-rename match through the same delete-with-confirmation flow', async () => {
    const user = userEvent.setup();
    stubDeleteConfirmation('Löschen');
    const matchId = await seedLegacyMatch({ playerAName: 'Legacy', playerBName: 'Data' });
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Legacy vs Data löschen' });

    await user.press(screen.getByRole('button', { name: 'Legacy vs Data löschen' }));

    expect(screen.queryByText('Legacy vs Data')).not.toBeOnTheScreen();
    expect(await getMatch(matchId)).toBeNull();
  });

  it('still renders current-format matches normally when a legacy one is also present', async () => {
    await seedLegacyMatch({ playerAName: 'Legacy', playerBName: 'Data' });
    await seedMatch(createMatch(makeConfig({ playerAName: 'Alice', playerBName: 'Bob' })));

    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Alice vs Bob' })).toBeOnTheScreen();
    expect(screen.getByText('Legacy vs Data')).toBeOnTheScreen();
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
