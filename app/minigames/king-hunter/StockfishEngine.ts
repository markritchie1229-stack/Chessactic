export type UciMove = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
};

export type EngineResult = {
  bestMove: string | null;
  scoreType: "mate" | "cp" | null;
  score: number | null;
  rawLine?: string;
};

function normalizeMove(move: string) {
  return move.replace(/\s+/g, "").toLowerCase();
}

function parseScore(
  line: string,
): { scoreType: "mate" | "cp"; score: number } | null {
  const match = line.match(/score\s+(mate|cp)\s+(-?\d+)/);

  if (!match) return null;

  return {
    scoreType: match[1] as "mate" | "cp",
    score: Number(match[2]),
  };
}

async function runEngine(
  fen: string,
  depth: number,
  timeoutMs: number,
): Promise<EngineResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return {
      bestMove: null,
      scoreType: null,
      score: null,
    };
  }

  return await new Promise<EngineResult>((resolve) => {
    let worker: Worker | null = null;
    let finished = false;

    let latestScoreType: "mate" | "cp" | null = null;
    let latestScore: number | null = null;

    const cleanup = () => {
      if (worker) {
        try {
          worker.terminate();
        } catch {}
        worker = null;
      }
    };

    const finish = (result: EngineResult) => {
      if (finished) return;

      finished = true;
      cleanup();
      resolve(result);
    };

    try {
      worker = new Worker("/stockfish.js");

      const timer = window.setTimeout(() => {
        finish({
          bestMove: null,
          scoreType: latestScoreType,
          score: latestScore,
        });
      }, timeoutMs);

      worker.onmessage = (event) => {
        const line = String(event.data ?? "");

        if (line === "uciok") {
          worker?.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          worker?.postMessage("ucinewgame");
          worker?.postMessage(`position fen ${fen}`);
          worker?.postMessage(`go depth ${depth}`);
          return;
        }

        if (line.startsWith("info")) {
          const parsed = parseScore(line);

          if (parsed) {
            latestScoreType = parsed.scoreType;
            latestScore = parsed.score;
          }

          return;
        }

        if (line.startsWith("bestmove ")) {
          window.clearTimeout(timer);

          const move = line.split(/\s+/)[1] ?? null;

          finish({
            bestMove:
              move && move !== "(none)"
                ? normalizeMove(move)
                : null,
            scoreType: latestScoreType,
            score: latestScore,
            rawLine: line,
          });
        }
      };

      worker.onerror = () => {
        window.clearTimeout(timer);

        finish({
          bestMove: null,
          scoreType: latestScoreType,
          score: latestScore,
        });
      };

      worker.postMessage("uci");
    } catch {
      finish({
        bestMove: null,
        scoreType: null,
        score: null,
      });
    }
  });
}

export async function getBestMove(
  fen: string,
  depth = 14,
  timeoutMs = 4500,
): Promise<EngineResult> {
  return runEngine(fen, depth, timeoutMs);
}

export async function analyzePosition(
  fen: string,
  depth = 16,
  timeoutMs = 5000,
): Promise<EngineResult> {
  return runEngine(fen, depth, timeoutMs);
}

export function parseUciMove(uci: string): UciMove | null {
  const cleaned = normalizeMove(uci);

  if (cleaned.length < 4) return null;

  const from = cleaned.slice(0, 2);
  const to = cleaned.slice(2, 4);

  const promotion =
    cleaned.length > 4
      ? (cleaned[4] as UciMove["promotion"])
      : undefined;

  if (
    promotion &&
    !["q", "r", "b", "n"].includes(promotion)
  ) {
    return null;
  }

  return promotion
    ? { from, to, promotion }
    : { from, to };
}

export function preservesForcedMate(
  result: EngineResult,
  remainingMoves: number,
): boolean {
  if (result.scoreType !== "mate") {
    return false;
  }

  if (result.score == null) {
    return false;
  }

  const mateDistance = Math.abs(result.score);

  return mateDistance <= remainingMoves;
}