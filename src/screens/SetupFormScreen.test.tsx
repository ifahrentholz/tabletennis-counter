import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import * as matchStore from '../persistence/matchStore';
import { getMatch, listMatches } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { SetupFormScreen } from './SetupFormScreen';

/**
 * `screen.getByRole` resolves to the "Match starten" button's underlying
 * host node, which does not expose `onPress` directly (it lives on the
 * `Pressable` composite element up the tree). Re-entrancy tests below need
 * the actual handler reference so they can invoke it directly, bypassing
 * `userEvent`'s gesture-responder simulation (which cannot run concurrently
 * against the same element) to reproduce a rapid multi-tap. `unstable_fiber`
 * is the same public (if intentionally-unstable-named) escape hatch RNTL's
 * own `fireEvent` uses internally to resolve an event to its handler.
 */
function getStartMatchOnPress(): () => Promise<void> {
  const button = screen.getByRole('button', { name: 'Match starten' });
  let fiber: any = (button as any).unstable_fiber;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress;
    }
    fiber = fiber.return;
  }
  throw new Error('"Match starten" onPress handler not found');
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SetupFormScreen presets', () => {
  it('defaults sets-per-game to 6 and games-per-match to 3', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    expect(
      screen.getByRole('radio', { name: 'Sätze pro Spiel 6', checked: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'Spiele pro Match 3', checked: true }),
    ).toBeOnTheScreen();
  });

  it('offers 11 and 21 as the only point-limit presets', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Punkte pro Satz 11' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Punkte pro Satz 21' })).toBeOnTheScreen();
  });

  it('offers 3/5/6/7 as the sets-per-game presets', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    for (const option of [3, 5, 6, 7]) {
      expect(screen.getByRole('radio', { name: `Sätze pro Spiel ${option}` })).toBeOnTheScreen();
    }
  });

  it('offers 1/3/5 as the games-per-match presets', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    for (const option of [1, 3, 5]) {
      expect(screen.getByRole('radio', { name: `Spiele pro Match ${option}` })).toBeOnTheScreen();
    }
  });

  it('selecting a preset marks it checked and deselects the previous one', async () => {
    const user = userEvent.setup();
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    await user.press(screen.getByRole('radio', { name: 'Punkte pro Satz 21' }));

    expect(
      screen.getByRole('radio', { name: 'Punkte pro Satz 21', checked: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'Punkte pro Satz 11', checked: false }),
    ).toBeOnTheScreen();
  });
});

describe('SetupFormScreen player names', () => {
  it('has free-text name fields for Player A and Player B', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    expect(screen.getByPlaceholderText('Name Spieler A')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Name Spieler B')).toBeOnTheScreen();
  });

  it('does not enable native autocomplete/suggestions on the name fields', async () => {
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    expect(screen.getByPlaceholderText('Name Spieler A').props.autoComplete).toBe('off');
    expect(screen.getByPlaceholderText('Name Spieler B').props.autoComplete).toBe('off');
  });

  it('reflects typed names back into the inputs', async () => {
    const user = userEvent.setup();
    await render(<SetupFormScreen onMatchCreated={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
    await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');

    expect(screen.getByPlaceholderText('Name Spieler A').props.value).toBe('Alice');
    expect(screen.getByPlaceholderText('Name Spieler B').props.value).toBe('Bob');
  });
});

describe('SetupFormScreen "Match starten"', () => {
  it('creates and persists a match with the chosen presets and names, then reports its id', async () => {
    const user = userEvent.setup();
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);

    await user.press(screen.getByRole('radio', { name: 'Punkte pro Satz 21' }));
    await user.press(screen.getByRole('radio', { name: 'Sätze pro Spiel 5' }));
    await user.press(screen.getByRole('radio', { name: 'Spiele pro Match 1' }));
    await user.type(screen.getByPlaceholderText('Name Spieler A'), 'Alice');
    await user.type(screen.getByPlaceholderText('Name Spieler B'), 'Bob');

    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    expect(onMatchCreated).toHaveBeenCalledTimes(1);
    const matchId = onMatchCreated.mock.calls[0][0] as string;

    const stored = await getMatch(matchId);
    expect(stored).not.toBeNull();
    expect(stored?.match.config).toEqual({
      pointsToWin: 21,
      setsToWinGame: 5,
      gamesToWinMatch: 1,
      playerAName: 'Alice',
      playerBName: 'Bob',
    });
    expect(stored?.match.winner).toBeNull();
  });

  it('uses the default presets when the player starts the match without tapping any preset', async () => {
    const user = userEvent.setup();
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);

    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    expect(onMatchCreated).toHaveBeenCalledTimes(1);
    const matchId = onMatchCreated.mock.calls[0][0] as string;

    const stored = await getMatch(matchId);
    expect(stored?.match.config).toMatchObject({
      pointsToWin: 11,
      setsToWinGame: 6,
      gamesToWinMatch: 3,
    });
  });
});

