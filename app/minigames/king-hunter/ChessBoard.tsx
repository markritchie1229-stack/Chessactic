"use client";

import type { Chess as ChessInstance, Square } from "chess.js";

type ChessBoardProps = {
  board: ChessInstance;
  selectedSquare: Square | null;
  legalTargets: Square[];
  orientation?: "white" | "black";
  onSquareClick: (square: Square) => void;
  className?: string;
  showCoordinates?: boolean;
  pieceImageBasePath?: string;
  boardImageSrc?: string;
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

function squareFallbackColor(fileIndex: number, rankIndex: number) {
  return (fileIndex + rankIndex) % 2 === 0 ? "bg-[#e6dcc4]" : "bg-[#5f5a52]";
}

function pieceImageSrc(basePath: string, color: PieceColor, type: PieceType) {
  return `${basePath.replace(/\/$/, "")}/${color}${type}.png`;
}

function PieceImage({
  type,
  color,
  basePath,
}: {
  type: PieceType;
  color: PieceColor;
  basePath: string;
}) {
  const src = pieceImageSrc(basePath, color, type);

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={[
        "pointer-events-none select-none",
        "h-[84%] w-[84%] object-contain",
        color === "w"
          ? "drop-shadow-[0_2px_4px_rgba(255,201,84,0.18)]"
          : "drop-shadow-[0_2px_5px_rgba(255,116,48,0.22)]",
      ].join(" ")}
    />
  );
}

function PieceShell({
  type,
  color,
  basePath,
}: {
  type: PieceType;
  color: PieceColor;
  basePath: string;
}) {
  return (
    <span
      className={[
        "flex h-[86%] w-[86%] items-center justify-center",
        "transition-transform duration-150",
      ].join(" ")}
      aria-label={color === "w" ? "White piece" : "Black piece"}
    >
      <PieceImage type={type} color={color} basePath={basePath} />
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
  pieceImageBasePath = "/chess-pieces",
  boardImageSrc = "/boards/board-forged-kings.png",
}: ChessBoardProps) {
  const { files, ranks } = buildBoardSquares(orientation);
  const hasBoardImage = Boolean(boardImageSrc);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-slate-700 shadow-2xl shadow-black/25">
        {hasBoardImage ? (
          <img
            src={boardImageSrc}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
            {ranks.map((rank, rankIndex) =>
              files.map((file, fileIndex) => {
                const square = `${file}${rank}`;
                return (
                  <div
                    key={square}
                    className={squareFallbackColor(fileIndex, rankIndex)}
                  />
                );
              }),
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-black/4" />

        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
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
                    "bg-transparent transition",
                    "focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-300/80",
                    isSelected ? "ring-4 ring-inset ring-amber-300/90" : "",
                    !hasBoardImage ? squareFallbackColor(fileIndex, rankIndex) : "",
                  ].join(" ")}
                  aria-label={`Square ${square}`}
                >
                  {piece ? (
                    <PieceShell
                      type={piece.type as PieceType}
                      color={piece.color as PieceColor}
                      basePath={pieceImageBasePath}
                    />
                  ) : null}

                  {isTarget ? (
                    <span className="absolute h-4 w-4 rounded-full bg-amber-300/55 shadow-[0_0_0_3px_rgba(15,23,42,0.18)]" />
                  ) : null}

                  {showCoordinates && rankIndex === 7 ? (
                    <span className="absolute bottom-1 right-1 text-[10px] font-medium text-black/55">
                      {file}
                    </span>
                  ) : null}

                  {showCoordinates && fileIndex === 0 ? (
                    <span className="absolute left-1 top-1 text-[10px] font-medium text-black/55">
                      {rank}
                    </span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
