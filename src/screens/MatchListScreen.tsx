/**
 * Match list screen (screen 1 in the spec's navigation structure) — the
 * app's entry point.
 *
 * Lists every persisted match (running and finished), sorted by
 * most-recently-changed first (`../persistence/matchStore.ts`'s
 * `listMatches` already returns them in that order, so this screen renders
 * them as-is with no re-sorting of its own). Each row is labelled
 * "playerAName vs playerBName"; tapping any row — running or finished —
 * calls `onOpenMatch` with that match's id, handing off to the same sets
 * overview (`MatchDetailScreen`, screen 3) either way. Read-only enforcement
 * for a finished match is not this screen's job: `isMatchComplete` already
 * makes the entire downstream hierarchy (sets overview, games overview,
 * point counter) read-only regardless of how it was reached, per #2's
 * "freeze on match.winner" contract and #6's `!isMatchComplete` gates. This
 * screen only shows a "Beendet"/"Läuft" hint per row so a finished match is
 * recognizable before it's even opened.
 *
 * A match can be removed via a dedicated delete action per row (the spec's
 * "swipe/delete gesture (or delete button)" — a button is used here since
 * no gesture-handling dependency exists yet in this project). Per the
 * spec's "with confirmation" requirement, tapping delete first asks via a
 * native `Alert.alert` confirmation (Abbrechen/Löschen); only confirming
 * calls `deleteMatch` and updates local state, so the row disappears
 * without needing a full reload. Cancelling — or dismissing the alert —
 * leaves the match untouched.
 *
 * A single "Neues Match" action opens the setup form (#4) via
 * `onCreateMatch`, closing the loop described by the spec: launch app → see
 * all matches → resume or start one.
 *
 * A match saved before the #33 hierarchy rename (ADR 0010 §6) no longer has
 * the `setsWon` field this screen reads for its score line — it still has
 * the old field name for the same value. Such a row is detected via
 * `isCompatible` and rendered with just its player names, a hint, and the
 * same delete action (no score, no "Match öffnen") so the recovery path ADR
 * 0010 documents (delete here, then recreate) is actually reachable instead
 * of throwing and taking down the whole list before it renders.
 *
 * Each row stacks the two players the way a scoreboard does — the red side
 * above the black side (ADR 0009) — so the same identity a match is played
 * with is visible before it is opened. "Läuft" is the only place ball orange
 * appears here, because a running match is the one thing on this screen that
 * is happening now.
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { PlayerTag } from '../components/PlayerTag';
import { Screen } from '../components/Screen';
import { ScreenActionBar } from '../components/ScreenActionBar';
import { isMatchComplete } from '../domain/match';
import type { PlayerScore } from '../domain/match';
import { deleteMatch, listMatches } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { hit, makeStyles, radius, space, stroke, type } from '../theme';

export interface MatchListScreenProps {
  /** Navigates into the sets overview (screen 3) for the tapped match, running or finished. */
  onOpenMatch: (matchId: string) => void;
  /** Navigates to the setup form (#4) to start a new match. */
  onCreateMatch: () => void;
}

function labelFor(stored: StoredMatch): string {
  return `${stored.match.config.playerAName} vs ${stored.match.config.playerBName}`;
}

function hasPlayerScoreShape(value: unknown): value is PlayerScore {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).A === 'number' &&
    typeof (value as Record<string, unknown>).B === 'number'
  );
}

/**
 * True when `stored.match` still has the shape this screen reads
 * (`match.setsWon`, an `{A, B}` pair). A match saved before the #33 rename
 * (ADR 0010 §6) has no `setsWon` at all — it used `gamesWon` at match level
 * for the same value, under the old name — so reading `.A`/`.B` on it would
 * throw before this list even finishes rendering, let alone reaches its
 * delete button. Callers use this to render such a row as a delete-only
 * entry instead.
 */
function isCompatible(stored: StoredMatch): boolean {
  return hasPlayerScoreShape((stored.match as { setsWon?: unknown }).setsWon);
}

