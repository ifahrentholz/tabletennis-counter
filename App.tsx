import { useState } from 'react';

import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { SetupFormScreen } from './src/screens/SetupFormScreen';

type Route = { screen: 'setup' } | { screen: 'matchDetail'; matchId: string };

/**
 * App-level routing. There is no external navigation library yet (only the
 * setup form and a detail stub exist so far, screens #5-#7 are still
 * outstanding) — a tiny local state machine is enough to satisfy "starting a
 * match navigates to the newly created match" until a real navigator is
 * warranted. See ADR 0004.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'setup' });

  if (route.screen === 'matchDetail') {
    return <MatchDetailScreen matchId={route.matchId} />;
  }

  return (
    <SetupFormScreen onMatchCreated={(matchId) => setRoute({ screen: 'matchDetail', matchId })} />
  );
}
