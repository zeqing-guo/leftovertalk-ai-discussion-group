#!/usr/bin/env python3
"""
Extract tool recommendations and AI experience sharing from markdown files
in the AI-group-discussion directory. Outputs structured JSON.
"""

import os
import re
import json
import glob


def parse_date_from_filename(filename: str) -> str:
    """Extract date range from filename like 01-13-Recorder... or 01-16-01-21-Recorder..."""
    base = os.path.basename(filename)
    # Match patterns like "01-13-" or "01-16-01-21-"
    m = re.match(r'^(\d{2}-\d{2}(?:-\d{2}-\d{2})?)-Recorder', base)
    if m:
        date_part = m.group(1)
        # Convert to readable format: "01-13" -> "1月13日", "01-16-01-21" -> "1月16日-1月21日"
        parts = date_part.split('-')
        if len(parts) == 2:
            return f"{int(parts[0])}月{int(parts[1])}日"
        elif len(parts) == 4:
            return f"{int(parts[0])}月{int(parts[1])}日-{int(parts[2])}月{int(parts[3])}日"
    return ""


def parse_markdown(filepath: str) -> dict:
    """Parse a single markdown file and extract tools and experiences."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    date = parse_date_from_filename(filepath)
    tools = []
    experiences = []

    # Split by ## sections
    sections = re.split(r'^## ', content, flags=re.MULTILINE)

    for section in sections:
        if section.startswith('工具推荐'):
            tools = parse_entries(section, 'tool', date)
        elif section.startswith('AI 使用经验分享'):
            experiences = parse_entries(section, 'experience', date)

    return {'tools': tools, 'experiences': experiences}


def parse_entries(section: str, entry_type: str, date: str) -> list:
    """Parse individual entries from a section."""
    entries = []
    # Split by ### headings
    items = re.split(r'^### \d+[\.\s]+', section, flags=re.MULTILINE)

    for item in items[1:]:  # Skip the section header part
        lines = item.strip().split('\n')
        if not lines:
            continue

        name = lines[0].strip()
        entry = {'name': name, 'date': date}

        for line in lines[1:]:
            line = line.strip()
            if not line or line.startswith('- **原图来源'):
                continue

            if entry_type == 'tool':
                m = re.match(r'^- \*\*推荐人\*\*[：:]\s*(.+)', line)
                if m:
                    entry['recommenders'] = [r.strip() for r in re.split(r'[、,，]', m.group(1))]
                m = re.match(r'^- \*\*用途\*\*[：:]\s*(.+)', line)
                if m:
                    entry['description'] = m.group(1)
                m = re.match(r'^- \*\*网址\*\*[：:]\s*(.+)', line)
                if m:
                    # May have multiple URLs separated by " / "
                    urls = [u.strip() for u in m.group(1).split(' / ')]
                    entry['urls'] = urls
            else:
                m = re.match(r'^- \*\*分享人\*\*[：:]\s*(.+)', line)
                if m:
                    entry['sharers'] = [s.strip() for s in re.split(r'[、,，]', m.group(1))]
                m = re.match(r'^- \*\*经验\*\*[：:]\s*(.+)', line)
                if m:
                    entry['content'] = m.group(1)

        # Only add entries with sufficient data
        if entry_type == 'tool' and 'description' in entry:
            entries.append(entry)
        elif entry_type == 'experience' and 'content' in entry:
            entries.append(entry)

    return entries


def normalize_name(name: str) -> str:
    """Normalize person names by removing parenthetical annotations and emoji suffixes."""
    # Remove parenthetical annotations like （转发消息）, （介绍 Gus 的项目）
    name = re.sub(r'[（(][^）)]*[）)]', '', name).strip()
    # Remove trailing emoji like 🍊
    name = re.sub(r'[\U0001F300-\U0001FAFF]+$', '', name).strip()
    return name


def normalize_names(names: list) -> list:
    """Normalize and deduplicate a list of names."""
    result = []
    for name in names:
        # Split by 顿号, comma variants in case of compound entries
        parts = re.split(r'[、,，]', name)
        for part in parts:
            cleaned = normalize_name(part.strip())
            if cleaned and cleaned not in result:
                result.append(cleaned)
    return result


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    md_files = sorted(glob.glob(os.path.join(script_dir, '*.md')))

    all_tools = []
    all_experiences = []

    for md_file in md_files:
        result = parse_markdown(md_file)
        all_tools.extend(result['tools'])
        all_experiences.extend(result['experiences'])

    # Normalize all names
    for t in all_tools:
        if 'recommenders' in t:
            t['recommenders'] = normalize_names(t['recommenders'])
    for e in all_experiences:
        if 'sharers' in e:
            e['sharers'] = normalize_names(e['sharers'])

    # Collect all unique people
    all_people = set()
    for t in all_tools:
        all_people.update(t.get('recommenders', []))
    for e in all_experiences:
        all_people.update(e.get('sharers', []))

    output = {
        'tools': all_tools,
        'experiences': all_experiences,
        'people': sorted(all_people),
        'stats': {
            'total_tools': len(all_tools),
            'total_experiences': len(all_experiences),
            'total_people': len(all_people),
        }
    }

    output_path = os.path.join(script_dir, 'public', 'data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(all_tools)} tools and {len(all_experiences)} experiences")
    print(f"Found {len(all_people)} unique contributors")
    print(f"Output saved to {output_path}")


if __name__ == '__main__':
    main()
