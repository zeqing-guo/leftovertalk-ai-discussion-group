# 边角聊 AI 讨论组 (LeftoverTalk AI Discussion Group)

Community knowledge base for the 边角聊 AI discussion group — aggregating AI tool recommendations and usage experiences shared by WeChat group members into a searchable web interface.

## Quick Start

Serve the site locally (required for data loading):

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## How It Works

1. **Capture** — Take WeChat group chat screenshots
2. **Split & Extract** — Use the [WeChat Screenshot Summarizer](wechat-screenshot-summarizer/SKILL.md) skill to split tall screenshots and extract structured markdown
3. **Generate data** — Run `python3 extract.py` to parse markdown files into `data.json`
4. **View** — Open the site to browse tools, experiences, and member projects with search and filtering

## Project Structure

```
index.html                          # Single-page web app (Tailwind CSS, vanilla JS)
extract.py                          # Parses markdown files into data.json
data.json                           # Generated tool/experience data
member-projects.json                # Manually maintained member project metadata
logo.png                            # Site logo
wechat-screenshot-summarizer/       # Claude Code skill for screenshot processing
  SKILL.md                          # Skill definition
  scripts/split_image.py            # Splits tall screenshots into sub-images
  references/output_format.md       # Output format specification
```

## Dependencies

- **Python 3** (standard library) for `extract.py`
- **Pillow** (`pip install Pillow`) for `split_image.py`
- No frontend build tools — Tailwind CSS and Lucide Icons loaded via CDN

## License

[MIT](LICENSE)