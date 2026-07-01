"use client";

import type { Square, Chess as ChessInstance } from "chess.js";

type ChessBoardProps = {
  board: ChessInstance;
  selectedSquare: Square | null;
  legalTargets: Square[];
  orientation?: "white" | "black";
  onSquareClick: (square: Square) => void;
  className?: string;
  showCoordinates?: boolean;
};

const PIECES: Record<string, Record<"w" | "b", string>> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
  k: { w: "♔", b: "♚" },
};

function getPieceGlyph(type: string, color: "w" | "b") {
  return PIECES[type]?.[color] ?? "";
}

function getSquareColor(fileIndex: number, rankIndex: number) {
  return (fileIndex + rankIndex) % 2 === 0 ? "bg-[#d8c6a3]" : "bg-[#8b6f4d]";
}

function buildBoardSquares(orientation: "white" | "black") {
  const files =
    orientation === "white"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];

  const ranks = orientation === "white"
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];

  return { files, ranks };
}

export default function ChessBoard({
  board,
  selectedSquare,
  legalTargets,
  orientation = "white",
  onSquareClick,
  className = "",
  showCoordinates = true,
}: ChessBoardProps) {
  const { files, ranks } = buildBoardSquares(orientation);

  return (
    <div className={`w-full ${className}`}>
      <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-3xl border border-slate-700 shadow-2xl shadow-black/20">
        {ranks.map((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const square = `${file}${rank}` as Square;
            const piece = board.get(square);
            const isSelected = selectedSquare === square;
            const isTarget = legalTargets.includes(square);

            return (
              <button
                key={square}
                type="button"
                onClick={() => onSquareClick(square)}
                className={[
                  "relative flex items-center justify-center text-[clamp(1.55rem,4vw,2.6rem)] transition",
                  getSquareColor(fileIndex, rankIndex),
                  isSelected ? "ring-4 ring-inset ring-yellow-300" : "",
                ].join(" ")}
                aria-label={`Square ${square}`}
              >
                {piece ? (
                  <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                    {getPieceGlyph(piece.type, piece.color)}
                  </span>
                ) : null}

                {isTarget ? (
                  <span className="absolute h-4 w-4 rounded-full bg-black/20" />
                ) : null}

                {showCoordinates && rankIndex === 7 ? (
                  <span className="absolute bottom-1 right-1 text-[10px] font-medium text-black/60">
                    {file}
                  </span>
                ) : null}

                {showCoordinates && fileIndex === 0 ? (
                  <span className="absolute left-1 top-1 text-[10px] font-medium text-black/60">
                    {rank}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}