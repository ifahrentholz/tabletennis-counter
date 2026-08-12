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
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenActionBar } from '../components/ScreenActionBar';
import { adjustGameSetsWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { makeStyles, radius, space, stroke, type } from '../theme';
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
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Sätze</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Match Center</Text>
        <Text style={styles.title}>Spiel {gameIndex + 1}</Text>
      </View>

      <View style={styles.scoreboard}>
        <View style={styles.scoreboardHeader}>
          <Text style={styles.scoreboardLabel}>Satzstand</Text>
          <Text style={styles.scoreboardMeta}>First to {match.config.setsToWinGame}</Text>
        </View>
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
      </View>

      {!matchComplete ? (
        <Button
          variant="quiet"
          label={editing ? 'Fertig' : 'Editieren'}
          onPress={() => setEditing((value) => !value)}
          style={styles.editButton}
        />
      ) : null}

      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Satzverlauf</Text>
          <Text style={styles.listHeaderText}>Punkte</Text>
        </View>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
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
                <View style={styles.listItemCopy}>
                  <View style={styles.listItemHeading}>
                    <Text style={styles.listItemLabel}>Satz {index + 1}</Text>
                    {isLive ? <Text style={styles.liveLabel}>Live</Text> : null}
                  </View>
                  {set.winner ? (
                    <Text style={styles.listItemNote}>
                      {set.winner === 'A' ? match.config.playerAName : match.config.playerBName}{' '}
                      gewinnt
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.listItemScore}>
                  {set.points.A}:{set.points.B}
                </Text>
                <Text style={styles.chevron} accessibilityElementsHidden>
                  ›
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScreenActionBar label="Zurück" onPress={onBack} />
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.md,
  },
  loading: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  hero: {
    gap: space.xs,
  },
  heroLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  title: {
    ...type.display,
    color: theme.color.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  standRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  scoreboard: {
    gap: space.sm,
    backgroundColor: theme.color.surfaceStrong,
    borderRadius: radius.lg,
    padding: space.sm,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.scheme === 'dark' ? 0.2 : 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  scoreboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  scoreboardLabel: {
    ...type.micro,
    color: theme.color.textOnStrong,
  },
  scoreboardMeta: {
    ...type.micro,
    color: theme.color.textOnStrong,
    opacity: 0.62,
  },
  editButton: {
    alignSelf: 'flex-end',
  },
  listSection: {
    gap: space.sm,
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
  },
  listHeaderText: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  list: {
    gap: space.sm,
    paddingBottom: space.md,
  },
  listScroll: {
    flex: 1,
  },
  listItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  listItemLive: {
    borderLeftWidth: stroke.bar,
    borderLeftColor: theme.color.accentMarker,
    paddingLeft: space.lg - (stroke.bar - stroke.hairline),
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  listItemCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  listItemHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  listItemLabel: {
    ...type.bodyStrong,
    color: theme.color.textPrimary,
  },
  liveLabel: {
    ...type.micro,
    color: theme.color.textOnStrong,
    backgroundColor: theme.color.accentMarker,
    borderRadius: radius.chip,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  listItemScore: {
    ...type.stand,
    fontSize: 30,
    lineHeight: 34,
    color: theme.color.textPrimary,
  },
  listItemNote: {
    ...type.label,
    color: theme.color.textSecondary,
  },
  chevron: {
    ...type.title,
    color: theme.color.textSecondary,
  },
}));
