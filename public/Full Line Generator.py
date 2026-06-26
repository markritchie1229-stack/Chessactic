#!/usr/bin/env python3
"""
Reconstruct missing chess moves in puzzle JSON files.

This version is meant for running locally in VS Code on your Mac.

What it does:
- Reads the JSON files from the same folder as this script
- Replays the known winning moves
- Inserts engine replies between them
- For mate puzzles (mate_length present), continues to the end of the line
- Writes:
    - sample_line: list of UCI moves for the full reconstructed line
    - full_winning_sequence: detailed move objects for the full reconstructed line
- Optionally overwrites winning_sequence with the reconstructed full sequence

Requirements:
    pip install python-chess
    Stockfish installed locally
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import chess
import chess.engine


# Folder where this script lives.
BASE_DIR = Path(__file__).resolve().parent

# Try to find Stockfish automatically.
DEFAULT_ENGINE_PATH = shutil.which("stockfish") or "/opt/homebrew/bin/stockfish"

# Your files, expected to be in the same folder as this script.
DEFAULT_INPUT_FILES = [
    BASE_DIR / "Discovered.Attacks.Complete.Rated_deduped.json",
    BASE_DIR / "Forks.Complete.Rated_deduped.json",
    BASE_DIR / "Hanging.Pieces.Complete.Rated_deduped.json",
    BASE_DIR / "Pins.Complete.Rated_deduped.json",
    BASE_DIR / "Skewers.Complete.Rated_deduped.json",
]

OUTPUT_SUFFIX = "_filled"


def side_name(turn: bool) -> str:
    return "white" if turn == chess.WHITE else "black"


def move_entry(
    board_before: chess.Board,
    move: chess.Move,
    ply: int,
    source: str,
    template: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    entry = copy.deepcopy(template) if template else {}
    entry["ply"] = ply
    entry["uci"] = move.uci()
    entry["san"] = board_before.san(move)
    entry["side_to_move"] = side_name(board_before.turn)
    entry["source"] = source
    return entry


def best_reply(board: chess.Board, engine: chess.engine.SimpleEngine, depth: int) -> Optional[chess.Move]:
    try:
        result = engine.play(board, chess.engine.Limit(depth=depth))
        return result.move
    except chess.engine.EngineError:
        return None


def reconstruct_sequence(
    item: Dict[str, Any],
    engine: chess.engine.SimpleEngine,
    depth: int,
    continue_to_end: bool,
) -> Tuple[List[str], List[Dict[str, Any]]]:
    fen = item.get("fen")
    if not fen:
        return [], []

    board = chess.Board(fen)

    original = item.get("winning_sequence", [])
    if not isinstance(original, list):
        original = []

    # Fall back to a single solution move if winning_sequence is empty.
    if not original and item.get("solution"):
        original = [{"uci": item["solution"], "source": "solution"}]

    full_sequence: List[Dict[str, Any]] = []
    sample_line: List[str] = []

    for idx, item_move in enumerate(original):
        if not isinstance(item_move, dict) or "uci" not in item_move:
            continue

        try:
            move = board.parse_uci(item_move["uci"])
        except ValueError:
            continue

        full_sequence.append(
            move_entry(
                board_before=board,
                move=move,
                ply=len(full_sequence) + 1,
                source=item_move.get("source", "solution"),
                template=item_move,
            )
        )
        sample_line.append(move.uci())
        board.push(move)

        if board.is_game_over():
            break

        # Insert one engine reply after each known move.
        reply = best_reply(board, engine, depth)
        if reply is None or reply not in board.legal_moves:
            break

        full_sequence.append(
            move_entry(
                board_before=board,
                move=reply,
                ply=len(full_sequence) + 1,
                source="engine",
            )
        )
        sample_line.append(reply.uci())
        board.push(reply)

        # If this is a mate puzzle, keep going until the line ends.
        if continue_to_end and idx == len(original) - 1:
            while not board.is_game_over():
                nxt = best_reply(board, engine, depth)
                if nxt is None or nxt not in board.legal_moves:
                    break

                full_sequence.append(
                    move_entry(
                        board_before=board,
                        move=nxt,
                        ply=len(full_sequence) + 1,
                        source="engine",
                    )
                )
                sample_line.append(nxt.uci())
                board.push(nxt)

    return sample_line, full_sequence


def process_file(
    input_path: Path,
    output_path: Path,
    engine: chess.engine.SimpleEngine,
    depth: int,
    overwrite_winning_sequence: bool,
    force_continue_to_end: bool,
) -> None:
    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"{input_path} must contain a top-level JSON array.")

    out: List[Any] = []

    for item in data:
        if not isinstance(item, dict):
            out.append(item)
            continue

        # Automatically continue to the end for mate puzzles.
        continue_to_end = force_continue_to_end or ("mate_length" in item)

        sample_line, full_sequence = reconstruct_sequence(
            item=item,
            engine=engine,
            depth=depth,
            continue_to_end=continue_to_end,
        )

        new_item = copy.deepcopy(item)

        if sample_line:
            new_item["sample_line"] = sample_line
            new_item["full_winning_sequence"] = full_sequence
            new_item["counted_plies"] = len(full_sequence)
            new_item["solver_moves_kept"] = len(
                [m for m in full_sequence if m.get("source") == "solution"]
            )

            if overwrite_winning_sequence:
                new_item["winning_sequence"] = full_sequence

        out.append(new_item)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--engine",
        default=DEFAULT_ENGINE_PATH,
        help="Path to a UCI engine binary",
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=16,
        help="Engine search depth",
    )
    parser.add_argument(
        "--overwrite-winning-sequence",
        action="store_true",
        help="Replace winning_sequence with the reconstructed full sequence",
    )
    parser.add_argument(
        "--continue-to-end",
        action="store_true",
        help="Continue after the last known move until game over for all files",
    )
    parser.add_argument(
        "--inplace",
        action="store_true",
        help="Overwrite originals instead of writing *_filled.json files",
    )
    parser.add_argument(
        "files",
        nargs="*",
        help="Input JSON files. If omitted, the files in the script folder are used.",
    )
    args = parser.parse_args()

    input_files = [Path(p) for p in args.files] if args.files else DEFAULT_INPUT_FILES

    if not Path(args.engine).exists():
        raise FileNotFoundError(
            f"Stockfish not found at: {args.engine}\n"
            f"Edit DEFAULT_ENGINE_PATH or run with --engine <path-to-stockfish>"
        )

    engine = chess.engine.SimpleEngine.popen_uci(args.engine)
    try:
        for input_path in input_files:
            if not input_path.exists():
                print(f"Skipping missing file: {input_path}")
                continue

            output_path = input_path if args.inplace else input_path.with_name(
                input_path.stem + OUTPUT_SUFFIX + input_path.suffix
            )

            process_file(
                input_path=input_path,
                output_path=output_path,
                engine=engine,
                depth=args.depth,
                overwrite_winning_sequence=args.overwrite_winning_sequence,
                force_continue_to_end=args.continue_to_end,
            )
    finally:
        engine.quit()


if __name__ == "__main__":
    main()