/**
 * Setup form screen (screen 2 in the spec's navigation structure): the
 * single form a player fills out before a match starts.
 *
 * Collects the four match settings the domain layer (`../domain/match.ts`)
 * needs to create a `Match` — point limit per set, sets-per-game,
 * games-per-match (all tappable presets, never free-text numbers, so an
 * invalid value can't be entered) and the two players' names (plain free
 * text, no autocomplete/suggestion of previously used names) — and a single
 * "Match starten" button that creates the match, persists it immediately via
 * the persistence layer (`../persistence/matchStore.ts`), and hands the
 * newly assigned id to `onMatchCreated` so the caller can navigate into it.
 *
 * This is where the red/black bat identity is handed out (ADR 0009): the two
 * name fields are labelled with the same chips that then follow both players
 * through every other screen, so "Spieler A is the red side" is learned
 * before the first serve rather than guessed at the table.
 */

import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PlayerTag } from '../components/PlayerTag';
import { Screen } from '../components/Screen';
import { ScreenActionBar } from '../components/ScreenActionBar';
import { createMatch } from '../domain/match';
import type { MatchConfig } from '../domain/match';
import { saveMatch } from '../persistence/matchStore';
import { hit, makeStyles, radius, space, stroke, type, useTheme } from '../theme';

const POINTS_TO_WIN_OPTIONS = [11, 21] as const;
const SETS_TO_WIN_GAME_OPTIONS = [3, 5, 6, 7] as const;
const GAMES_TO_WIN_MATCH_OPTIONS = [1, 3, 5] as const;

const DEFAULT_POINTS_TO_WIN: MatchConfig['pointsToWin'] = 11;
const DEFAULT_SETS_TO_WIN_GAME: MatchConfig['setsToWinGame'] = 6;
const DEFAULT_GAMES_TO_WIN_MATCH: MatchConfig['gamesToWinMatch'] = 3;

export interface SetupFormScreenProps {
  /** Called once the new match has been created and persisted, with its assigned id. */
  onMatchCreated: (matchId: string) => void;
}

export function SetupFormScreen({ onMatchCreated }: SetupFormScreenProps) {
  const [pointsToWin, setPointsToWin] = useState<MatchConfig['pointsToWin']>(DEFAULT_POINTS_TO_WIN);
  const [setsToWinGame, setSetsToWinGame] =
    useState<MatchConfig['setsToWinGame']>(DEFAULT_SETS_TO_WIN_GAME);
  const [gamesToWinMatch, setGamesToWinMatch] = useState<MatchConfig['gamesToWinMatch']>(
    DEFAULT_GAMES_TO_WIN_MATCH,
  );
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mirrors `isSubmitting` but is checked synchronously at the top of
  // `handleStartMatch`, guarding against a second tap landing before the
  // `isSubmitting` state update has re-rendered (and thus before the
  // button's `disabled` prop would otherwise block it).
  const isSubmittingRef = useRef(false);
  // User-visible message for the most recent failed submission, or `null`
  // when there isn't one. Cleared at the start of every submission attempt
  // so a retry doesn't leave a stale error on screen alongside a fresh
  // in-flight request.
  const [saveError, setSaveError] = useState<string | null>(null);
  const theme = useTheme();
  const styles = useStyles();

  async function handleStartMatch() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const config: MatchConfig = {
        pointsToWin,
        setsToWinGame,
        gamesToWinMatch,
        playerAName,
        playerBName,
      };
      const match = createMatch(config);
      const stored = await saveMatch(match);
      onMatchCreated(stored.id);
    } catch {
      // Caught here (rather than left to propagate) so a rejected
      // `saveMatch` never becomes an unhandled promise rejection — the
      // `Pressable`'s `onPress` return value isn't awaited by React Native,
      // so an uncaught rejection here would otherwise be silent. Surfacing
      // it as `saveError` instead lets the player see what happened and
      // retry without leaving the screen.
      setSaveError('Match konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Screen testID="setup-form-safe-area" style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRule} />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Match Setup</Text>
          <Text style={styles.title}>Neues Match</Text>
          <Text style={styles.subtitle}>Format wählen. Lineup setzen. Losspielen.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIndex}>01</Text>
            <Text style={styles.sectionTitle}>Spielformat</Text>
          </View>
          <PresetGroup
            groupLabel="Punkte pro Satz"
            options={POINTS_TO_WIN_OPTIONS}
            value={pointsToWin}
            onChange={setPointsToWin}
          />
          <PresetGroup
            groupLabel="Sätze pro Spiel"
            options={SETS_TO_WIN_GAME_OPTIONS}
            value={setsToWinGame}
            onChange={setSetsToWinGame}
          />
          <PresetGroup
            groupLabel="Spiele pro Match"
            options={GAMES_TO_WIN_MATCH_OPTIONS}
            value={gamesToWinMatch}
            onChange={setGamesToWinMatch}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIndex}>02</Text>
            <Text style={styles.sectionTitle}>Lineup</Text>
          </View>
          <View style={styles.field}>
            <PlayerTag player="A" name="Spieler A" />
            <TextInput
              style={[styles.input, styles.inputA]}
              placeholder="Name Spieler A"
              placeholderTextColor={theme.color.textSecondary}
              accessibilityLabel="Name Spieler A"
              value={playerAName}
              onChangeText={setPlayerAName}
              autoComplete="off"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <PlayerTag player="B" name="Spieler B" />
            <TextInput
              style={[styles.input, styles.inputB]}
              placeholder="Name Spieler B"
              placeholderTextColor={theme.color.textSecondary}
              accessibilityLabel="Name Spieler B"
              value={playerBName}
              onChangeText={setPlayerBName}
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
        </View>

        {saveError !== null && (
          <View style={styles.notice}>
            <View style={styles.noticeBar} />
            <Text style={styles.noticeText} accessibilityRole="alert">
              {saveError}
            </Text>
          </View>
        )}
      </ScrollView>

      <ScreenActionBar
        label="Match starten"
        kind="primary"
        onPress={handleStartMatch}
        disabled={isSubmitting}
      />
    </Screen>
  );
}

