export type UciMove = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
};

export type EngineResult = {
  bestMove: string | null;
  rawLine?: string;
};

function normalizeMove(move: string) {
  return move.replace(/\s+/g, "").toLowerCase();
}

export async function getBestMove(
  fen: string,
  depth = 14,
  timeoutMs = 4500,
): Promise<EngineResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return { bestMove: null };
  }

  return await new Promise<EngineResult>((resolve) => {
    let finished = false;
    let worker: Worker | null = null;

    const cleanup = () => {
      if (worker) {
        try {
          worker.terminate();
        } catch {
          // ignore
        }
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
        finish({ bestMove: null });
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

        if (line.startsWith("bestmove ")) {
          window.clearTimeout(timer);
          const parts = line.split(/\s+/);
          const move = parts[1] ?? null;
          finish({
            bestMove: move && move !== "(none)" ? normalizeMove(move) : null,
            rawLine: line,
          });
        }
      };

      worker.onerror = () => {
        window.clearTimeout(timer);
        finish({ bestMove: null });
      };

      worker.postMessage("uci");
    } catch {
      finish({ bestMove: null });
    }
  });
}

export function parseUciMove(uci: string): UciMove | null {
  const cleaned = normalizeMove(uci);
  if (cleaned.length < 4) return null;

  const from = cleaned.slice(0, 2);
  const to = cleaned.slice(2, 4);
  const promotion = cleaned[4] as UciMove["promotion"] | undefined;

  if (promotion && !["q", "r", "b", "n"].includes(promotion)) return null;

  return promotion ? { from, to, promotion } : { from, to };
}