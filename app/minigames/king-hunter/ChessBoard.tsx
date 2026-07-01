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

function pieceTheme(color: PieceColor) {
  if (color === "w") {
    return {
      fill: "#f7f7f5",
      stroke: "#152033",
      edge: "#ffffff",
      shadow: "shadow-[0_3px_10px_rgba(15,23,42,0.28)]",
      shell: "bg-white/18 border-white/22",
    };
  }

  return {
    fill: "#243041",
    stroke: "#f4f7fb",
    edge: "#0f172a",
    shadow: "shadow-[0_3px_10px_rgba(255,255,255,0.14)]",
    shell: "bg-black/18 border-white/10",
  };
}

function PieceIcon({
  type,
  color,
}: {
  type: PieceType;
  color: PieceColor;
}) {
  const theme = pieceTheme(color);

  const common = {
    fill: theme.fill,
    stroke: theme.stroke,
    strokeWidth: 2.15,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  const detail = {
    fill: "none",
    stroke: theme.edge,
    strokeWidth: 1.1,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    opacity: color === "w" ? 0.85 : 0.8,
  };

  switch (type) {
    case "p":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <circle cx="32" cy="17" r="6.6" />
            <path d="M25.8 28.5c0-4.1 2.8-7.3 6.2-7.3s6.2 3.2 6.2 7.3v2.6h4.8c1.5 0 2.7 1.2 2.7 2.7v1.8H18.3v-1.8c0-1.5 1.2-2.7 2.7-2.7h4.8v-2.6z" />
            <path d="M20 47.8h24.2l3.5 6.2H16.5l3.5-6.2z" />
          </g>
          <path {...detail} d="M28.1 22.5c1.1-1 2.5-1.6 3.9-1.6 1.5 0 2.8.5 4 1.6" />
          <path {...detail} d="M22.9 31.8h18.2" />
          <path {...detail} d="M18.4 48h27.2" />
        </svg>
      );

    case "r":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <path d="M18 16h8v6h4v-6h4v6h4v-6h4v6h4v-6h8v11h-4v4c0 2.8-2.2 5-5 5H27c-2.8 0-5-2.2-5-5v-4h-4V16z" />
            <path d="M22 37.5h20.2l3.8 10.5H18.2L22 37.5z" />
            <path d="M17 48h30v4.2H17z" />
          </g>
          <path {...detail} d="M24 24h16" />
          <path {...detail} d="M22 40h20" />
        </svg>
      );

    case "b":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <path d="M31.8 11.5c4.4 0 8 3.6 8 8 0 3-1.6 5.5-3.9 7 2.3 2.4 3.4 5.1 3.4 8 0 3.2-1.4 5.9-3.8 7.9H28c-2.4-2-3.8-4.7-3.8-7.9 0-2.9 1.1-5.6 3.4-8-2.3-1.5-3.9-4-3.9-7 0-4.4 3.6-8 8.1-8z" />
            <path d="M26.7 43h10.6l4.1 5.2H22.6l4.1-5.2z" />
            <path d="M19 50.2h26v3.8H19z" />
          </g>
          <path {...detail} d="M29 18.8l6.1-4.3" />
          <path {...detail} d="M28.4 28l7.6-7.6" />
          <path {...detail} d="M24.8 43.2h14.2" />
        </svg>
      );

    case "n":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <path d="M18 49h28.5l3.2 5H14.8l3.2-5z" />
            <path d="M24.3 43c0-4.6 1.3-8.4 3.9-11.8l5.8-7.5c1.3-1.7 1.1-4.1-.5-5.4l-1.7-1.4c6.8.5 11.7 4.4 13 10.2.7 3.1.1 6.4-1.5 9l-2.5 4.2H39c-1.9 0-3.6 1.1-4.4 2.8l-1.2 2.1H24.3z" />
            <path d="M37.5 22.8c-2.5 1.3-5.7 1.3-8.2 0" />
          </g>
          <path {...detail} d="M28 20.3l-2.2-3.8" />
          <path {...detail} d="M31.8 18.3l1-4.6" />
          <path {...detail} d="M24.6 43.5h15.6" />
        </svg>
      );

    case "q":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <circle cx="16" cy="17" r="3.2" />
            <circle cx="32" cy="12" r="3.2" />
            <circle cx="48" cy="17" r="3.2" />
            <path d="M18 20l6.2 12.2 7.8-14.1 8 14.1L46 20l2.1 9.9-4 5.2H20l-4-5.2L18 20z" />
            <path d="M23 40h18.2l5 8H18l5-8z" />
            <path d="M17 50h30v4H17z" />
          </g>
          <path {...detail} d="M24.1 26.2h15.8" />
          <path {...detail} d="M21.6 41.8h20.7" />
        </svg>
      );

    case "k":
      return (
        <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]">
          <g {...common}>
            <path d="M29 10h6v7h7v6h-7v7h-6v-7h-7v-6h7v-7z" />
            <path d="M22 28h20l4 6v6c0 5.5-4.5 10-10 10H28c-5.5 0-10-4.5-10-10v-6l4-6z" />
            <path d="M20 48h24l4 6H16l4-6z" />
          </g>
          <path {...detail} d="M24 34h16" />
          <path {...detail} d="M28 23h8" />
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
  const theme = pieceTheme(color);

  return (
    <span
      className={[
        "flex h-[80%] w-[80%] items-center justify-center rounded-full border",
        "transition-transform duration-150",
        theme.shell,
        theme.shadow,
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
                  "relative flex h-full w-full items-center justify-center",
                  "transition focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cyan-300/80",
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