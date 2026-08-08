import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';

import { addPoint, createMatch } from '../domain/match';
import type { Match, MatchConfig } from '../domain/match';
import { getMatch, listMatches, saveMatch } from '../persistence/matchStore';
import { MatchListScreen } from './MatchListScreen';

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

describe('MatchListScreen delete', () => {
  it('removes a match from the list and persistence when its delete action is pressed', async () => {
    const user = userEvent.setup();
    const matchId = await seedMatch(createMatch(makeConfig()));
    await render(<MatchListScreen onOpenMatch={jest.fn()} onCreateMatch={jest.fn()} />);
    await screen.findByRole('button', { name: 'Alice vs Bob' });

    await user.press(screen.getByRole('button', { name: 'Alice vs Bob löschen' }));

    expect(screen.queryByRole('button', { name: 'Alice vs Bob' })).not.toBeOnTheScreen();
    expect(await getMatch(matchId)).toBeNull();
    expect(await listMatches()).toHaveLength(0);
  });

  it('only removes the tapped match, leaving other persisted matches untouched', async () => {
    const user = userEvent.setup();
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
