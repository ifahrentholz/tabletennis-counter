/**
 * Live point counter screen (screen 5 in the spec's navigation structure).
 *
 * Shows the running point score of the currently active set and lets each
 * player be awarded (+1) or have their last point undone (-1) with a single
 * tap. All win detection (set/game/match, including the deuce rule) is
 * delegated entirely to the scoring engine (`../domain/match.ts`) — this
 * screen only renders whatever the engine currently considers the "current"
 * set/game and calls its pure mutators; it never computes a winner itself.
 *
 * Because `addPoint` already advances the engine's own "current game/current
 * set" pointer the moment a set (or game) is won, this single screen
 * instance carries the player continuously through set after set, game
 * after game, without any navigation of its own — the displayed score
 * resets to 0-0 for the new set automatically. Only once the match itself
 * is won does the engine stop advancing (the hierarchy freezes), which is
 * when this screen shows the match-won banner and disables further input.
 *
 * Owns its own persistence round-trip (loads the match by id on mount,
 * `saveMatch`s immediately after every point/undo — see ADR 0003). It takes
 * only `matchId` (no game/set index) because the engine only ever exposes
 * one live set across the whole match — `SetsOverviewScreen` (#6) always
 * routes here for "the current/active set" regardless of which set row was
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
import { PlayerTag } from '../components/PlayerTag';
import { RubberFace } from '../components/RubberFace';
import { ScoreNumeral } from '../components/ScoreNumeral';
import { Screen } from '../components/Screen';
import { WinnerBanner } from '../components/WinnerBanner';
import { addPoint, isMatchComplete, undoPoint } from '../domain/match';
import type { Match, Player } from '../domain/match';
import { getMatch, saveMatch } from '../persistence/matchStore';
import type { StoredMatch } from '../persistence/matchStore';
import { makeStyles, space, stroke, type } from '../theme';

export interface PointCounterScreenProps {
  matchId: string;
  /** Navigates one level up (to the sets overview); never asks to save first. */
  onBack: () => void;
}

function currentGameOf(match: Match) {
  return match.games[match.games.length - 1];
}

function currentSetOf(match: Match) {
  const game = currentGameOf(match);
  return game.sets[game.sets.length - 1];
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
  const currentGame = currentGameOf(match);
  const currentSet = currentSetOf(match);
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
        <Button variant="quiet" label="Zurück" onPress={onBack} />
        {/* Ball orange means "this is where you are right now" and nothing
            else — so the position marker loses its colour the moment the
            match is over. */}
        <Text style={[styles.position, matchComplete ? styles.positionDone : styles.positionLive]}>
          Satz {currentGame.sets.length} · Spiel {match.games.length}
        </Text>
      </View>

      {match.winner && winnerName ? (
        <WinnerBanner player={match.winner} message={`${winnerName} gewinnt das Match!`} />
      ) : null}

      <View style={styles.scoreRow}>
        <PlayerColumn
          player="A"
          name={match.config.playerAName}
          points={currentSet.points.A}
          setsWon={currentGame.setsWon.A}
          gamesWon={match.gamesWon.A}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'A'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
        {/* The table's centre line: it is what divides one player's half
            from the other's on a real table, so it divides them here too. */}
        <View style={styles.centreLine} />
        <PlayerColumn
          player="B"
          name={match.config.playerBName}
          points={currentSet.points.B}
          setsWon={currentGame.setsWon.B}
          gamesWon={match.gamesWon.B}
          disabled={matchComplete}
          onPoint={() => applyAndPersist((m) => addPoint(m, 'B'))}
          onUndo={() => applyAndPersist(undoPoint)}
        />
      </View>
    </Screen>
  );
}

interface PlayerColumnProps {
  player: Player;
  name: string;
  points: number;
  setsWon: number;
  gamesWon: number;
  disabled: boolean;
  onPoint: () => void;
  onUndo: () => void;
}

function PlayerColumn({
  player,
  name,
  points,
  setsWon,
  gamesWon,
  disabled,
  onPoint,
  onUndo,
}: PlayerColumnProps) {
  const styles = useStyles();

  return (
    <View style={styles.playerColumn}>
      <View style={styles.readBlock}>
        <PlayerTag player={player} name={name} size="title" chip={false} />
        <ScoreNumeral player={player} name={name} points={points} />
        <Text style={styles.subScore} accessibilityLabel={`Sätze ${name}`}>
          Sätze: {setsWon}
        </Text>
        <Text style={styles.subScore} accessibilityLabel={`Spiele ${name}`}>
          Spiele: {gamesWon}
        </Text>
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
  position: {
    ...type.micro,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },
  positionLive: {
    color: theme.color.accent,
  },
  positionDone: {
    color: theme.color.textSecondary,
  },
  scoreRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.md,
  },
  centreLine: {
    width: stroke.line,
    alignSelf: 'stretch',
    backgroundColor: theme.color.centreLine,
  },
  playerColumn: {
    flex: 1,
    gap: space.sm,
  },
  readBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xs,
  },
  subScore: {
    ...type.micro,
    fontVariant: ['tabular-nums'],
    color: theme.color.textSecondary,
  },
}));
