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

function pieceColors(color: PieceColor) {
  if (color === "w") {
    return {
      fill: "#f8fafc",
      stroke: "#0f172a",
      shell: "bg-white/20 border-white/25",
      glow: "shadow-[0_4px_14px_rgba(15,23,42,0.30)]",
    };
  }

  return {
    fill: "#111827",
    stroke: "#f8fafc",
    shell: "bg-black/20 border-white/10",
    glow: "shadow-[0_4px_14px_rgba(255,255,255,0.16)]",
  };
}

function PieceIcon({
  type,
  color,
}: {
  type: PieceType;
  color: PieceColor;
}) {
  const c = pieceColors(color);

  const common = {
    fill: c.fill,
    stroke: c.stroke,
    strokeWidth: 2.2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  switch (type) {
    case "p":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
          <g {...common}>
            <circle cx="32" cy="17" r="7" />
            <path d="M25 29c0-4.4 3.6-8 7-8s7 3.6 7 8v3h5c1.7 0 3 1.3 3 3v2H17v-2c0-1.7 1.3-3 3-3h5v-3z" />
            <path d="M20 48h24l4 7H16l4-7z" />
          </g>
        </svg>
      );

    case "r":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
          <g {...common}>
            <path d="M19 16h8v6h10v-6h8v10h-4v5c0 2.8-2.2 5-5 5h-8c-2.8 0-5-2.2-5-5v-5h-4V16z" />
            <path d="M22 37h20l3 11H19l3-11z" />
            <path d="M17 48h30v4H17z" />
            <path d="M20 14v-5M32 14v-5M44 14v-5" />
          </g>
        </svg>
      );

    case "b":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
          <g {...common}>
            <path d="M32 11c4.4 0 8 3.6 8 8 0 3-1.7 5.7-4.1 7.1 2.1 2.4 3.1 5 3.1 7.9 0 3.1-1.4 5.9-3.8 7.8H28.8c-2.4-1.9-3.8-4.7-3.8-7.8 0-2.9 1-5.5 3.1-7.9C25.7 24.7 24 22 24 19c0-4.4 3.6-8 8-8z" />
            <path d="M27 43h10l4 5H23l4-5z" />
            <path d="M19 50h26v4H19z" />
            <path d="M31 18l6-5" />
            <path d="M28 28l8-8" />
          </g>
        </svg>
      );

    case "n":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
          <g {...common}>
            <path d="M18 49h28l3 5H15l3-5z" />
            <path d="M24 43c0-5 1.2-8.8 3.6-12l6.1-8.1c1.3-1.7 1.1-4.1-.5-5.4l-1.9-1.5c7.2.4 12.4 4.4 13.7 10.6.7 3.2.2 6.6-1.5 9.3l-2 3.2h-3.6c-2.1 0-3.9 1.2-4.7 3.1l-1 2.3H24z" />
            <path d="M39 24c-2.6 1.4-5.8 1.4-8.4 0" />
            <path d="M28 20l-2-4" />
            <path d="M32 18l1-5" />
          </g>
        </svg>
      );

    case "q":
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
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
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12">
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
  const c = pieceColors(color);

  return (
    <span
      className={[
        "flex h-12 w-12 items-center justify-center rounded-full border",
        "transition-transform duration-150",
        c.shell,
        c.glow,
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
                  "relative flex items-center justify-center transition",
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