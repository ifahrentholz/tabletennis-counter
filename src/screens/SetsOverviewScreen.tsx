/**
 * Sets overview screen (screen 4 in the spec's navigation structure) for a
 * single game.
 *
 * Shows the sets standing for both players within that specific game and
 * the list of sets played in it; tapping a set navigates into the live
 * point counter (screen 5, `PointCounterScreen`). Per the domain engine
 * (`../domain/match.ts`) there is only ever one live set across the whole
 * match — `addPoint`/`undoPoint` only ever act on `match.games.at(-1)`'s
 * last set — so every set row opens that same point counter regardless of
 * which row was tapped; older, already-decided sets have no live counter of
 * their own to open, matching user story #17's "current/selected set".
 *
 * While the match is not yet won, an "Editieren" button opens a
 * stepper-based edit mode that manually overwrites this game's aggregated
 * sets-won count per player via `adjustGameSetsWon` — available even for an
 * earlier, already-completed game of the same match, per the spec's edit
 * mode contract. It never recalculates this game's winner. The button
 * disappears entirely once the match is won.
 *
 * Like `PointCounterScreen` and `MatchDetailScreen`, this screen owns its
 * own load/persist round-trip.
 *
 * Visually a normal app screen read at normal distance (ADR 0009), carrying
 * the same red/black bat identity as the counter. The set currently being
 * played is the only row marked in ball orange, because it is the only one
 * that is happening now.
 */

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { adjustGameSetsWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { hit, makeStyles, radius, space, stroke, type } from '../theme';
import { PlayerStandRow } from './PlayerStandRow';

export interface SetsOverviewScreenProps {
  matchId: string;
  /** Index into `match.games` of the game whose sets standing this shows. */
  gameIndex: number;
  /** Navigates into the live point counter (screen 5). */
  onOpenPointCounter: (matchId: string) => void;
  /** Navigates one level up (to the games overview); never asks to save first. */
  onBack: () => void;
}

export function SetsOverviewScreen({
  matchId,
  gameIndex,
  onOpenPointCounter,
  onBack,
}: SetsOverviewScreenProps) {
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

  async function adjustSetsWon(player: Player, delta: 1 | -1) {
    if (!storedMatch) return;
    const updatedMatch = adjustGameSetsWon(storedMatch.match, gameIndex, player, delta);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <Screen testID="sets-overview-safe-area" style={styles.screen}>
        <Text style={styles.loading}>Lade…</Text>
      </Screen>
    );
  }

  const { match } = storedMatch;
  const game = match.games[gameIndex];
  const matchComplete = isMatchComplete(match);
  const isCurrentGame = gameIndex === match.games.length - 1;

  return (
    <Screen testID="sets-overview-safe-area" style={styles.screen}>
      <Button variant="quiet" label="Zurück" onPress={onBack} style={styles.backButton} />

      <Text style={styles.title}>Spiel {gameIndex + 1}</Text>

      <View style={styles.standRow}>
        <PlayerStandRow
          label="Sätze"
          player="A"
          name={match.config.playerAName}
          value={game.setsWon.A}
          editing={editing && !matchComplete}
          onIncrement={() => adjustSetsWon('A', 1)}
          onDecrement={() => adjustSetsWon('A', -1)}
        />
        <PlayerStandRow
          label="Sätze"
          player="B"
          name={match.config.playerBName}
          value={game.setsWon.B}
          editing={editing && !matchComplete}
          onIncrement={() => adjustSetsWon('B', 1)}
          onDecrement={() => adjustSetsWon('B', -1)}
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
        {game.sets.map((set, index) => {
          const isLive =
            !matchComplete && isCurrentGame && !set.winner && index === game.sets.length - 1;
          return (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.listItem,
                isLive && styles.listItemLive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              onPress={() => onOpenPointCounter(matchId)}
            >
              <Text style={styles.listItemText}>
                <Text style={styles.listItemLabel}>Satz {index + 1}</Text>
                <Text style={styles.listItemScore}>{`: ${set.points.A}:${set.points.B}`}</Text>
                {set.winner ? (
                  <Text style={styles.listItemNote}>
                    {` – ${set.winner === 'A' ? match.config.playerAName : match.config.playerBName} gewinnt`}
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
    color: theme.color.textPrimary,
    fontVariant: ['tabular-nums'],
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
