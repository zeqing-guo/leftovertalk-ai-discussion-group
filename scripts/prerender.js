#!/usr/bin/env node
/**
 * Post-build script: Injects inline data and pre-rendered HTML into dist/index.html.
 * - Embeds zh/en data + member-projects as window globals (no fetch needed at runtime)
 * - Pre-renders Chinese tool cards into #content-grid (default tab state)
 * - Updates meta description with stats and injects ItemList JSON-LD
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// --- Pre-render card HTML (matches main.js Tailwind classes) ---

function renderToolCard(item, memberProjectByName) {
  const name = escapeHTML(item.name);
  const desc = escapeHTML(item.description || '');
  const recommenders = (item.recommenders || []).map(r =>
    `<button data-person="${escapeHTML(r)}" class="inline-person-chip px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors bg-blue-50 text-cta hover:bg-blue-100">${escapeHTML(r)}</button>`
  ).join('');
  const urls = (item.urls || []).map(u =>
    `<a href="${escapeHTML(u)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-cta hover:underline min-h-[28px]"><i data-lucide="external-link" class="w-3 h-3"></i>${escapeHTML(extractDomain(u))}</a>`
  ).join(' ');

  const lookupName = item.nameZh || item.name;
  const mp = memberProjectByName[lookupName];
  const memberBadge = mp ? `<span class="text-xs font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">群友作品</span>` : '';
  const perkHTML = mp && mp.perk ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3"><i data-lucide="gift" class="w-4 h-4 text-amber-600 flex-shrink-0"></i><span class="text-xs text-amber-800">${escapeHTML(mp.perk)}</span></div>` : '';

  return `<article class="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow relative">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-heading text-sm font-semibold leading-snug">${name}</h3>
        <div class="flex items-center gap-2 flex-shrink-0">${memberBadge}<span class="text-xs text-muted whitespace-nowrap">${escapeHTML(item.date || '')}</span></div>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-3">${recommenders}</div>
      <p class="text-sm text-muted leading-relaxed mb-3">${desc}</p>
      ${urls ? `<div class="flex flex-wrap gap-3">${urls}</div>` : ''}
      ${perkHTML}
    </article>`;
}

function renderExperienceCard(item) {
  const name = escapeHTML(item.name);
  const content = item.content || '';
  const isLong = content.length > 150;
  const contentHTML = escapeHTML(content);
  const sharers = (item.sharers || []).map(s =>
    `<button data-person="${escapeHTML(s)}" class="inline-person-chip px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors bg-green-50 text-green-700 hover:bg-green-100">${escapeHTML(s)}</button>`
  ).join('');

  return `<article class="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-heading text-sm font-semibold leading-snug">${name}</h3>
        <span class="text-xs text-muted whitespace-nowrap flex-shrink-0">${escapeHTML(item.date || '')}</span>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-3">${sharers}</div>
      <div class="exp-content-wrapper">
        <p class="exp-content text-sm text-muted leading-relaxed ${isLong ? 'line-clamp-3' : ''}">${contentHTML}</p>
        ${isLong ? `<button class="expand-btn text-xs text-cta font-medium mt-2 cursor-pointer hover:underline min-h-[28px]">展开全文</button>` : ''}
      </div>
    </article>`;
}

// --- Sort tools by date (desc, matching main.js default) ---

function parseDate(dateStr) {
  if (!dateStr) return 0;
  const zhMatch = dateStr.match(/(\d+)月(\d+)日/);
  if (zhMatch) return parseInt(zhMatch[1]) * 100 + parseInt(zhMatch[2]);
  const EN_MONTHS = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  const enMatch = dateStr.match(/^([A-Z][a-z]{2})\s+(\d+)/);
  if (enMatch) return (EN_MONTHS[enMatch[1]] || 0) * 100 + parseInt(enMatch[2]);
  return 0;
}

function sortByDateDesc(items) {
  return items.slice().sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

// --- JSON-LD ---

function generateItemListJsonLd(tools) {
  const items = tools.map((tool, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: tool.name,
    description: tool.description || '',
    ...(tool.urls && tool.urls.length > 0 ? { url: tool.urls[0] } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI 工具推荐',
    description: '边角聊 AI 讨论组知识库成员推荐的 AI 工具列表',
    numberOfItems: items.length,
    itemListElement: items,
  };
}

// --- Main ---

function main() {
  const htmlPath = resolve(DIST, 'index.html');

  let html;
  try {
    html = readFileSync(htmlPath, 'utf-8');
  } catch (e) {
    console.error('Could not read dist/index.html. Did you run `vite build` first?');
    process.exit(1);
  }

  // Read all four data files
  const readJSON = (filename) => {
    try {
      return JSON.parse(readFileSync(resolve(DIST, filename), 'utf-8'));
    } catch (e) {
      console.error(`Could not read dist/${filename}.`);
      process.exit(1);
    }
  };

  const dataZh = readJSON('data.json');
  const dataEn = readJSON('data-en.json');
  const projectsZh = readJSON('member-projects.json');
  const projectsEn = readJSON('member-projects-en.json');

  const tools = dataZh.tools || [];
  const experiences = dataZh.experiences || [];

  // Compute stats
  const people = new Set();
  tools.forEach(t => (t.recommenders || []).forEach(r => people.add(r)));
  experiences.forEach(e => (e.sharers || []).forEach(s => people.add(s)));
  const numTools = tools.length;
  const numExp = experiences.length;
  const numPeople = people.size;

  // Build member project lookup for ZH
  const memberProjectByName = {};
  projectsZh.forEach(p => { memberProjectByName[p.toolName] = p; });

  // 1a. Inject inline data as window globals before </head>
  const inlineDataScript = `<script>
window.__DATA_ZH__=${JSON.stringify(dataZh)};
window.__DATA_EN__=${JSON.stringify(dataEn)};
window.__PROJECTS_ZH__=${JSON.stringify(projectsZh)};
window.__PROJECTS_EN__=${JSON.stringify(projectsEn)};
</script>`;

  html = html.replace('</head>', `${inlineDataScript}\n</head>`);

  // 1b. Pre-render Chinese tool cards (default state: tools tab, zh, desc sort)
  const sortedTools = sortByDateDesc(tools);
  const preRenderedCards = sortedTools.map(t => renderToolCard(t, memberProjectByName)).join('\n');

  html = html.replace(
    /(<div id="content-grid"[^>]*>)([\s\S]*?)(<\/div>)/,
    `$1\n${preRenderedCards}\n$3`
  );

  // 1c. Add ItemList JSON-LD
  const itemListJsonLd = JSON.stringify(generateItemListJsonLd(tools));
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${itemListJsonLd}</script>\n</head>`
  );

  // Update meta description with stats
  const statsDesc = `边角聊 AI 讨论组知识库 - ${numTools} 个 AI 工具推荐，${numExp} 条使用经验，${numPeople} 位社区成员共同贡献。`;
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHTML(statsDesc)}">`
  );

  writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Injected inline data (zh/en) and ${projectsZh.length + projectsEn.length} member projects`);
  console.log(`Pre-rendered ${sortedTools.length} tool cards into #content-grid`);
  console.log(`Updated meta description: ${statsDesc}`);
  console.log(`Added ItemList JSON-LD with ${numTools} items`);
}

main();
