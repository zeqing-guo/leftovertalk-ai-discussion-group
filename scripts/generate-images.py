#!/usr/bin/env python3
"""Generate favicon set and OG image from logo.png."""

import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
LOGO_PATH = PUBLIC / "logo.png"


def generate_favicons():
    """Generate favicon files from the source logo."""
    logo = Image.open(LOGO_PATH).convert("RGBA")

    sizes = {
        "favicon-32x32.png": (32, 32),
        "favicon-16x16.png": (16, 16),
        "apple-touch-icon.png": (180, 180),
        "logo-32.png": (32, 32),
    }

    for filename, size in sizes.items():
        resized = logo.resize(size, Image.LANCZOS)
        resized.save(PUBLIC / filename, "PNG")
        print(f"  Created {filename} ({size[0]}x{size[1]})")

    # favicon.ico (32x32)
    ico = logo.resize((32, 32), Image.LANCZOS)
    ico.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(32, 32)])
    print("  Created favicon.ico (32x32)")


def generate_og_image():
    """Generate Open Graph image (1200x630)."""
    width, height = 1200, 630
    bg_color = (248, 250, 252)  # #F8FAFC
    text_color = (30, 41, 59)  # #1E293B
    muted_color = (100, 116, 139)  # #64748B
    accent_color = (37, 99, 235)  # #2563EB

    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw accent line at top
    draw.rectangle([0, 0, width, 6], fill=accent_color)

    # Place logo in center-top area
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_size = 120
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    logo_x = (width - logo_size) // 2
    logo_y = 120
    img.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # Try to load fonts, fall back to default
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 48)
        font_medium = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Site name (Chinese)
    title_zh = "边角聊 AI 讨论组"
    bbox = draw.textbbox((0, 0), title_zh, font=font_large)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) / 2, 270), title_zh, fill=text_color, font=font_large)

    # Site name (English)
    title_en = "LeftoverTalk AI Discussion Group"
    bbox = draw.textbbox((0, 0), title_en, font=font_medium)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) / 2, 340), title_en, fill=muted_color, font=font_medium)

    # Stats line - read from data.json for accuracy
    data_path = PUBLIC / "data.json"
    if data_path.exists():
        with open(data_path, encoding="utf-8") as f:
            data = json.load(f)
        num_tools = len(data.get("tools", []))
        num_exp = len(data.get("experiences", []))
        people = set()
        for t in data.get("tools", []):
            people.update(t.get("recommenders", []))
        for e in data.get("experiences", []):
            people.update(e.get("sharers", []))
        num_people = len(people)
        stats = f"{num_tools} AI Tools  |  {num_exp} Experiences  |  {num_people} Contributors"
    else:
        stats = "AI Tools | Experiences | Contributors"

    bbox = draw.textbbox((0, 0), stats, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) / 2, 420), stats, fill=accent_color, font=font_small)

    # Draw accent line at bottom
    draw.rectangle([0, height - 6, width, height], fill=accent_color)

    img.save(PUBLIC / "og-image.png", "PNG")
    print(f"  Created og-image.png (1200x630) - {stats}")


if __name__ == "__main__":
    print("Generating favicons...")
    generate_favicons()
    print("Generating OG image...")
    generate_og_image()
    print("Done!")