describe('SetupFormScreen "Match starten" re-entrancy guard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists exactly one match when the button is tapped repeatedly before the first tap settles', async () => {
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);
    const onPress = getStartMatchOnPress();

    // Invoke the onPress handler three times synchronously, inside a single
    // `act`, before any of the resulting promises settle — this is the
    // exact race a rapid multi-tap produces (see ADR 0004 known follow-up
    // #1): each call's synchronous portion (through the `isSubmittingRef`
    // check) runs before the previous call's awaited `saveMatch` settles.
    await act(async () => {
      await Promise.all([onPress(), onPress(), onPress()]);
    });

    expect(onMatchCreated).toHaveBeenCalledTimes(1);
    expect(await listMatches()).toHaveLength(1);
  });

  it('disables the button while creating and saving the match, and re-enables it once saving resolves', async () => {
    let resolveSave: (stored: StoredMatch) => void = () => {};
    const savePromise = new Promise<StoredMatch>((resolve) => {
      resolveSave = resolve;
    });
    const saveSpy = jest.spyOn(matchStore, 'saveMatch').mockReturnValue(savePromise);

    const user = userEvent.setup();
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);

    const button = screen.getByRole('button', { name: 'Match starten' });
    await user.press(button);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Match starten', disabled: true })).toBeOnTheScreen();

    resolveSave({ id: 'test-match-id', updatedAt: Date.now(), match: {} as StoredMatch['match'] });
    await waitFor(() => expect(onMatchCreated).toHaveBeenCalledTimes(1));

    expect(
      screen.getByRole('button', { name: 'Match starten', disabled: false }),
    ).toBeOnTheScreen();
  });

  it('re-enables the button without calling onMatchCreated if saving rejects', async () => {
    const error = new Error('save failed');
    jest.spyOn(matchStore, 'saveMatch').mockRejectedValue(error);

    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);
    const onPress = getStartMatchOnPress();

    // Invoking onPress directly (see previous test) surfaces its returned
    // promise here so the test can assert it settles without rejecting —
    // handleStartMatch now catches a rejected `saveMatch` itself and turns it
    // into user-facing error state (see the "save error handling" describe
    // block below) instead of letting it propagate as an unhandled
    // rejection the way a real tap would otherwise discard it (ADR 0004
    // known follow-up #2, resolved by this ticket).
    let pressPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      pressPromise = onPress();
      await pressPromise;
    });
    await expect(pressPromise).resolves.toBeUndefined();

    expect(
      screen.getByRole('button', { name: 'Match starten', disabled: false }),
    ).toBeOnTheScreen();
    expect(onMatchCreated).not.toHaveBeenCalled();
  });
});

describe('SetupFormScreen "Match starten" save error handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a user-visible error message when saveMatch rejects, and does not call onMatchCreated', async () => {
    jest.spyOn(matchStore, 'saveMatch').mockRejectedValue(new Error('save failed'));
    const user = userEvent.setup();
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);

    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(onMatchCreated).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Match starten', disabled: false }),
    ).toBeOnTheScreen();
  });

  it('lets the player retry after a failed save without leaving the screen', async () => {
    const saveSpy = jest
      .spyOn(matchStore, 'saveMatch')
      .mockRejectedValueOnce(new Error('save failed'));
    const user = userEvent.setup();
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);

    await user.press(screen.getByRole('button', { name: 'Match starten' }));
    expect(screen.getByRole('alert')).toBeOnTheScreen();

    saveSpy.mockResolvedValueOnce({
      id: 'retry-match-id',
      updatedAt: Date.now(),
      match: {} as StoredMatch['match'],
    });
    await user.press(screen.getByRole('button', { name: 'Match starten' }));

    expect(onMatchCreated).toHaveBeenCalledTimes(1);
    expect(onMatchCreated).toHaveBeenCalledWith('retry-match-id');
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('does not produce an unhandled promise rejection when saveMatch rejects', async () => {
    jest.spyOn(matchStore, 'saveMatch').mockRejectedValue(new Error('save failed'));
    const onMatchCreated = jest.fn();
    await render(<SetupFormScreen onMatchCreated={onMatchCreated} />);
    const onPress = getStartMatchOnPress();

    // If handleStartMatch let the rejection propagate, this returned promise
    // would reject; a real tap discards that return value entirely, so an
    // uncaught rejection here would be an unhandled promise rejection in
    // production. Asserting it resolves proves the rejection is fully
    // handled inside the component instead.
    let pressPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      pressPromise = onPress();
      await pressPromise;
    });
    await expect(pressPromise).resolves.toBeUndefined();
  });
});
