import { useState } from 'react';

import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { PointCounterScreen } from './src/screens/PointCounterScreen';
import { SetsOverviewScreen } from './src/screens/SetsOverviewScreen';
import { SetupFormScreen } from './src/screens/SetupFormScreen';

type Route =
  | { screen: 'setup' }
  | { screen: 'gamesOverview'; matchId: string }
  | { screen: 'setsOverview'; matchId: string; gameIndex: number }
  | { screen: 'pointCounter'; matchId: string; gameIndex: number };

/**
 * App-level routing. There is still no external navigation library (see ADR
 * 0004 §5) — a small local state machine is enough to cover the real screen
 * hierarchy #6 introduces: setup -> games overview -> sets overview -> point
 * counter, with each back button going exactly one level up (no explicit
 * save anywhere, per the spec's autosave decision). `gamesOverview`'s back
 * button routes to `setup` as an interim stand-in for the not-yet-built
 * match list (#7), matching ADR 0004 §5's pattern of using the closest
 * existing screen as a placeholder for a screen that lands later.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'setup' });

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
        onBack={() => setRoute({ screen: 'setup' })}
      />
    );
  }

  return (
    <SetupFormScreen onMatchCreated={(matchId) => setRoute({ screen: 'gamesOverview', matchId })} />
  );
}
