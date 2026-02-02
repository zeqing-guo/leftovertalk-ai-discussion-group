#!/usr/bin/env python3
"""Split a tall screenshot into sub-images with max height of 400px.

Usage:
    python split_image.py <image_path> [--max-height 400]

Output:
    Creates a folder named after the image (without extension) in the same
    directory as the image, containing numbered sub-images:
        part_001.png, part_002.png, ...

    Prints the output folder path and total number of parts to stdout as JSON.
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)


def split_image(image_path: str, max_height: int = 1000) -> dict:
    img_path = Path(image_path).resolve()
    if not img_path.exists():
        print(f"Error: File not found: {img_path}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(img_path)
    width, height = img.size

    # Create output folder named after the image (without extension)
    output_dir = img_path.parent / img_path.stem
    output_dir.mkdir(exist_ok=True)

    parts = []
    y = 0
    idx = 1
    while y < height:
        bottom = min(y + max_height, height)
        cropped = img.crop((0, y, width, bottom))
        part_name = f"part_{idx:03d}.png"
        part_path = output_dir / part_name
        cropped.save(part_path, "PNG")
        parts.append(str(part_path))
        y = bottom
        idx += 1

    result = {
        "output_dir": str(output_dir),
        "total_parts": len(parts),
        "parts": parts,
        "original_image": str(img_path),
    }
    return result


def main():
    parser = argparse.ArgumentParser(description="Split tall screenshot into sub-images")
    parser.add_argument("image_path", help="Path to the screenshot image")
    parser.add_argument("--max-height", type=int, default=1000, help="Max height per sub-image in pixels (default: 1000)")
    args = parser.parse_args()

    result = split_image(args.image_path, args.max_height)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
