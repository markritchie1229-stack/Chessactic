"use client";

import type { ReactNode } from "react";
import type { Chess as ChessInstance, Square } from "chess.js";

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
      fill: "#f7f7f2",
      stroke: "#101828",
      edge: "#ffffff",
      shell: "bg-white/18 border-white/22",
      glow: "shadow-[0_3px_10px_rgba(15,23,42,0.28)]",
    };
  }

  return {
    fill: "#263243",
    stroke: "#f8fafc",
    edge: "#0f172a",
    shell: "bg-black/18 border-white/10",
    glow: "shadow-[0_3px_10px_rgba(255,255,255,0.14)]",
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

  const main = {
    fill: theme.fill,
    stroke: theme.stroke,
    strokeWidth: 2.1,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  const detail = {
    fill: "none",
    stroke: theme.edge,
    strokeWidth: 1.15,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    opacity: color === "w" ? 0.86 : 0.82,
  };

  switch (type) {
    case "p":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <circle cx="22.5" cy="11.8" r="5.1" />
            <path d="M17.9 20.2c0-3.3 2.1-6.1 4.6-7.2 2.5 1.1 4.6 3.9 4.6 7.2 0 2.5-1 4.7-2.5 6.2 2.8 1.2 5.8 4.7 6.6 10.7H13.8c.8-6 3.8-9.5 6.6-10.7-1.5-1.5-2.5-3.7-2.5-6.2z" />
            <path d="M12.8 37.8h19.4l2.6 4.4H10.2l2.6-4.4z" />
          </g>
          <path {...detail} d="M18.5 21.8c1.4-1.3 3-2 4-2s2.6.7 4 2" />
          <path {...detail} d="M14.9 30.7h15.2" />
        </svg>
      );

    case "r":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <path d="M13.2 9.8h3.2v3.2h3.6V9.8h4v3.2h3.6V9.8h4v3.2h3.2V9.8h3.2v8.7h-2.8v3.6c0 2.4-1.9 4.3-4.3 4.3H20.3c-2.4 0-4.3-1.9-4.3-4.3v-3.6h-2.8V9.8z" />
            <path d="M15.2 22.7h14.6l1.5 5.5H13.7l1.5-5.5z" />
            <path d="M13.2 28.2h18.6l2 9H11.2l2-9z" />
            <path d="M10.6 37.2h23.8l1.8 4.2H8.8l1.8-4.2z" />
          </g>
          <path {...detail} d="M16.9 17.4h11.2" />
          <path {...detail} d="M15.8 30.4h13.4" />
        </svg>
      );

    case "b":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <path d="M22.5 8.8c3.7 0 6.6 2.9 6.6 6.6 0 2.5-1.4 4.7-3.5 5.9 2.2 2 3.5 4.7 3.5 7.8 0 2.6-1 5-2.7 6.8H18.6c-1.7-1.8-2.7-4.2-2.7-6.8 0-3.1 1.3-5.8 3.5-7.8-2.1-1.2-3.5-3.4-3.5-5.9 0-3.7 2.9-6.6 6.6-6.6z" />
            <path d="M16.7 35.2h12.6l3.1 4.8H13.6l3.1-4.8z" />
            <path d="M12.7 40h20v2.4h-20z" />
          </g>
          <path {...detail} d="M19.4 13.2l5.5-3.5" />
          <path {...detail} d="M18.8 22.4l6.9-6.9" />
          <path {...detail} d="M16.9 35.6h11.2" />
        </svg>
      );

    case "n":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <path d="M12.2 36.6h16.7l2.9 4.2H9.3l2.9-4.2z" />
            <path d="M15.8 32.4c0-4.5 1.2-8.1 3.4-11l4.5-5.5c1.2-1.4 1.1-3.4-.2-4.6l-1-.9c5.8.5 9.9 3.9 10.9 8.9.5 2.8 0 5.6-1.4 7.9l-1.8 3h-3.5c-1.6 0-3 1-3.8 2.3l-1 1.9H15.8z" />
            <path d="M27.8 16.8c-2.1 1-4.6 1-6.7 0" />
          </g>
          <path {...detail} d="M19.8 15.7l-1.8-3" />
          <path {...detail} d="M22.7 14.6l.9-3.9" />
          <path {...detail} d="M16.2 36.9h12.7" />
        </svg>
      );

    case "q":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <circle cx="10.7" cy="11.4" r="2.3" />
            <circle cx="22.5" cy="8.8" r="2.3" />
            <circle cx="34.3" cy="11.4" r="2.3" />
            <path d="M12.4 14.2l4.3 9.4 5.8-11 5.8 11 4.3-9.4 1.8 8.6-3.5 4.8H14.1l-3.5-4.8 1.8-8.6z" />
            <path d="M14.2 31.8h16.6l4.2 5.8H10l4.2-5.8z" />
            <path d="M11 37.6h23v2.8H11z" />
          </g>
          <path {...detail} d="M14.7 18.4h15.6" />
          <path {...detail} d="M13.2 33.2h18.6" />
        </svg>
      );

    case "k":
      return (
        <svg viewBox="0 0 45 45" className="h-[82%] w-[82%]">
          <g {...main}>
            <path d="M20.7 7.5h2.6v4.1h4.1v2.6h-4.1v4.1h-2.6v-4.1h-4.1v-2.6h4.1V7.5z" />
            <path d="M15.2 17.7h14.6l3.1 5.2v4.9c0 4.7-3.8 8.5-8.5 8.5h-3.8c-4.7 0-8.5-3.8-8.5-8.5v-4.9l3.1-5.2z" />
            <path d="M13.4 35.8h18.2l3.4 5.1H10l3.4-5.1z" />
            <path d="M11.2 40.9h22.6v2.6H11.2z" />
          </g>
          <path {...detail} d="M16.8 25.8h11.4" />
          <path {...detail} d="M18.8 20.9h7.4" />
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
        "flex h-[82%] w-[82%] items-center justify-center rounded-full border",
        "transition-transform duration-150",
        theme.shell,
        theme.glow,
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