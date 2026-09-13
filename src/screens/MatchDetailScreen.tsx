/**
 * Sets overview screen (screen 3 in the spec's navigation structure).
 *
 * Shows the match's aggregated sets standing for both players and the list
 * of sets played so far; tapping a set navigates into its games overview
 * (screen 4, `GamesOverviewScreen`). While the match is not yet won, an
 * "Editieren" button opens a stepper-based edit mode that manually
 * overwrites the aggregated sets-won count via `adjustMatchSetsWon`
 * (../domain/match.ts) — it never recalculates the match winner itself,
 * matching the spec's "manual correction, no recalculation" edit-mode
 * contract. The button disappears entirely once the match is won.
 *
 * This replaces the interim stub from #4/#5 (ADR 0004 §5, ADR 0005 §3),
 * whose only job was proving a match id could be routed to and offering a
 * direct shortcut straight into the point counter. That shortcut is
 * superseded by the real navigation hierarchy this ticket introduces:
 * sets overview -> games overview -> point counter.
 *
 * Like `PointCounterScreen`, this screen owns its own load/persist
 * round-trip (loads by id on mount, `saveMatch`s immediately after every
 * edit) rather than lifting match state into `App`.
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
import { WinnerBanner } from '../components/WinnerBanner';
import { adjustMatchSetsWon, isMatchComplete } from '../domain/match';
import type { Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { makeStyles, radius, space, stroke, type } from '../theme';
import { PlayerStandRow } from './PlayerStandRow';

export interface MatchDetailScreenProps {
  matchId: string;
  /** Navigates into the games overview (screen 4) for the set at `setIndex`. */
  onOpenGamesOverview: (matchId: string, setIndex: number) => void;
  /** Navigates one level up; never asks to save first. */
  onBack: () => void;
}

export function MatchDetailScreen({
  matchId,
  onOpenGamesOverview,
  onBack,
}: MatchDetailScreenProps) {
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
    const updatedMatch = adjustMatchSetsWon(storedMatch.match, player, delta);
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
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>Matchübersicht</Text>
          <Text style={styles.format}>Best of {match.config.setsToWinMatch * 2 - 1}</Text>
        </View>

        <View style={styles.stickyHero}>
          <View style={styles.hero}>
            <View style={styles.heroPlayer}>
              <View style={[styles.heroMark, styles.heroMarkA]} />
              <Text style={[styles.heroName, styles.titleA]} numberOfLines={1}>
                {match.config.playerAName}
              </Text>
            </View>
            <View style={styles.heroScore} accessibilityLabel="Gesamtstand">
              <Text style={styles.heroScoreNumber}>{match.setsWon.A}</Text>
              <Text style={styles.heroScoreDivider}>:</Text>
              <Text style={styles.heroScoreNumber}>{match.setsWon.B}</Text>
            </View>
            <View style={[styles.heroPlayer, styles.heroPlayerB]}>
              <Text style={[styles.heroName, styles.titleB]} numberOfLines={1}>
                {match.config.playerBName}
              </Text>
              <View style={[styles.heroMark, styles.heroMarkB]} />
            </View>
          </View>
        </View>

        {match.winner && winnerName ? (
          <WinnerBanner player={match.winner} message={`${winnerName} gewinnt das Match!`} />
        ) : null}

        <View style={styles.standing}>
          <View style={styles.standingHeader}>
            <Text style={styles.standingLabel}>Gesamtstand</Text>
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
            label="Sätze"
            player="A"
            name={match.config.playerAName}
            value={match.setsWon.A}
            editing={editing && !matchComplete}
            onIncrement={() => adjustSetsWon('A', 1)}
            onDecrement={() => adjustSetsWon('A', -1)}
          />
          <View style={styles.standDivider} />
          <PlayerStandRow
            label="Sätze"
            player="B"
            name={match.config.playerBName}
            value={match.setsWon.B}
            editing={editing && !matchComplete}
            onIncrement={() => adjustSetsWon('B', 1)}
            onDecrement={() => adjustSetsWon('B', -1)}
          />
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>Satzverlauf</Text>
            <Text style={styles.listHeaderText}>Spiele</Text>
          </View>
          <View style={styles.list}>
            {match.sets.map((set, index) => {
              const isLive = !matchComplete && !set.winner && index === match.sets.length - 1;
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.listItem,
                    isLive && styles.listItemLive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  onPress={() => onOpenGamesOverview(matchId, index)}
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
                    {set.gamesWon.A}:{set.gamesWon.B}
                  </Text>
                  <Text style={styles.chevron} accessibilityElementsHidden>
                    ›
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <ScreenActionBar label="Zurück" onPress={onBack} />
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: 0,
  },
  loading: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  pageScroll: {
    flex: 1,
  },
  page: {
    paddingBottom: space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.md,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  format: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  stickyHero: {
    backgroundColor: theme.color.bg,
    paddingBottom: space.lg,
    zIndex: 2,
  },
  hero: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.scheme === 'dark' ? 0.12 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  heroPlayer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heroPlayerB: {
    justifyContent: 'flex-end',
  },
  heroMark: {
    width: 4,
    height: 30,
    borderRadius: 2,
    flexShrink: 0,
  },
  heroMarkA: {
    backgroundColor: theme.player.A.faceFill,
  },
  heroMarkB: {
    backgroundColor: theme.player.B.faceFill,
  },
  heroName: {
    ...type.label,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    flexShrink: 1,
  },
  heroScore: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    marginHorizontal: space.sm,
  },
  heroScoreNumber: {
    ...type.title,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    color: theme.color.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  heroScoreDivider: {
    ...type.bodyStrong,
    color: theme.color.textSecondary,
    marginHorizontal: space.xs,
  },
  titleA: {
    color: theme.player.A.ink,
  },
  titleB: {
    color: theme.player.B.ink,
  },
  standing: {
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    marginTop: space.lg,
  },
  standingHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: stroke.hairline,
    borderBottomColor: theme.color.border,
  },
  standingLabel: {
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
    marginTop: space.lg,
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
