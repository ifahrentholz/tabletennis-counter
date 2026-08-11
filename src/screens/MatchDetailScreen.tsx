/**
 * Games overview screen (screen 3 in the spec's navigation structure).
 *
 * Shows the match's aggregated games standing for both players and the list
 * of games played so far; tapping a game navigates into its sets overview
 * (screen 4, `SetsOverviewScreen`). While the match is not yet won, an
 * "Editieren" button opens a stepper-based edit mode that manually
 * overwrites the aggregated games-won count via `adjustMatchGamesWon`
 * (../domain/match.ts) — it never recalculates the match winner itself,
 * matching the spec's "manual correction, no recalculation" edit-mode
 * contract. The button disappears entirely once the match is won.
 *
 * This replaces the interim stub from #4/#5 (ADR 0004 §5, ADR 0005 §3),
 * whose only job was proving a match id could be routed to and offering a
 * direct shortcut straight into the point counter. That shortcut is
 * superseded by the real navigation hierarchy this ticket introduces:
 * games overview -> sets overview -> point counter.
 *
 * Like `PointCounterScreen`, this screen owns its own load/persist
 * round-trip (loads by id on mount, `saveMatch`s immediately after every
 * edit) rather than lifting match state into `App`.
 *
 * Visually a normal app screen read at normal distance (ADR 0009), carrying
 * the same red/black bat identity as the counter. The game currently being
 * played is the only row marked in ball orange, because it is the only one
 * that is happening now.
 */

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { WinnerBanner } from '../components/WinnerBanner';
import { adjustMatchGamesWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { hit, makeStyles, radius, space, stroke, type } from '../theme';
import { PlayerStandRow } from './PlayerStandRow';

export interface MatchDetailScreenProps {
  matchId: string;
  /** Navigates into the sets overview (screen 4) for the game at `gameIndex`. */
  onOpenSetsOverview: (matchId: string, gameIndex: number) => void;
  /** Navigates one level up; never asks to save first. */
  onBack: () => void;
}

export function MatchDetailScreen({ matchId, onOpenSetsOverview, onBack }: MatchDetailScreenProps) {
  const [storedMatch, setStoredMatch] = useState<StoredMatch | null>(null);
  const [editing, setEditing] = useState(false);
  const styles = useStyles();

  useEffect(() => {
    let cancelled = false;
    getMatch(matchId).then((stored) => {
      if (!cancelled) setStoredMatch(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function adjustGamesWon(player: Player, delta: 1 | -1) {
    if (!storedMatch) return;
    const updatedMatch = adjustMatchGamesWon(storedMatch.match, player, delta);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <Screen testID="match-detail-safe-area" style={styles.screen}>
        <Text style={styles.loading}>Lade…</Text>
      </Screen>
    );
  }

  const { match } = storedMatch;
  const matchComplete = isMatchComplete(match);
  const winnerName =
    match.winner === 'A'
      ? match.config.playerAName
      : match.winner === 'B'
        ? match.config.playerBName
        : null;

  return (
    <Screen testID="match-detail-safe-area" style={styles.screen}>
      <Button variant="quiet" label="Zurück" onPress={onBack} style={styles.backButton} />

      <Text style={styles.title}>
        <Text style={styles.titleA}>{match.config.playerAName}</Text> vs{' '}
        <Text style={styles.titleB}>{match.config.playerBName}</Text>
      </Text>

      {match.winner && winnerName ? (
        <WinnerBanner player={match.winner} message={`${winnerName} gewinnt das Match!`} />
      ) : null}

      <View style={styles.standRow}>
        <PlayerStandRow
          label="Spiele"
          player="A"
          name={match.config.playerAName}
          value={match.gamesWon.A}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('A', 1)}
          onDecrement={() => adjustGamesWon('A', -1)}
        />
        <PlayerStandRow
          label="Spiele"
          player="B"
          name={match.config.playerBName}
          value={match.gamesWon.B}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('B', 1)}
          onDecrement={() => adjustGamesWon('B', -1)}
        />
      </View>

      {!matchComplete ? (
        <Button
          variant="quiet"
          label={editing ? 'Fertig' : 'Editieren'}
          onPress={() => setEditing((value) => !value)}
          style={styles.editButton}
        />
      ) : null}

      <View style={styles.list}>
        {match.games.map((game, index) => {
          const isLive = !matchComplete && !game.winner && index === match.games.length - 1;
          return (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.listItem,
                isLive && styles.listItemLive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              onPress={() => onOpenSetsOverview(matchId, index)}
            >
              <Text style={styles.listItemText}>
                <Text style={styles.listItemLabel}>Spiel {index + 1}</Text>
                <Text style={styles.listItemScore}>{`: ${game.setsWon.A}:${game.setsWon.B}`}</Text>
                {game.winner ? (
                  <Text style={styles.listItemNote}>
                    {` – ${game.winner === 'A' ? match.config.playerAName : match.config.playerBName} gewinnt`}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.lg,
  },
  loading: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  title: {
    ...type.display,
    color: theme.color.textSecondary,
  },
  titleA: {
    color: theme.player.A.ink,
  },
  titleB: {
    color: theme.player.B.ink,
  },
  standRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: space.md,
  },
  editButton: {
    alignSelf: 'center',
  },
  list: {
    gap: space.sm,
  },
  listItem: {
    minHeight: hit.min,
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.borderStrong,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  listItemLive: {
    borderLeftWidth: stroke.bar,
    borderLeftColor: theme.color.accentMarker,
    paddingLeft: space.lg - (stroke.bar - stroke.hairline),
  },
  pressed: {
    opacity: 0.7,
  },
  listItemText: {
    ...type.body,
    color: theme.color.textPrimary,
  },
  listItemLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  listItemScore: {
    ...type.bodyStrong,
    color: theme.color.textPrimary,
  },
  listItemNote: {
    ...type.label,
    color: theme.color.textSecondary,
  },
}));
