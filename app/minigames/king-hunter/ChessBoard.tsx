"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
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

function buildBoardSquares(orientation: "white" | "black") {
  const files =
    orientation === "white"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];

  const ranks =
    orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

  return { files, ranks };
}

function pieceName(type: PieceType) {
  switch (type) {
    case "p":
      return "Pawn";
    case "n":
      return "Knight";
    case "b":
      return "Bishop";
    case "r":
      return "Rook";
    case "q":
      return "Queen";
    case "k":
      return "King";
  }
}

function getSquareBackground(fileIndex: number, rankIndex: number) {
  const isLight = (fileIndex + rankIndex) % 2 === 0;

  return isLight
    ? "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0) 48%), linear-gradient(135deg, rgba(246,232,200,0.98) 0%, rgba(217,190,121,0.98) 100%)"
    : "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 22%, rgba(255,255,255,0) 48%), linear-gradient(135deg, rgba(56,49,42,0.98) 0%, rgba(25,21,18,0.98) 100%)";
}

function getPieceAuraSpec(type: PieceType, color: PieceColor) {
  const isWhite = color === "w";

  const baseImageFilter = isWhite
    ? "drop-shadow(0 1px 2px rgba(0,0,0,0.18)) drop-shadow(0 4px 7px rgba(0,0,0,0.12))"
    : "drop-shadow(0 1px 2px rgba(255,255,255,0.06)) drop-shadow(0 4px 7px rgba(0,0,0,0.18))";

  if (type === "k") {
    return {
      glowStyle: {
        background: isWhite
          ? "radial-gradient(circle, rgba(195,120,255,1) 0%, rgba(175,90,255,0.98) 12%, rgba(155,70,255,0.90) 28%, rgba(120,45,255,0.45) 48%, rgba(120,45,255,0) 62%)"
          : "radial-gradient(circle, rgba(170,100,255,1) 0%, rgba(145,70,245,0.98) 12%, rgba(125,55,235,0.90) 28%, rgba(100,40,220,0.45) 48%, rgba(100,40,220,0) 62%)",
        opacity: 1,
        animation: "kingPulse 2.9s ease-in-out infinite",
      } satisfies CSSProperties,
      imageStyle: {
        filter: `${baseImageFilter} ${
          isWhite
            ? "drop-shadow(0 0 10px rgba(180,110,255,0.46))"
            : "drop-shadow(0 0 10px rgba(130,70,255,0.40))"
        }`,
      } satisfies CSSProperties,
    };
  }

  if (type === "q") {
    return {
      glowStyle: {
        background: isWhite
          ? "radial-gradient(circle, rgba(255,70,70,1) 0%, rgba(255,40,40,0.95) 12%, rgba(235,25,25,0.88) 28%, rgba(210,15,15,0.40) 48%, rgba(210,15,15,0) 62%)"
          : "radial-gradient(circle, rgba(255,85,45,1) 0%, rgba(255,50,20,0.95) 12%, rgba(235,30,10,0.88) 28%, rgba(210,20,5,0.40) 48%, rgba(210,20,5,0) 62%)",
        opacity: 1,
        animation: "queenPulse 2.1s ease-in-out infinite",
      } satisfies CSSProperties,
      imageStyle: {
        filter: `${baseImageFilter} ${
          isWhite
            ? "drop-shadow(0 0 10px rgba(255,70,70,0.36))"
            : "drop-shadow(0 0 10px rgba(255,85,45,0.32))"
        }`,
      } satisfies CSSProperties,
    };
  }

  if (type === "r") {
    return {
      glowStyle: {
        background: isWhite
          ? "radial-gradient(circle, rgba(251,191,36,0.42) 0%, rgba(251,191,36,0.18) 30%, rgba(251,191,36,0) 74%)"
          : "radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.14) 30%, rgba(251,191,36,0) 74%)",
        opacity: 0.9,
      } satisfies CSSProperties,
      imageStyle: {
        filter: `${baseImageFilter} drop-shadow(0 0 6px rgba(251,191,36,0.16))`,
      } satisfies CSSProperties,
    };
  }

  if (type === "b") {
    return {
      glowStyle: {
        background: isWhite
          ? "radial-gradient(circle, rgba(255,244,214,0.34) 0%, rgba(255,236,180,0.16) 30%, rgba(255,236,180,0) 74%)"
          : "radial-gradient(circle, rgba(255,236,180,0.24) 0%, rgba(255,220,140,0.12) 30%, rgba(255,220,140,0) 74%)",
        opacity: 0.85,
      } satisfies CSSProperties,
      imageStyle: {
        filter: `${baseImageFilter} drop-shadow(0 0 5px rgba(255,236,180,0.12))`,
      } satisfies CSSProperties,
    };
  }

  if (type === "n") {
    return {
      glowStyle: {
        background: isWhite
          ? "radial-gradient(circle, rgba(249,115,22,0.34) 0%, rgba(249,115,22,0.14) 30%, rgba(249,115,22,0) 74%)"
          : "radial-gradient(circle, rgba(249,115,22,0.26) 0%, rgba(249,115,22,0.12) 30%, rgba(249,115,22,0) 74%)",
        opacity: 0.82,
      } satisfies CSSProperties,
      imageStyle: {
        filter: `${baseImageFilter} drop-shadow(0 0 5px rgba(249,115,22,0.12))`,
      } satisfies CSSProperties,
    };
  }

  return {
    glowStyle: {
      background: isWhite
        ? "radial-gradient(circle, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0) 74%)"
        : "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0) 74%)",
      opacity: 0.72,
    } satisfies CSSProperties,
    imageStyle: {
      filter: baseImageFilter,
    } satisfies CSSProperties,
  };
}

