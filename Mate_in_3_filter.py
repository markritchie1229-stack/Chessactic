import json

INPUT_FILE = "Mate.In.3.Complete.Rated_deduped.json"
OUTPUT_FILE = "MateIn3_CountedPlies.json"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

# Keep only positions where the forced mate is fully verified in 3 plies
mate_in_3 = [
    puzzle for puzzle in data
    if puzzle.get("counted_plies") == 3
]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(mate_in_3, f, indent=2)

print(f"Found {len(mate_in_3)} mate-in-3 puzzles.")
print(f"Saved to {OUTPUT_FILE}")