/**
 * Live point counter screen (screen 5 in the spec's navigation structure).
 *
 * Shows the running point score of the currently active game and lets each
 * player be awarded (+1) or have their last point undone (-1) with a single
 * tap. All win detection (game/set/match, including the deuce rule) is
 * delegated entirely to the scoring engine (`../domain/match.ts`) — this
 * screen only renders whatever the engine currently considers the "current"
 * game/set and calls its pure mutators; it never computes a winner itself.
 *
 * Because `addPoint` already advances the engine's own "current set/current
 * game" pointer the moment a game (or set) is won, this single screen
 * instance carries the player continuously through game after game, set
 * after set, without any navigation of its own — the displayed score
 * resets to 0-0 for the new game automatically. Only once the match itself
 * is won does the engine stop advancing (the hierarchy freezes), which is
 * when this screen shows the match-won banner and disables further input.
 *
 * Owns its own persistence round-trip (loads the match by id on mount,
 * `saveMatch`s immediately after every point/undo — see ADR 0003). It takes
 * only `matchId` (no set/game index) because the engine only ever exposes
 * one live game across the whole match — `GamesOverviewScreen` (#6) always
 * routes here for "the current/active game" regardless of which game row was
 * tapped, per ADR 0006 §2.
 *
 * Visually this is the one screen that is a piece of sports equipment rather
 * than an app (ADR 0009): the phone stands next to the table and is read
 * from about a metre away in a badly lit hall. So the screen is laid out as
 * the table seen from above — two halves split by the table's centre line,
 * each half owning one player's score and one side of the bat as its
 * point-scoring face.
 */

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../components/Button';
import { RubberFace } from '../components/RubberFace';
import { ScoreNumeral } from '../components/ScoreNumeral';
import { Screen } from '../components/Screen';
import { ScreenActionBar } from '../components/ScreenActionBar';
import { WinnerBanner } from '../components/WinnerBanner';
import { addPoint, isMatchComplete, undoPoint } from '../domain/match';
import type { Match, Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { makeStyles, radius, space, stroke, type } from '../theme';

export interface PointCounterScreenProps {
  matchId: string;
  /** Navigates one level up (to the games overview); never asks to save first. */
  onBack: () => void;
}

function currentSetOf(match: Match) {
  return match.sets[match.sets.length - 1];
}

function currentGameOf(match: Match) {
  const set = currentSetOf(match);
  return set.games[set.games.length - 1];
}

export function PointCounterScreen({ matchId, onBack }: PointCounterScreenProps) {
  const [storedMatch, setStoredMatch] = useState<StoredMatch | null>(null);
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

  async function applyAndPersist(mutate: (match: Match) => Match) {
    if (!storedMatch) return;
    const updatedMatch = mutate(storedMatch.match);
    const saved = await saveMatch(updatedMatch, storedMatch.id);
    setStoredMatch(saved);
  }

  if (!storedMatch) {
    return (
      <Screen testID="point-counter-safe-area" style={styles.screen}>
        <Text style={styles.loading}>Lade…</Text>
      </Screen>
    );
  }

  const { match } = storedMatch;
  const currentSet = currentSetOf(match);
  const currentGame = currentGameOf(match);
  const matchComplete = isMatchComplete(match);
  const winnerName =
    match.winner === 'A'
      ? match.config.playerAName
      : match.winner === 'B'
        ? match.config.playerBName
        : null;

  return (
    <Screen testID="point-counter-safe-area" style={styles.screen}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Punktestand</Text>
        <View style={styles.positionWrap}>
          {!matchComplete ? <View style={styles.liveDot} /> : null}
          <Text style={matchComplete ? styles.finalWord : styles.liveWord}>
            {matchComplete ? 'Final' : 'Live'}
          </Text>
          <Text
            style={[styles.position, matchComplete ? styles.positionDone : styles.positionLive]}
          >
            Spiel {currentSet.games.length} · Satz {match.sets.length}
          </Text>
        </View>
      </View>

      {match.winner && winnerName ? (
        <WinnerBanner player={match.winner} message={`${winnerName} gewinnt das Match!`} />
      ) : null}

      <View style={styles.scoreRow}>
        <PlayerColumn
          player="A"
          name={match.config.playerAName}
          points={currentGame.points.A}
          gamesWon={currentSet.gamesWon.A}
          setsWon={match.setsWon.A}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'A'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
        <PlayerColumn
          player="B"
          name={match.config.playerBName}
          points={currentGame.points.B}
          gamesWon={currentSet.gamesWon.B}
          setsWon={match.setsWon.B}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'B'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
      </View>

      <ScreenActionBar label="Zurück" onPress={onBack} />
    </Screen>
  );
}

interface PlayerColumnProps {
  player: Player;
  name: string;
  points: number;
  gamesWon: number;
  setsWon: number;
  disabled: boolean;
  onPoint: () => void;
  onUndo: () => void;
}

function PlayerColumn({
  player,
  name,
  points,
  gamesWon,
  setsWon,
  disabled,
  onPoint,
  onUndo,
}: PlayerColumnProps) {
  const styles = useStyles();

  return (
    <View style={styles.playerColumn}>
      <View style={styles.teamHeader}>
        <View
          style={[styles.playerMark, player === 'A' ? styles.playerMarkA : styles.playerMarkB]}
        />
        <Text
          style={[styles.playerName, player === 'A' ? styles.playerNameA : styles.playerNameB]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
      <View style={styles.readBlock}>
        <ScoreNumeral player={player} name={name} points={points} />
        <View style={styles.subScores}>
          <View style={styles.subScoreBlock}>
            <Text style={styles.subScore} accessibilityLabel={`Spiele ${name}`} numberOfLines={1}>
              Spiele: {gamesWon}
            </Text>
          </View>
          <View style={styles.subScoreRule} />
          <View style={styles.subScoreBlock}>
            <Text style={styles.subScore} accessibilityLabel={`Sätze ${name}`} numberOfLines={1}>
              Sätze: {setsWon}
            </Text>
          </View>
        </View>
      </View>

      <RubberFace
        player={player}
        label="+1"
        accessibilityLabel={`${name} +1`}
        disabled={disabled}
        onPress={onPoint}
      />

      <Button
        variant="quiet"
        size="large"
        label="-1"
        accessibilityLabel={`${name} -1`}
        disabled={disabled}
        onPress={onUndo}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    gap: space.md,
    paddingHorizontal: space.md,
  },
  loading: {
    ...type.body,
    color: theme.color.textSecondary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  eyebrow: {
    ...type.micro,
    color: theme.color.accent,
  },
  positionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 40,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.chip,
    backgroundColor: theme.color.accentMarker,
  },
  liveWord: {
    ...type.micro,
    color: theme.color.accentMarker,
  },
  finalWord: {
    ...type.micro,
    color: theme.color.textPrimary,
  },
  position: {
    ...type.micro,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },
  positionLive: {
    color: theme.color.textSecondary,
  },
  positionDone: {
    color: theme.color.textSecondary,
  },
  scoreRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.sm,
  },
  playerColumn: {
    flex: 1,
    gap: space.sm,
    minWidth: 0,
    backgroundColor: theme.color.surface,
    borderWidth: stroke.hairline,
    borderColor: theme.color.border,
    borderRadius: radius.md,
    padding: space.sm,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.scheme === 'dark' ? 0.12 : 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  teamHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  playerMark: {
    width: 4,
    height: 30,
    borderRadius: 2,
    flexShrink: 0,
  },
  playerMarkA: {
    backgroundColor: theme.player.A.faceFill,
  },
  playerMarkB: {
    backgroundColor: theme.player.B.faceFill,
  },
  playerName: {
    ...type.title,
    flexShrink: 1,
  },
  playerNameA: {
    color: theme.player.A.ink,
  },
  playerNameB: {
    color: theme.player.B.ink,
  },
  readBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
    minWidth: 0,
  },
  subScores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    width: '100%',
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  subScoreBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 0,
  },
  subScoreRule: {
    width: stroke.hairline,
    height: 14,
    backgroundColor: theme.color.borderStrong,
  },
  subScore: {
    ...type.micro,
    letterSpacing: 0.25,
    fontVariant: ['tabular-nums'],
    color: theme.color.textPrimary,
    textAlign: 'center',
  },
}));
