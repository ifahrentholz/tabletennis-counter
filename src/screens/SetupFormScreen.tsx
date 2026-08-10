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
 */

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createMatch } from '../domain/match';
import type { MatchConfig } from '../domain/match';
import { saveMatch } from '../persistence/matchStore';

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
    <SafeAreaView style={styles.container} testID="setup-form-safe-area">
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

      <Text style={styles.label}>Spieler A</Text>
      <TextInput
        style={styles.input}
        placeholder="Name Spieler A"
        accessibilityLabel="Name Spieler A"
        value={playerAName}
        onChangeText={setPlayerAName}
        autoComplete="off"
        autoCorrect={false}
      />

      <Text style={styles.label}>Spieler B</Text>
      <TextInput
        style={styles.input}
        placeholder="Name Spieler B"
        accessibilityLabel="Name Spieler B"
        value={playerBName}
        onChangeText={setPlayerBName}
        autoComplete="off"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.startButton, isSubmitting && styles.buttonDisabled]}
        onPress={handleStartMatch}
        disabled={isSubmitting}
        accessibilityRole="button"
      >
        <Text style={styles.startButtonText}>Match starten</Text>
      </Pressable>

      {saveError !== null && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {saveError}
        </Text>
      )}
    </SafeAreaView>
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
              style={[styles.presetOption, selected && styles.presetOptionSelected]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  presetGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  presetOptionSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  presetOptionText: {
    fontSize: 16,
    color: '#111',
  },
  presetOptionTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  startButton: {
    marginTop: 16,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});