function Piece({
  type,
  color,
}: {
  type: PieceType;
  color: PieceColor;
}) {
  const { glowStyle, imageStyle } = getPieceAuraSpec(type, color);

  return (
    <span className="relative flex h-[84%] w-[84%] items-center justify-center pointer-events-none select-none">
      <span
        className="absolute inset-[-8%] rounded-full blur-xl"
        style={glowStyle}
      />
      <img
        src={`/chess-pieces/${color}${type}.png`}
        alt={`${color === "w" ? "White" : "Black"} ${pieceName(type)}`}
        draggable={false}
        className={`relative z-10 h-full w-full select-none object-contain ${
          type === "k" || type === "q" ? "scale-[1.02]" : ""
        }`}
        style={imageStyle}
      />
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
  const targetSet = useMemo(() => new Set(legalTargets), [legalTargets]);

  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-[2rem] border border-amber-700/25 bg-[#0f0c09] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.48)]">
        <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.55rem] border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          {ranks.map((rank, rankIndex) =>
            files.map((file, fileIndex) => {
              const square = `${file}${rank}` as Square;
              const piece = board.get(square);
              const isSelected = selectedSquare === square;
              const isTarget = targetSet.has(square);

              return (
                <button
                  key={square}
                  type="button"
                  onClick={() => onSquareClick(square)}
                  aria-label={`Square ${square}`}
                  className={[
                    "relative flex h-full w-full items-center justify-center overflow-hidden",
                    "transition duration-150 ease-out",
                    "focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-300/75",
                  ].join(" ")}
                  style={{
                    backgroundImage: getSquareBackground(fileIndex, rankIndex),
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -10px 18px rgba(0,0,0,0.12)",
                  }}
                >
                  {isSelected ? (
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at center, rgba(251,191,36,0.42) 0%, rgba(251,191,36,0.22) 38%, rgba(251,191,36,0) 74%)",
                        mixBlendMode: "screen",
                      }}
                    />
                  ) : null}

                  {isTarget ? (
                    <span className="absolute z-[1] h-4 w-4 rounded-full border-2 border-amber-100/90 shadow-[0_0_0_6px_rgba(251,191,36,0.12),0_0_18px_rgba(251,191,36,0.72)]" />
                  ) : null}

                  {piece ? (
                    <Piece
                      type={piece.type as PieceType}
                      color={piece.color as PieceColor}
                    />
                  ) : null}

                  {showCoordinates && rankIndex === 7 ? (
                    <span className="absolute bottom-1 right-1 z-[2] text-[10px] font-medium text-amber-100/55 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                      {file}
                    </span>
                  ) : null}

                  {showCoordinates && fileIndex === 0 ? (
                    <span className="absolute left-1 top-1 z-[2] text-[10px] font-medium text-amber-100/55 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                      {rank}
                    </span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes kingPulse {
          0%,
          100% {
            transform: scale(0.98);
            opacity: 0.78;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @keyframes queenPulse {
          0%,
          100% {
            transform: scale(0.98);
            opacity: 0.74;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}