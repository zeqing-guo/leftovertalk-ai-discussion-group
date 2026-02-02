---
name: wechat-screenshot-summarizer
description: Summarize WeChat group chat screenshots by extracting tool recommendations and AI experience sharing. Use when a user provides a screenshot image path and wants to extract structured notes from WeChat/chat group screenshots. Triggers on requests like "summarize this chat screenshot", "extract tools from this screenshot", providing an image path for chat summarization, or any request to process group chat screenshots into structured markdown.
---

# WeChat Screenshot Summarizer

Extract tool recommendations and AI experience sharing from WeChat group chat screenshots, outputting structured markdown summaries.

## Workflow

### Step 1: Split the Image

Run the bundled split script to break a tall screenshot into readable sub-images:

```bash
python3 SKILL_DIR/scripts/split_image.py "<image_path>" --max-height 1000
```

The script outputs JSON with `output_dir`, `total_parts`, and `parts` (list of file paths). Install Pillow first if needed: `pip install Pillow`.

### Step 2: Initialize the Output Document

Create the output markdown file in the same directory as the original image. Filename: `<original_image_stem>.md`.

Start with this skeleton:

```markdown
# <original_image_filename>

## 工具推荐

无

## AI 使用经验分享

无
```

### Step 3: Read Sub-images Sequentially

For each sub-image in order (`part_001.png`, `part_002.png`, ...):

1. Use the Read tool to view the sub-image (Claude's multimodal capability)
2. Identify all speakers by their **exact nickname/name** visible in the screenshot — never use generic terms like "群友" or "某人"
3. Extract:
   - **Tool/product recommendations**: name, recommender, time, purpose, URL
   - **AI usage experience**: sharer, time, tips, workflows, insights
4. For incomplete tool info (e.g., name mentioned but no URL), use WebSearch to find the official website and complete details
5. Update the output markdown file by appending new findings to the appropriate sections

### Step 4: Accumulate Results

When updating the markdown after each sub-image:

- Append new tool recommendations with incrementing numbers (### 1, ### 2, ...)
- Append new AI experience entries with incrementing numbers (### 1, ### 2, ...), each with **分享人**, **时间**, **经验**, **原图来源** fields
- If a section was "无" and new content is found, replace "无" with the content
- Each tool recommendation must include the `**原图来源**` field. If the image was split, link to the specific sub-image where the recommendation was found: `![截图](./<image_stem>/part_NNN.png)`. If the image was not split (only 1 part), link to the original image: `![截图](./<original_image_filename>)`
- Do not duplicate entries already captured from previous sub-images
- Preserve all previously captured content

### Output Format Reference

See [references/output_format.md](references/output_format.md) for the complete output format template and detailed formatting requirements.

Key format rules:
- **推荐人**/**分享人**: exact speaker name/nickname from screenshot
- **时间**: extract from WeChat message timestamps in screenshot, format `YYYY-MM-DD HH:MM`
- **用途**: what the tool does and its use case
- **网址**: official URL (search if not provided in chat)
- **原图来源**: if split, `![截图](./<image_stem>/part_NNN.png)`; if not split, `![截图](./<original_image_filename>)`
- AI experience entries use same numbered format: **分享人**, **时间**, **经验**, **原图来源**
- Write in Chinese, stay objective, skip off-topic chatter

### Step 5: Finalize

After all sub-images are processed, read the complete output file to verify:
- All tool entries are numbered sequentially
- All entries have complete information (name, recommender, purpose, URL)
- No duplicate entries
- Sections with no content say "无"

Report the output file path to the user.
