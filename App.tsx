import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GamesOverviewScreen } from './src/screens/GamesOverviewScreen';
import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { MatchListScreen } from './src/screens/MatchListScreen';
import { PointCounterScreen } from './src/screens/PointCounterScreen';
import { SetupFormScreen } from './src/screens/SetupFormScreen';

type Route =
  | { screen: 'matchList' }
  | { screen: 'setup' }
  | { screen: 'setsOverview'; matchId: string }
  | { screen: 'gamesOverview'; matchId: string; setIndex: number }
  | { screen: 'pointCounter'; matchId: string; setIndex: number };

/**
 * App-level routing. There is still no external navigation library (see ADR
 * 0004 §5) — a small local state machine is enough to cover the real screen
 * hierarchy the app introduces: match list -> setup -> sets overview ->
 * games overview -> point counter, with each back button going exactly one
 * level up (no explicit save anywhere, per the spec's autosave decision).
 * The match list (#7) is the app's real entry point and the real target for
 * the sets overview's back button — see ADR 0006 §3/known-follow-up 4 and
 * issue #20, which explicitly called out that the previous `setup`-routing
 * placeholder for that back button had to be replaced once this screen
 * existed, inside this same ticket.
 *
 * Wrapped once in `SafeAreaProvider` (issue #27) at the app root, below the
 * status bar/notch and above every screen — each of the 5 screens then
 * applies the resulting insets itself via a root `SafeAreaView`, so no
 * screen renders under the device notch/Dynamic Island/status bar or home
 * indicator.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'matchList' });

  return <SafeAreaProvider>{renderScreen(route, setRoute)}</SafeAreaProvider>;
}

function renderScreen(route: Route, setRoute: (route: Route) => void) {
  if (route.screen === 'pointCounter') {
    return (
      <PointCounterScreen
        matchId={route.matchId}
        onBack={() =>
          setRoute({ screen: 'gamesOverview', matchId: route.matchId, setIndex: route.setIndex })
        }
      />
    );
  }

  if (route.screen === 'gamesOverview') {
    return (
      <GamesOverviewScreen
        matchId={route.matchId}
        setIndex={route.setIndex}
        onOpenPointCounter={(matchId) =>
          setRoute({ screen: 'pointCounter', matchId, setIndex: route.setIndex })
        }
        onBack={() => setRoute({ screen: 'setsOverview', matchId: route.matchId })}
      />
    );
  }

  if (route.screen === 'setsOverview') {
    return (
      <MatchDetailScreen
        matchId={route.matchId}
        onOpenGamesOverview={(matchId, setIndex) =>
          setRoute({ screen: 'gamesOverview', matchId, setIndex })
        }
        onBack={() => setRoute({ screen: 'matchList' })}
      />
    );
  }

  if (route.screen === 'setup') {
    return (
      <SetupFormScreen
        onMatchCreated={(matchId) => setRoute({ screen: 'setsOverview', matchId })}
      />
    );
  }

  return (
    <MatchListScreen
      onOpenMatch={(matchId) => setRoute({ screen: 'setsOverview', matchId })}
      onCreateMatch={() => setRoute({ screen: 'setup' })}
    />
  );
}
