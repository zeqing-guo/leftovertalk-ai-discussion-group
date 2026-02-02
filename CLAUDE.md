# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Community knowledge base for the "边角聊 (LeftoverTalk)" AI discussion group. Aggregates AI tool recommendations and usage experiences shared by WeChat group members into a searchable web interface.

## Architecture

The project has three main components:

1. **WeChat Screenshot Summarizer** (`wechat-screenshot-summarizer/`) — A Claude Code skill that extracts structured markdown from WeChat chat screenshots. It splits tall images into sub-images via `split_image.py`, then uses Claude's vision to read each part and extract tool recommendations and AI experience entries into a markdown file.

2. **Data Extractor** (`extract.py`) — Parses the markdown files produced by the summarizer. Extracts tool recommendations and experience entries using regex, normalizes contributor names (strips emoji, parenthetical annotations), and outputs `public/data.json` with tools, experiences, people, and stats.

3. **Web Frontend** (`index.html` + `src/`) — Vite-built SPA that loads `data.json` and `member-projects.json` via Fetch. Three tabs: Tools (工具), Experiences (经验), Member Projects (群友项目). Features debounced search, person-based filtering via clickable name chips, and expand/collapse for long experience entries. Includes SEO pre-rendering for crawlers.

## Data Flow

WeChat screenshots → `split_image.py` splits images → Claude reads sub-images and produces markdown → `extract.py` parses markdown into `public/data.json` → web frontend renders the data.

`public/member-projects.json` is manually maintained and links community member projects to tools, adding "群友作品" badges and perk information in the UI.

## Common Commands

**Development server:**
```bash
npm run dev
```

**Build for production (includes SEO pre-rendering):**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

**Regenerate data.json from markdown files:**
```bash
python3 extract.py
```

**Regenerate favicons and OG image:**
```bash
python3 scripts/generate-images.py
```

**Split a screenshot for processing:**
```bash
pip install Pillow  # if needed
python3 wechat-screenshot-summarizer/scripts/split_image.py "<image_path>" --max-height 1000
```

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, Tailwind CSS v3, Lucide Icons, Google Fonts (Fira Code, Fira Sans)
- **Build:** Vite, PostCSS, Autoprefixer
- **Data processing:** Python 3 (standard library only for `extract.py`; Pillow required for `split_image.py` and `scripts/generate-images.py`)
- **Deployment:** Cloudflare Pages (auto-builds on push to main)

## Project Structure

```
index.html              # Vite entry HTML (meta tags, structure)
src/main.js             # App logic (extracted from inline script)
src/style.css           # Tailwind directives + custom styles
public/                 # Static assets (copied as-is to dist/)
  data.json             # Tool/experience data (Chinese)
  data-en.json          # Tool/experience data (English)
  member-projects.json  # Member projects (Chinese)
  member-projects-en.json
  logo.png, logo-32.png, og-image.png, favicon files
  robots.txt, sitemap.xml
scripts/
  generate-images.py    # Favicon + OG image generator
  prerender.js          # Post-build SEO content injection
```

## Key Data Formats

**Markdown files** (input to `extract.py`) use this structure:
- `## 工具推荐` section with `### N. ToolName` subsections containing `**推荐人**`, `**用途**`, `**网址**`, `**原图来源**` fields
- `## AI 使用经验分享` section with `### N. TopicName` subsections containing `**分享人**`, `**时间**`, `**经验**`, `**原图来源**` fields

**member-projects.json** entries: `{ toolName, author, url, perk, perkType }` where `perkType` is `"free_access"`, `"coupon"`, or `null`.

## Language

Content is in Chinese. Code comments and variable names are in English.