interface PresetGroupProps<T extends number> {
  groupLabel: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of tappable, single-select presets (e.g. point limits, set counts). */
function PresetGroup<T extends number>({
  groupLabel,
  options,
  value,
  onChange,
}: PresetGroupProps<T>) {
  const styles = useStyles();

  return (
    <View style={styles.presetGroup}>
      <Text style={styles.label}>{groupLabel}</Text>
      <View style={styles.presetRow} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${groupLabel} ${option}`}
              style={({ pressed }) => [
                styles.presetOption,
                selected && styles.presetOptionSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.presetOptionText, selected && styles.presetOptionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.lg,
  },
  header: {
    minHeight: 118,
    flexDirection: 'row',
    gap: space.lg,
    alignItems: 'stretch',
    backgroundColor: theme.color.surfaceStrong,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  headerRule: {
    width: 4,
    backgroundColor: theme.color.actionFill,
  },
  headerCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.lg,
    paddingRight: space.lg,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  title: {
    ...type.display,
    color: theme.color.textOnStrong,
  },
  subtitle: {
    ...type.label,
    color: theme.color.textOnStrong,
    opacity: 0.68,
  },
  formScroll: {
    flex: 1,
  },
  form: {
    gap: space.md,
    paddingBottom: space.lg,
  },
  section: {
    gap: space.md,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  sectionIndex: {
    ...type.micro,
    color: theme.color.textSecondary,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: radius.chip,
    paddingVertical: 3,
    paddingHorizontal: space.sm,
  },
  sectionTitle: {
    ...type.title,
    color: theme.color.textPrimary,
  },
  presetGroup: {
    gap: space.xs,
  },
  label: {
    ...type.micro,
    color: theme.color.textSecondary,
  },
  presetRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  presetOption: {
    flex: 1,
    minWidth: 0,
    minHeight: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceMuted,
  },
  presetOptionSelected: {
    backgroundColor: theme.color.actionFill,
    borderColor: theme.color.actionFill,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  presetOptionText: {
    ...type.bodyStrong,
    color: theme.color.textPrimary,
  },
  presetOptionTextSelected: {
    color: theme.color.actionInk,
  },
  field: {
    gap: space.sm,
  },
  input: {
    ...type.body,
    minHeight: hit.comfortable,
    color: theme.color.textPrimary,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  inputA: {
    borderLeftColor: theme.player.A.faceFill,
  },
  inputB: {
    borderLeftColor: theme.player.B.faceFill,
  },
  // Errors are not red: red is player identity now, and orange means "you
  // are here". A failed save is called out by weight and a hard rule
  // instead of by hue.
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingRight: space.md,
    overflow: 'hidden',
  },
  noticeBar: {
    alignSelf: 'stretch',
    width: stroke.bar,
    backgroundColor: theme.color.textPrimary,
  },
  noticeText: {
    ...type.label,
    color: theme.color.textPrimary,
    flexShrink: 1,
  },
}));
