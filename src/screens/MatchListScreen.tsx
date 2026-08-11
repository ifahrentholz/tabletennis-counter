/**
 * Match list screen (screen 1 in the spec's navigation structure) — the
 * app's entry point.
 *
 * Lists every persisted match (running and finished), sorted by
 * most-recently-changed first (`../persistence/matchStore.ts`'s
 * `listMatches` already returns them in that order, so this screen renders
 * them as-is with no re-sorting of its own). Each row is labelled
 * "playerAName vs playerBName"; tapping any row — running or finished —
 * calls `onOpenMatch` with that match's id, handing off to the same games
 * overview (`MatchDetailScreen`, screen 3) either way. Read-only enforcement
 * for a finished match is not this screen's job: `isMatchComplete` already
 * makes the entire downstream hierarchy (games overview, sets overview,
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
 * Each row stacks the two players the way a scoreboard does — the red side
 * above the black side (ADR 0009) — so the same identity a match is played
 * with is visible before it is opened. "Läuft" is the only place ball orange
 * appears here, because a running match is the one thing on this screen that
 * is happening now.
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { PlayerTag } from '../components/PlayerTag';
import { Screen } from '../components/Screen';
import { isMatchComplete } from '../domain/match';
import { deleteMatch, listMatches } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { hit, makeStyles, radius, space, stroke, type } from '../theme';

export interface MatchListScreenProps {
  /** Navigates into the games overview (screen 3) for the tapped match, running or finished. */
  onOpenMatch: (matchId: string) => void;
  /** Navigates to the setup form (#4) to start a new match. */
  onCreateMatch: () => void;
}

function labelFor(stored: StoredMatch): string {
  return `${stored.match.config.playerAName} vs ${stored.match.config.playerBName}`;
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
        <Text style={styles.eyebrow}>Match Center</Text>
        <Text style={styles.title}>Meine Matches</Text>
      </View>

      <Button label="Neues Match" onPress={onCreateMatch} style={styles.newMatchButton} />

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
        <View style={styles.list}>
          {matches.map((stored) => {
            const label = labelFor(stored);
            const complete = isMatchComplete(stored.match);
            return (
              <View key={stored.id} style={styles.listItem}>
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
                    <PlayerTag player="A" name={stored.match.config.playerAName} />
                    <Text style={styles.versus}>vs</Text>
                    <PlayerTag player="B" name={stored.match.config.playerBName} />
                  </View>
                </Pressable>
                <Button
                  variant="quiet"
                  label="×"
                  accessibilityLabel={`${label} löschen`}
                  onPress={() => handleDelete(stored.id, label)}
                  style={styles.deleteButton}
                />
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.lg,
  },
  header: {
    gap: space.xs,
    paddingTop: space.sm,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  title: {
    ...type.display,
    color: theme.color.textPrimary,
  },
  newMatchButton: {
    alignSelf: 'stretch',
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
    gap: space.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  matchButton: {
    flex: 1,
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.scheme === 'dark' ? 0.22 : 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  matchHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
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
    gap: space.sm,
  },
  versus: {
    ...type.micro,
    color: theme.color.textSecondary,
    marginLeft: space.md,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  deleteButton: {
    width: hit.comfortable,
    height: hit.comfortable,
    paddingHorizontal: 0,
  },
}));
