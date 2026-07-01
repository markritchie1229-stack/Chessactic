#!/usr/bin/env python3
"""Prepare chess UI assets from AI-generated source images.

This script is tuned for the "Forged Kings" chess set:
- chess piece PNGs with a fake checkerboard / light background
- a separate board PNG that should be copied unchanged

It uses OpenCV GrabCut to isolate the piece from its background, keeps the
largest foreground component, feathers the alpha slightly, trims to the
piece bounds, centers on a square transparent canvas, and writes web-ready
PNG files.

Dependencies:
    pip install opencv-python pillow numpy

Example:
    python3 prepare_chess_assets_segmented.py \
        --input-dir ~/Documents/chessatical/raw-assets \
        --output-dir ~/Documents/chessatical/public

If a board image exists, it will be copied to public/boards/board-forged-kings.png
unless --board-file is provided.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import Iterable, Optional

import cv2
import numpy as np
from PIL import Image

STANDARD_PIECES = [
    "wp.png",
    "wr.png",
    "wn.png",
    "wb.png",
    "wq.png",
    "wk.png",
    "bp.png",
    "br.png",
    "bn.png",
    "bb.png",
    "bq.png",
    "bk.png",
]

BOARD_CANDIDATES = [
    "board-forged-kings.png",
    "board.png",
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input-dir", required=True, help="Folder containing raw PNG assets")
    p.add_argument("--output-dir", required=True, help="Destination folder (usually ./public)")
    p.add_argument("--board-file", default=None, help="Optional explicit board filename inside input-dir")
    p.add_argument("--canvas-size", type=int, default=1024, help="Output canvas size for pieces")
    p.add_argument("--piece-scale", type=float, default=0.80, help="Max fraction of canvas the piece may occupy")
    p.add_argument("--grabcut-iters", type=int, default=5, help="GrabCut iterations")
    p.add_argument("--feather", type=float, default=1.1, help="Gaussian feather for alpha edge")
    p.add_argument("--margin", type=int, default=10, help="Padding added around the cropped piece before recentering")
    p.add_argument("--dry-run", action="store_true", help="Print actions without writing files")
    return p.parse_args()


def log(msg: str) -> None:
    print(msg, flush=True)


def load_rgba(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def save_rgba(arr: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, mode="RGBA").save(path)


def segment_piece(arr: np.ndarray, grabcut_iters: int = 7) -> np.ndarray:
    """Return an RGBA image with background made transparent.

    The source images have the piece centered on a noisy checkerboard / light
    background. GrabCut with a central rectangle is reliable for this layout.
    """

    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    mask = np.zeros((h, w), np.uint8)
    # Central rectangle leaves enough room for the checkerboard / background.
    rect = (
        int(w * 0.10),
        int(h * 0.08),
        int(w * 0.80),
        int(h * 0.84),
    )

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, rect, bgd_model, fgd_model, grabcut_iters, cv2.GC_INIT_WITH_RECT)

    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype("uint8")

    # Keep the largest connected component to suppress detached junk.
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    if num_labels > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        fg = (labels == largest).astype("uint8")

    # A tiny opening helps detach background bridges without hurting the piece.
    kernel = np.ones((2, 2), np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel)

    alpha = (fg * 255).astype(np.uint8)
    if alpha.max() == 0:
        raise RuntimeError("Segmentation failed: alpha mask is empty")

    # Feather the edge a little so the piece blends naturally on the board.
    alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=1.1, sigmaY=1.1)

    out = arr.copy()
    out[:, :, 3] = alpha
    return out


def crop_to_alpha(arr: np.ndarray, margin: int = 10) -> np.ndarray:
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError("Crop failed: no non-transparent pixels found")
    h, w = arr.shape[:2]
    x0 = max(int(xs.min()) - margin, 0)
    y0 = max(int(ys.min()) - margin, 0)
    x1 = min(int(xs.max()) + margin, w - 1)
    y1 = min(int(ys.max()) + margin, h - 1)
    return arr[y0 : y1 + 1, x0 : x1 + 1]


def center_on_canvas(arr: np.ndarray, canvas_size: int = 1024, piece_scale: float = 0.80) -> np.ndarray:
    ch = cw = canvas_size
    canvas = np.zeros((ch, cw, 4), dtype=np.uint8)

    h, w = arr.shape[:2]
    target = int(min(cw, ch) * piece_scale)
    scale = min(target / w, target / h)
    # Keep enough resolution for downscaling and avoid accidental enlarging beyond 1.8x.
    scale = min(scale, 1.8)

    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    resized = cv2.resize(arr, (new_w, new_h), interpolation=interp)

    x = (cw - new_w) // 2
    y = (ch - new_h) // 2
    canvas[y : y + new_h, x : x + new_w] = resized
    return canvas


def prepare_piece(path: Path, out_path: Path, canvas_size: int, piece_scale: float, grabcut_iters: int, margin: int) -> None:
    log(f"Preparing piece: {path.name} -> {out_path}")
    arr = load_rgba(path)
    segmented = segment_piece(arr, grabcut_iters=grabcut_iters)
    cropped = crop_to_alpha(segmented, margin=margin)
    centered = center_on_canvas(cropped, canvas_size=canvas_size, piece_scale=piece_scale)
    save_rgba(centered, out_path)


def find_board(input_dir: Path, explicit_board: Optional[str]) -> Optional[Path]:
    if explicit_board:
        candidate = input_dir / explicit_board
        return candidate if candidate.exists() else None
    for name in BOARD_CANDIDATES:
        candidate = input_dir / name
        if candidate.exists():
            return candidate
    # fallback: any file with "board" in the name
    for p in sorted(input_dir.glob("*.png")):
        if "board" in p.name.lower():
            return p
    return None


def process_board(board_path: Path, output_dir: Path) -> None:
    dest = output_dir / "boards" / "board-forged-kings.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(board_path, dest)
    log(f"Preparing board: {board_path.name} -> {dest}")


def main() -> int:
    args = parse_args()
    input_dir = Path(os.path.expanduser(args.input_dir)).resolve()
    output_dir = Path(os.path.expanduser(args.output_dir)).resolve()

    if not input_dir.exists():
        log(f"Input directory does not exist: {input_dir}")
        return 1

    output_pieces = output_dir / "chess-pieces"
    output_boards = output_dir / "boards"

    if not args.dry_run:
        output_pieces.mkdir(parents=True, exist_ok=True)
        output_boards.mkdir(parents=True, exist_ok=True)

    # Piece files: use standard names if they exist, otherwise any PNGs except the board.
    standard_inputs = [input_dir / name for name in STANDARD_PIECES if (input_dir / name).exists()]
    if standard_inputs:
        piece_files = standard_inputs
    else:
        board_path = find_board(input_dir, args.board_file)
        piece_files = [p for p in sorted(input_dir.glob("*.png")) if p != board_path]

    if not piece_files:
        log("No piece PNGs found.")
        return 1

    for piece_path in piece_files:
        if piece_path.name.lower().startswith("board"):
            continue
        out_path = output_pieces / piece_path.name
        if args.dry_run:
            log(f"Would prepare piece: {piece_path.name} -> {out_path}")
        else:
            prepare_piece(
                piece_path,
                out_path,
                canvas_size=args.canvas_size,
                piece_scale=args.piece_scale,
                grabcut_iters=args.grabcut_iters,
                margin=args.margin,
            )

    board_path = find_board(input_dir, args.board_file)
    if board_path is not None:
        if args.dry_run:
            log(f"Would prepare board: {board_path.name} -> {output_dir / 'boards' / 'board-forged-kings.png'}")
        else:
            process_board(board_path, output_dir)
    else:
        log("No board image found; skipping board copy.")

    log("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
