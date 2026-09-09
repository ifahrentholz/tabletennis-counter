/**
 * Games overview screen (screen 4 in the spec's navigation structure) for a
 * single set.
 *
 * Shows the games standing for both players within that specific set and
 * the list of games played in it; tapping a game navigates into the live
 * point counter (screen 5, `PointCounterScreen`). Per the domain engine
 * (`../domain/match.ts`) there is only ever one live game across the whole
 * match — `addPoint`/`undoPoint` only ever act on `match.sets.at(-1)`'s
 * last game — so every game row opens that same point counter regardless of
 * which row was tapped; older, already-decided games have no live counter of
 * their own to open, matching user story #17's "current/selected game".
 *
 * While the match is not yet won, an "Editieren" button opens a
 * stepper-based edit mode that manually overwrites this set's aggregated
 * games-won count per player via `adjustSetGamesWon` — available even for an
 * earlier, already-completed set of the same match, per the spec's edit
 * mode contract. It never recalculates this set's winner. The button
 * disappears entirely once the match is won.
 *
 * Like `PointCounterScreen` and `MatchDetailScreen`, this screen owns its
 * own load/persist round-trip.
 *
 * Visually a normal app screen read at normal distance (ADR 0009), carrying
 * the same red/black bat identity as the counter. The game currently being
 * played is the only row marked in ball orange, because it is the only one
 * that is happening now.
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenActionBar } from '../components/ScreenActionBar';
import { adjustSetGamesWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { makeStyles, radius, space, stroke, type } from '../theme';
import { PlayerStandRow } from './PlayerStandRow';

export interface GamesOverviewScreenProps {
  matchId: string;
  /** Index into `match.sets` of the set whose games standing this shows. */
  setIndex: number;
  /** Navigates into the live point counter (screen 5). */
  onOpenPointCounter: (matchId: string) => void;
  /** Navigates one level up (to the sets overview); never asks to save first. */
  onBack: () => void;
}

export function GamesOverviewScreen({
  matchId,
  setIndex,
  onOpenPointCounter,
  onBack,
}: GamesOverviewScreenProps) {
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
    const updatedMatch = adjustSetGamesWon(storedMatch.match, setIndex, player, delta);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <Screen testID="games-overview-safe-area" style={styles.screen}>
        <Text style={styles.loading}>Lade…</Text>
      </Screen>
    );
  }

  const { match } = storedMatch;
  const set = match.sets[setIndex];
  const matchComplete = isMatchComplete(match);
  const isCurrentSet = setIndex === match.sets.length - 1;

  return (
    <Screen testID="games-overview-safe-area" style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Spielübersicht</Text>
        <Text style={styles.format}>First to {match.config.gamesToWinSet}</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Match Center</Text>
        <Text style={styles.title}>Satz {setIndex + 1}</Text>
      </View>

      <View style={styles.scoreboard}>
        <View style={styles.scoreboardHeader}>
          <Text style={styles.scoreboardLabel}>Spiele-Stand</Text>
          {!matchComplete ? (
            <Button
              variant="quiet"
              label={editing ? 'Fertig' : 'Editieren'}
              onPress={() => setEditing((value) => !value)}
              style={styles.editButton}
            />
          ) : null}
        </View>
        <PlayerStandRow
          label="Spiele"
          player="A"
          name={match.config.playerAName}
          value={set.gamesWon.A}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('A', 1)}
          onDecrement={() => adjustGamesWon('A', -1)}
        />
        <View style={styles.standDivider} />
        <PlayerStandRow
          label="Spiele"
          player="B"
          name={match.config.playerBName}
          value={set.gamesWon.B}
          editing={editing && !matchComplete}
          onIncrement={() => adjustGamesWon('B', 1)}
          onDecrement={() => adjustGamesWon('B', -1)}
        />
      </View>

      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Spielverlauf</Text>
          <Text style={styles.listHeaderText}>Punkte</Text>
        </View>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {set.games.map((game, index) => {
            const isLive =
              !matchComplete && isCurrentSet && !game.winner && index === set.games.length - 1;
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
                    <Text style={styles.listItemLabel}>Spiel {index + 1}</Text>
                    {isLive ? <Text style={styles.liveLabel}>Live</Text> : null}
                  </View>
                  {game.winner ? (
                    <Text style={styles.listItemNote}>
                      {game.winner === 'A' ? match.config.playerAName : match.config.playerBName}{' '}
                      gewinnt
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.listItemScore}>
                  {game.points.A}:{game.points.B}
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
  format: {
    ...type.micro,
    color: theme.color.textSecondary,
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
  scoreboard: {
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.scheme === 'dark' ? 0.12 : 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  scoreboardHeader: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: stroke.hairline,
    borderBottomColor: theme.color.border,
  },
  scoreboardLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  editButton: {
    minHeight: 36,
    paddingVertical: 4,
  },
  standDivider: {
    height: stroke.hairline,
    backgroundColor: theme.color.border,
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
