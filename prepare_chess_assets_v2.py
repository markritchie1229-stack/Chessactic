#!/usr/bin/env python3
"""Prepare Forged Kings chess assets.

This script removes the faux checkerboard background from each chess piece,
keeps the board image untouched, and writes a clean `public/` structure.

Dependencies:
  pip3 install pillow numpy

Example:
  python3 prepare_chess_assets_v2.py \
      --input-dir ./raw-assets \
      --output-dir ./public
"""

from __future__ import annotations

import argparse
import math
import shutil
import sys
from collections import deque
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageFilter

PIECE_FILES = [
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
    "board.jpg",
    "board.jpeg",
    "board.webp",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare chess piece PNGs and board art for the Forged Kings UI."
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        help="Folder containing the raw PNGs (pieces and optional board).",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Destination folder for the cleaned public/ assets.",
    )
    parser.add_argument(
        "--board-file",
        default=None,
        help="Optional explicit board filename to copy from the input directory.",
    )
    parser.add_argument(
        "--canvas-size",
        type=int,
        default=1024,
        help="Final square canvas size for each piece PNG (default: 1024).",
    )
    parser.add_argument(
        "--top-margin",
        type=int,
        default=72,
        help="Top margin in the final canvas for pieces (default: 72).",
    )
    parser.add_argument(
        "--bottom-margin",
        type=int,
        default=72,
        help="Bottom margin in the final canvas for pieces (default: 72).",
    )
    parser.add_argument(
        "--side-margin",
        type=int,
        default=72,
        help="Side margin in the final canvas for pieces (default: 72).",
    )
    parser.add_argument(
        "--k",
        type=int,
        default=6,
        help="Number of color clusters used for background separation (default: 6).",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def kmeans_pp(data: np.ndarray, k: int, iters: int = 20, seed: int = 0) -> np.ndarray:
    """Tiny k-means implementation with k-means++ init.

    data must be a float32 array of shape (n, 3).
    """

    if len(data) == 0:
        raise ValueError("kmeans_pp received no data")

    rng = np.random.default_rng(seed)
    n = len(data)
    k = max(1, min(k, n))

    centers = np.empty((k, 3), dtype=np.float32)
    centers[0] = data[rng.integers(n)]

    # k-means++ init
    closest_dist_sq = np.full(n, np.inf, dtype=np.float32)
    for i in range(1, k):
        dist_sq = ((data - centers[i - 1]) ** 2).sum(axis=1)
        closest_dist_sq = np.minimum(closest_dist_sq, dist_sq)
        total = float(closest_dist_sq.sum())
        if not math.isfinite(total) or total <= 0:
            centers[i] = data[rng.integers(n)]
            continue
        probs = closest_dist_sq / total
        idx = rng.choice(n, p=probs)
        centers[i] = data[idx]

    for _ in range(iters):
        dist = ((data[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        labels = dist.argmin(axis=1)
        new_centers = centers.copy()
        for i in range(k):
            pts = data[labels == i]
            if len(pts):
                new_centers[i] = pts.mean(axis=0)
        if np.allclose(new_centers, centers, atol=0.5):
            break
        centers = new_centers

    return centers


def connected_component_from_center(mask: np.ndarray) -> np.ndarray:
    """Keep only the mask component connected to the center (or nearest seed)."""

    h, w = mask.shape
    cy, cx = h // 2, w // 2

    seed = None
    # Search outward from the center to find a foreground seed quickly.
    max_radius = max(h, w) // 2
    for r in range(0, max_radius, 2):
        y0 = max(0, cy - r)
        y1 = min(h, cy + r + 1)
        x0 = max(0, cx - r)
        x1 = min(w, cx + r + 1)
        window = mask[y0:y1, x0:x1]
        if window.any():
            coords = np.argwhere(window)
            # Choose the foreground pixel closest to the image center.
            global_coords = coords + np.array([y0, x0])
            d2 = (global_coords[:, 0] - cy) ** 2 + (global_coords[:, 1] - cx) ** 2
            seed = tuple(global_coords[int(d2.argmin())])
            break

    if seed is None:
        return mask

    visited = np.zeros_like(mask, dtype=bool)
    q: deque[tuple[int, int]] = deque([seed])
    visited[seed] = True

    # 8-neighborhood flood fill.
    neighbors = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ]

    while q:
        y, x = q.popleft()
        for dy, dx in neighbors:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    return visited


def pick_foreground_clusters(labels: np.ndarray, center_dist: np.ndarray) -> set[int]:
    unique = np.unique(labels)
    stats = []
    total = labels.size
    for cluster in unique:
        cluster_mask = labels == cluster
        count = int(cluster_mask.sum())
        if count == 0:
            continue
        mean_dist = float(center_dist[cluster_mask].mean())
        stats.append((int(cluster), count, mean_dist))

    if not stats:
        return set()

    stats.sort(key=lambda t: t[2])  # by mean distance to center

    if len(stats) == 1:
        return {stats[0][0]}

    gaps = [stats[i + 1][2] - stats[i][2] for i in range(len(stats) - 1)]
    split = int(np.argmax(gaps))
    fg = {cluster for cluster, _, _ in stats[: split + 1]}

    fg_pixels = sum(count for cluster, count, _ in stats if cluster in fg)
    fg_fraction = fg_pixels / total

    # Fallback if the elbow split looks weird.
    if fg_fraction < 0.03 or fg_fraction > 0.60:
        min_dist = stats[0][2]
        max_dist = stats[-1][2]
        threshold = min_dist + 0.25 * (max_dist - min_dist)
        fg = {cluster for cluster, _, dist in stats if dist <= threshold}

    return fg


def remove_fake_background(img: Image.Image, k: int = 6) -> Image.Image:
    """Return an RGBA image with the faux background removed."""

    rgba = img.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3].astype(np.float32)
    h, w = rgb.shape[:2]

    # Sample every Nth pixel to keep k-means fast.
    sample_step = max(6, min(12, max(h, w) // 128 or 8))
    sample = rgb[::sample_step, ::sample_step].reshape(-1, 3)

    centers = kmeans_pp(sample, k=k, iters=20, seed=0)
    flat = rgb.reshape(-1, 3)
    dists = ((flat[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    labels = dists.argmin(axis=1).reshape(h, w)

    yy, xx = np.mgrid[:h, :w]
    center_dist = np.sqrt((xx - w / 2.0) ** 2 + (yy - h / 2.0) ** 2)

    fg_clusters = pick_foreground_clusters(labels, center_dist)
    if not fg_clusters:
        return rgba

    mask = np.isin(labels, list(fg_clusters))

    # Keep only the central connected component to suppress background leaks.
    mask = connected_component_from_center(mask)

    # Smooth the mask a little while preserving edges.
    mask_img = Image.fromarray((mask.astype(np.uint8) * 255), mode="L")
    mask_img = mask_img.filter(ImageFilter.MaxFilter(3))
    mask_img = mask_img.filter(ImageFilter.MinFilter(3))
    mask_img = mask_img.filter(ImageFilter.MaxFilter(3))
    mask_arr = np.array(mask_img) > 0

    if mask_arr.sum() == 0:
        return rgba

    out = rgba.copy()
    out.putalpha(Image.fromarray(mask_arr.astype(np.uint8) * 255, mode="L"))
    return out


def crop_to_mask(img: Image.Image, pad: int = 16) -> Image.Image:
    alpha = np.array(img.getchannel("A"))
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0 or len(ys) == 0:
        return img

    left = max(0, int(xs.min()) - pad)
    right = min(img.width, int(xs.max()) + pad + 1)
    top = max(0, int(ys.min()) - pad)
    bottom = min(img.height, int(ys.max()) + pad + 1)
    return img.crop((left, top, right, bottom))


def place_on_canvas(img: Image.Image, canvas_size: int, top_margin: int, bottom_margin: int, side_margin: int) -> Image.Image:
    crop = img.convert("RGBA")
    max_w = canvas_size - 2 * side_margin
    max_h = canvas_size - top_margin - bottom_margin

    scale = min(1.0, max_w / crop.width, max_h / crop.height)
    if scale < 1.0:
        new_w = max(1, int(round(crop.width * scale)))
        new_h = max(1, int(round(crop.height * scale)))
        crop = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - crop.width) // 2
    y = canvas_size - bottom_margin - crop.height
    y = max(top_margin, y)
    canvas.alpha_composite(crop, (x, y))
    return canvas


def process_piece(src: Path, dst: Path, args: argparse.Namespace) -> None:
    print(f"Preparing piece: {src.name} -> {dst}")
    img = Image.open(src)
    cleaned = remove_fake_background(img, k=args.k)
    cleaned = crop_to_mask(cleaned, pad=16)
    placed = place_on_canvas(
        cleaned,
        canvas_size=args.canvas_size,
        top_margin=args.top_margin,
        bottom_margin=args.bottom_margin,
        side_margin=args.side_margin,
    )
    ensure_dir(dst.parent)
    placed.save(dst, format="PNG", optimize=True)


def find_board_file(input_dir: Path, explicit: str | None) -> Path | None:
    if explicit:
        candidate = input_dir / explicit
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"Board file not found: {candidate}")

    for name in BOARD_CANDIDATES:
        candidate = input_dir / name
        if candidate.exists():
            return candidate

    # Fallback: any file containing 'board' in the name.
    for candidate in sorted(input_dir.iterdir()):
        if candidate.is_file() and 'board' in candidate.name.lower():
            return candidate
    return None


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()

    if not input_dir.exists():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 1

    pieces_out = output_dir / "chess-pieces"
    boards_out = output_dir / "boards"
    ensure_dir(pieces_out)
    ensure_dir(boards_out)

    for filename in PIECE_FILES:
        src = input_dir / filename
        if not src.exists():
            print(f"Missing piece file: {src}", file=sys.stderr)
            continue
        dst = pieces_out / filename
        process_piece(src, dst, args)

    board_src = find_board_file(input_dir, args.board_file)
    if board_src is not None:
        board_dst = boards_out / "board-forged-kings.png"
        print(f"Preparing board: {board_src.name} -> {board_dst}")
        # If input/output are the same file, skip a redundant copy.
        if board_src.resolve() != board_dst.resolve():
            shutil.copy2(board_src, board_dst)
    else:
        print("No board image found; skipping board copy.")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
