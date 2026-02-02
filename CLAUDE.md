# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Community knowledge base for the "边角聊 (LeftoverTalk)" AI discussion group. Aggregates AI tool recommendations and usage experiences shared by WeChat group members into a searchable web interface.

## Architecture

The project has three main components:

1. **WeChat Screenshot Summarizer** (`wechat-screenshot-summarizer/`) — A Claude Code skill that extracts structured markdown from WeChat chat screenshots. It splits tall images into sub-images via `split_image.py`, then uses Claude's vision to read each part and extract tool recommendations and AI experience entries into a markdown file.

2. **Data Extractor** (`extract.py`) — Parses the markdown files produced by the summarizer. Extracts tool recommendations and experience entries using regex, normalizes contributor names (strips emoji, parenthetical annotations), and outputs `data.json` with tools, experiences, people, and stats.

3. **Web Frontend** (`index.html`) — Single-file static SPA that loads `data.json` and `member-projects.json` via Fetch. Three tabs: Tools (工具), Experiences (经验), Member Projects (群友项目). Features debounced search, person-based filtering via clickable name chips, and expand/collapse for long experience entries.

## Data Flow

WeChat screenshots → `split_image.py` splits images → Claude reads sub-images and produces markdown → `extract.py` parses markdown into `data.json` → `index.html` renders the data.

`member-projects.json` is manually maintained and links community member projects to tools, adding "群友作品" badges and perk information in the UI.

## Common Commands

**Serve the site locally** (required — Fetch won't work from `file://`):
```bash
python3 -m http.server 8000
```

**Regenerate data.json from markdown files:**
```bash
python3 extract.py
```

**Split a screenshot for processing:**
```bash
pip install Pillow  # if needed
python3 wechat-screenshot-summarizer/scripts/split_image.py "<image_path>" --max-height 1000
```

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, Tailwind CSS (CDN), Lucide Icons (CDN), Google Fonts (Fira Code, Fira Sans)
- **Data processing:** Python 3 (standard library only for `extract.py`; Pillow required for `split_image.py`)
- No build step, no package manager, no framework

## Key Data Formats

**Markdown files** (input to `extract.py`) use this structure:
- `## 工具推荐` section with `### N. ToolName` subsections containing `**推荐人**`, `**用途**`, `**网址**`, `**原图来源**` fields
- `## AI 使用经验分享` section with `### N. TopicName` subsections containing `**分享人**`, `**时间**`, `**经验**`, `**原图来源**` fields

**member-projects.json** entries: `{ toolName, author, url, perk, perkType }` where `perkType` is `"free_access"`, `"coupon"`, or `null`.

## Language

Content is in Chinese. Code comments and variable names are in English.
