import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { getMatch } from '../persistence/matchStore';
import { SetupFormScreen } from './SetupFormScreen';

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
