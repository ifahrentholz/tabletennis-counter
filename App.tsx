import { useState } from 'react';

import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { PointCounterScreen } from './src/screens/PointCounterScreen';
import { SetupFormScreen } from './src/screens/SetupFormScreen';

type Route =
  | { screen: 'setup' }
  | { screen: 'matchDetail'; matchId: string }
  | { screen: 'pointCounter'; matchId: string };

/**
 * App-level routing. There is no external navigation library yet (screens
 * #6/#7, the real games/sets overview, are still outstanding) — a tiny
 * local state machine is enough to satisfy "starting a match navigates to
 * the newly created match" and "the point counter is reachable and goes
 * back to the match detail stub" until a real navigator is warranted. See
 * ADR 0004 §5.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'setup' });

  if (route.screen === 'pointCounter') {
    return (
      <PointCounterScreen
        matchId={route.matchId}
        onBack={() => setRoute({ screen: 'matchDetail', matchId: route.matchId })}
      />
    );
  }

  if (route.screen === 'matchDetail') {
    return (
      <MatchDetailScreen
        matchId={route.matchId}
        onOpenPointCounter={(matchId) => setRoute({ screen: 'pointCounter', matchId })}
      />
    );
  }

  return (
    <SetupFormScreen onMatchCreated={(matchId) => setRoute({ screen: 'matchDetail', matchId })} />
  );
}
