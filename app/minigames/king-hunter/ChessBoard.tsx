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

type PieceColor = "w" | "b";
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

function getSquareColor(fileIndex: number, rankIndex: number) {
  return (fileIndex + rankIndex) % 2 === 0 ? "bg-[#d8c6a3]" : "bg-[#8b6f4d]";
}

function buildBoardSquares(orientation: "white" | "black") {
  const files =
    orientation === "white"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];

  const ranks =
    orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

  return { files, ranks };
}

function PieceIcon({
  type,
  color,
}: {
  type: PieceType;
  color: PieceColor;
}) {
  const fill = color === "w" ? "#f8fafc" : "#1f2937";
  const stroke = color === "w" ? "#111827" : "#f8fafc";

  const common = {
    fill,
    stroke,
    strokeWidth: 2.2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  switch (type) {
    case "p":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <circle cx="32" cy="16.5" r="7" />
            <path d="M26 28c0-3.8 2.9-7 6-7s6 3.2 6 7v2.5h4.5c1.4 0 2.5 1.1 2.5 2.5v2H19v-2c0-1.4 1.1-2.5 2.5-2.5H26V28z" />
            <path d="M20 47h24l4 7H16l4-7z" />
          </g>
        </svg>
      );

    case "r":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <path d="M18 16h8v6h12v-6h8v11h-4v4c0 2.8-2.2 5-5 5H27c-2.8 0-5-2.2-5-5v-4h-4V16z" />
            <path d="M22 37h20l3.5 10.5H18.5L22 37z" />
            <path d="M17 48.5h30v4H17z" />
          </g>
        </svg>
      );

    case "b":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <path d="M32 11c4.7 0 8.5 3.8 8.5 8.5 0 2.9-1.4 5.5-3.6 7 2.4 2.4 3.6 5.2 3.6 8.3 0 3-1.2 5.7-3.5 7.7h-10c-2.3-2-3.5-4.7-3.5-7.7 0-3.1 1.2-5.9 3.6-8.3-2.2-1.5-3.6-4.1-3.6-7C23.5 14.8 27.3 11 32 11z" />
            <path d="M27 43h10l4 5H23l4-5z" />
            <path d="M19 50h26v4H19z" />
            <path d="M28 19l7-5" />
            <path d="M29 28l8-8" />
          </g>
        </svg>
      );

    case "n":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <path d="M18 49h28l3 5H15l3-5z" />
            <path d="M24 43c0-4.8 1.3-8.7 4-12l5.9-7.6c1.4-1.8 1.2-4.3-.5-5.7l-1.7-1.4c7.1.4 12 4.5 13.3 10.4.7 3.4.1 6.8-1.5 9.5l-2.3 3.8h-4c-1.9 0-3.7 1-4.6 2.8l-1.2 2.2H24z" />
            <path d="M39 24c-2.7 1.4-5.7 1.4-8.4 0" />
            <path d="M28 20l-2.2-4" />
            <path d="M32 18l1-5" />
          </g>
        </svg>
      );

    case "q":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <circle cx="16" cy="17" r="3.2" />
            <circle cx="32" cy="12" r="3.2" />
            <circle cx="48" cy="17" r="3.2" />
            <path d="M18 20l6 12 8-14 8 14 6-12 2 10-4 5H20l-4-5 2-10z" />
            <path d="M23 40h18l5 8H18l5-8z" />
            <path d="M17 50h30v4H17z" />
          </g>
        </svg>
      );

    case "k":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%] drop-shadow-sm">
          <g {...common}>
            <path d="M29 10h6v7h7v6h-7v7h-6v-7h-7v-6h7v-7z" />
            <path d="M22 28h20l4 6v6c0 5.5-4.5 10-10 10H28c-5.5 0-10-4.5-10-10v-6l4-6z" />
            <path d="M20 48h24l4 6H16l4-6z" />
          </g>
        </svg>
      );
  }
}

function Piece({
  type,
  color,
}: {
  type: PieceType;
  color: PieceColor;
}) {
  const shell =
    color === "w"
      ? "bg-white/18 border-white/20 shadow-[0_3px_12px_rgba(15,23,42,0.25)]"
      : "bg-black/18 border-white/10 shadow-[0_3px_12px_rgba(255,255,255,0.14)]";

  return (
    <span
      className={[
        "flex h-[78%] w-[78%] items-center justify-center rounded-full border",
        "transition-transform duration-150",
        shell,
      ].join(" ")}
      aria-label={color === "w" ? "White piece" : "Black piece"}
    >
      <PieceIcon type={type} color={color} />
    </span>
  );
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
      <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-3xl border border-slate-700 shadow-2xl shadow-black/20">
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
                  "relative flex h-full w-full items-center justify-center transition",
                  "focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cyan-300/80",
                  getSquareColor(fileIndex, rankIndex),
                  isSelected ? "ring-4 ring-inset ring-yellow-300" : "",
                ].join(" ")}
                aria-label={`Square ${square}`}
              >
                {piece ? (
                  <Piece
                    type={piece.type as PieceType}
                    color={piece.color as PieceColor}
                  />
                ) : null}

                {isTarget ? (
                  <span className="absolute h-4 w-4 rounded-full bg-cyan-300/50 shadow-[0_0_0_3px_rgba(15,23,42,0.18)]" />
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