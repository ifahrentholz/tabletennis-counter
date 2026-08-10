import { useState } from 'react';

import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { MatchListScreen } from './src/screens/MatchListScreen';
import { PointCounterScreen } from './src/screens/PointCounterScreen';
import { SetsOverviewScreen } from './src/screens/SetsOverviewScreen';
import { SetupFormScreen } from './src/screens/SetupFormScreen';

type Route =
  | { screen: 'matchList' }
  | { screen: 'setup' }
  | { screen: 'gamesOverview'; matchId: string }
  | { screen: 'setsOverview'; matchId: string; gameIndex: number }
  | { screen: 'pointCounter'; matchId: string; gameIndex: number };

/**
 * App-level routing. There is still no external navigation library (see ADR
 * 0004 §5) — a small local state machine is enough to cover the real screen
 * hierarchy the app introduces: match list -> setup -> games overview ->
 * sets overview -> point counter, with each back button going exactly one
 * level up (no explicit save anywhere, per the spec's autosave decision).
 * The match list (#7) is the app's real entry point and the real target for
 * the games overview's back button — see ADR 0006 §3/known-follow-up 4 and
 * issue #20, which explicitly called out that the previous `setup`-routing
 * placeholder for that back button had to be replaced once this screen
 * existed, inside this same ticket.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'matchList' });

  if (route.screen === 'pointCounter') {
    return (
      <PointCounterScreen
        matchId={route.matchId}
        onBack={() =>
          setRoute({ screen: 'setsOverview', matchId: route.matchId, gameIndex: route.gameIndex })
        }
      />
    );
  }

  if (route.screen === 'setsOverview') {
    return (
      <SetsOverviewScreen
        matchId={route.matchId}
        gameIndex={route.gameIndex}
        onOpenPointCounter={(matchId) =>
          setRoute({ screen: 'pointCounter', matchId, gameIndex: route.gameIndex })
        }
        onBack={() => setRoute({ screen: 'gamesOverview', matchId: route.matchId })}
      />
    );
  }

  if (route.screen === 'gamesOverview') {
    return (
      <MatchDetailScreen
        matchId={route.matchId}
        onOpenSetsOverview={(matchId, gameIndex) =>
          setRoute({ screen: 'setsOverview', matchId, gameIndex })
        }
        onBack={() => setRoute({ screen: 'matchList' })}
      />
    );
  }

  if (route.screen === 'setup') {
    return (
      <SetupFormScreen
        onMatchCreated={(matchId) => setRoute({ screen: 'gamesOverview', matchId })}
      />
    );
  }

  return (
    <MatchListScreen
      onOpenMatch={(matchId) => setRoute({ screen: 'gamesOverview', matchId })}
      onCreateMatch={() => setRoute({ screen: 'setup' })}
    />
  );
}