export function MatchListScreen({ onOpenMatch, onCreateMatch }: MatchListScreenProps) {
  const [matches, setMatches] = useState<StoredMatch[] | null>(null);
  const styles = useStyles();

  useEffect(() => {
    let cancelled = false;
    listMatches().then((all) => {
      if (!cancelled) setMatches(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function confirmDelete(label: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Match löschen',
        `Möchtest du „${label}“ wirklich löschen?`,
        [
          { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Löschen', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  async function handleDelete(id: string, label: string) {
    const confirmed = await confirmDelete(label);
    if (!confirmed) return;
    await deleteMatch(id);
    setMatches((current) => current?.filter((stored) => stored.id !== id) ?? current);
  }

  return (
    <Screen testID="match-list-safe-area" style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>TT</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Match Center</Text>
          <Text style={styles.title}>Meine Matches</Text>
        </View>
      </View>

      {matches === null ? (
        <Text style={styles.loading}>Lade…</Text>
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyScore} accessibilityElementsHidden>
            0 : 0
          </Text>
          <View style={styles.emptyRule} />
          <Text style={styles.emptyText}>Noch keine Matches vorhanden.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {matches.map((stored) => {
            const label = labelFor(stored);

            if (!isCompatible(stored)) {
              return (
                <View key={stored.id} style={styles.matchCard}>
                  <View style={styles.legacyContent}>
                    <Text style={styles.matchLabel}>Match</Text>
                    <Text style={styles.legacyName}>{label}</Text>
                    <Text style={styles.legacyHint}>
                      Altes Datenformat – kann nicht mehr geöffnet werden. Bitte löschen und neu
                      anlegen.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${label} löschen`}
                    onPress={() => handleDelete(stored.id, label)}
                    hitSlop={space.xs}
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
                  >
                    <TrashIcon />
                  </Pressable>
                </View>
              );
            }

            const complete = isMatchComplete(stored.match);
            return (
              <View key={stored.id} style={styles.matchCard}>
                <Pressable
                  style={({ pressed }) => [styles.matchButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => onOpenMatch(stored.id)}
                >
                  <View style={styles.matchHeadline}>
                    <Text style={styles.matchLabel}>Match</Text>
                    <View style={styles.status}>
                      {!complete ? <View style={styles.statusDot} /> : null}
                      <Text style={complete ? styles.statusDone : styles.statusRunning}>
                        {complete ? 'Beendet' : 'Läuft'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.players}>
                    <View style={styles.playerScoreRow}>
                      <PlayerTag player="A" name={stored.match.config.playerAName} />
                      <Text style={[styles.matchScore, styles.scoreA]}>
                        {stored.match.setsWon.A}
                      </Text>
                    </View>
                    <View style={styles.scoreDivider} />
                    <View style={styles.playerScoreRow}>
                      <PlayerTag player="B" name={stored.match.config.playerBName} />
                      <Text style={[styles.matchScore, styles.scoreB]}>
                        {stored.match.setsWon.B}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.openLabel}>Match öffnen</Text>
                    <Text style={styles.openChevron} accessibilityElementsHidden>
                      ›
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} löschen`}
                  onPress={() => handleDelete(stored.id, label)}
                  hitSlop={space.xs}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
                >
                  <TrashIcon />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <ScreenActionBar label="Neues Match" onPress={onCreateMatch} />
    </Screen>
  );
}

/** Small dependency-free trash symbol, drawn from the active theme. */
function TrashIcon() {
  const styles = useStyles();

  return (
    <View style={styles.trashIcon} accessibilityElementsHidden>
      <View style={styles.trashHandle} />
      <View style={styles.trashLid} />
      <View style={styles.trashBin}>
        <View style={styles.trashSlot} />
        <View style={styles.trashSlot} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.sm,
  },
  headerCopy: {
    gap: 0,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceStrong,
    borderBottomWidth: stroke.line,
    borderBottomColor: theme.color.actionFill,
  },
  brandMarkText: {
    ...type.title,
    fontWeight: '900',
    letterSpacing: -1,
    color: theme.color.textOnStrong,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  title: {
    ...type.display,
    color: theme.color.textPrimary,
  },
  loading: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  emptyText: {
    ...type.body,
    color: theme.color.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
  },
  emptyScore: {
    ...type.display,
    fontSize: 56,
    lineHeight: 60,
    color: theme.color.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  emptyRule: {
    width: 48,
    height: stroke.bar,
    backgroundColor: theme.color.actionFill,
  },
  list: {
    gap: space.xl,
    paddingBottom: space.lg,
  },
  listScroll: {
    flex: 1,
  },
  matchCard: {
    position: 'relative',
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.scheme === 'dark' ? 0.14 : 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  matchButton: {
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  matchHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  matchLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.chip,
    backgroundColor: theme.color.accentMarker,
  },
  statusRunning: {
    ...type.micro,
    color: theme.color.accent,
  },
  statusDone: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  players: {
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  legacyContent: {
    paddingTop: space.lg,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    paddingRight: hit.comfortable + space.lg,
    gap: space.xs,
  },
  legacyName: {
    ...type.body,
    fontWeight: '700',
    color: theme.color.textPrimary,
  },
  legacyHint: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  playerScoreRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  scoreDivider: {
    height: stroke.hairline,
    backgroundColor: theme.color.border,
  },
  matchScore: {
    ...type.title,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  scoreA: {
    color: theme.player.A.ink,
  },
  scoreB: {
    color: theme.player.B.ink,
  },
  pressed: {
    opacity: 0.72,
  },
  cardFooter: {
    minHeight: hit.comfortable,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingLeft: space.lg,
    paddingRight: hit.comfortable + space.lg,
    borderTopWidth: stroke.hairline,
    borderTopColor: theme.color.border,
  },
  openLabel: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  openChevron: {
    ...type.title,
    color: theme.color.textSecondary,
    marginTop: -2,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 1,
    width: hit.comfortable,
    height: hit.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: stroke.hairline,
    borderLeftColor: theme.color.border,
    borderBottomRightRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  deletePressed: {
    backgroundColor: theme.color.surfaceMuted,
    opacity: 0.72,
  },
  trashIcon: {
    width: 20,
    height: 22,
    alignItems: 'center',
  },
  trashHandle: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.color.textSecondary,
  },
  trashLid: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.color.textSecondary,
    marginTop: 2,
    marginBottom: 2,
  },
  trashBin: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: theme.color.textSecondary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    paddingTop: 3,
  },
  trashSlot: {
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: theme.color.textSecondary,
  },
}));
