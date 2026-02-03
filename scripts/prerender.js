#!/usr/bin/env node
/**
 * Post-build script: Generates bilingual dist/index.html (zh) and dist/en/index.html (en).
 * - Embeds zh/en data + member-projects as window globals (no fetch needed at runtime)
 * - Pre-renders tool cards into #content-grid (default tab state)
 * - Updates meta tags, OG tags, JSON-LD, and all static text per language
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const BASE_URL = 'https://ainotes.lambdaintheshell.com';

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

// --- i18n strings for prerender ---

const META_STRINGS = {
  zh: {
    htmlLang: 'zh-CN',
    title: '边角聊 AI 讨论组知识库 | AI 工具推荐与使用经验',
    metaDescription: (stats) => `边角聊 AI 讨论组知识库 - ${stats.tools} 个 AI 工具推荐，${stats.experiences} 条使用经验，${stats.people} 位社区成员共同贡献。`,
    ogTitle: '边角聊 AI 讨论组知识库 - AI 工具推荐与使用经验',
    ogDescription: '群友们共同整理的 AI 工具推荐与一线使用经验，社区成员共同贡献。',
    ogUrl: `${BASE_URL}/`,
    ogLocale: 'zh_CN',
    ogLocaleAlternate: 'en_US',
    ogSiteName: '边角聊 AI 讨论组知识库',
    twitterTitle: '边角聊 AI 讨论组知识库 - AI 工具推荐与使用经验',
    twitterDescription: 'AI 工具推荐与使用经验，社区成员共同整理。',
    jsonLdName: '边角聊 AI 讨论组知识库',
    jsonLdDescription: '社区成员分享的 AI 工具推荐与一线使用经验',
    keywords: 'AI工具,AI讨论组,边角聊,LeftoverTalk,Claude,ChatGPT,Cursor,AI编程,AI使用经验,AI工具推荐',
    canonical: `${BASE_URL}/`,
    heroTitle: '边角聊 AI 讨论组知识库',
    heroSubtitle: '群友们共同整理的 AI 工具推荐与一线使用经验。欢迎在推特关注和联系码农（',
    heroSubtitleEnd: '）申请加入讨论组。',
    footerText: '边角聊 AI 讨论组知识库',
    memberBadge: '群友作品',
    expandText: '展开全文',
    tabTools: '工具',
    tabExperiences: '经验',
    tabProjects: '群友项目',
    sortLabel: '时间顺序 ↓',
    sortTitle: '按时间排序',
    searchPlaceholder: '搜索分享、成员...',
    clearSearchAria: '清除搜索',
    emptyHeading: '没有找到结果',
    emptyDesc: '试试调整搜索关键词或筛选条件。',
    emptyClearBtn: '清除所有筛选',
    langToggleText: 'EN',
    langToggleAria: 'Switch to English',
    logoAlt: '边角聊 AI 讨论组知识库',
    itemListName: 'AI 工具推荐',
    itemListDescription: '边角聊 AI 讨论组知识库成员推荐的 AI 工具列表',
  },
  en: {
    htmlLang: 'en',
    title: 'LeftoverTalk AI Group Knowledge Base | AI Tool Recommendations & Experiences',
    metaDescription: (stats) => `LeftoverTalk AI Group Knowledge Base - ${stats.tools} AI tool recommendations, ${stats.experiences} first-hand experiences, contributed by ${stats.people} community members.`,
    ogTitle: 'LeftoverTalk AI Group Knowledge Base - AI Tool Recommendations & Experiences',
    ogDescription: 'AI tool recommendations and first-hand experiences curated by community members.',
    ogUrl: `${BASE_URL}/en/`,
    ogLocale: 'en_US',
    ogLocaleAlternate: 'zh_CN',
    ogSiteName: 'LeftoverTalk AI Group Knowledge Base',
    twitterTitle: 'LeftoverTalk AI Group Knowledge Base - AI Tool Recommendations & Experiences',
    twitterDescription: 'AI tool recommendations and experiences curated by community members.',
    jsonLdName: 'LeftoverTalk AI Group Knowledge Base',
    jsonLdDescription: 'AI tool recommendations and first-hand experiences shared by community members',
    keywords: 'AI tools,AI discussion group,LeftoverTalk,Claude,ChatGPT,Cursor,AI coding,AI experiences,AI tool recommendations',
    canonical: `${BASE_URL}/en/`,
    heroTitle: 'LeftoverTalk AI Group Knowledge Base',
    heroSubtitle: 'AI tool recommendations and first-hand experiences curated by group members. Follow and DM the admin on Twitter (',
    heroSubtitleEnd: ') to join the group.',
    footerText: 'LeftoverTalk AI Group Knowledge Base',
    memberBadge: 'Group Member Project',
    expandText: 'Show more',
    tabTools: 'Tools',
    tabExperiences: 'Experiences',
    tabProjects: 'Group Member Projects',
    sortLabel: 'Date ↓',
    sortTitle: 'Sort by date',
    searchPlaceholder: 'Search posts, group members...',
    clearSearchAria: 'Clear search',
    emptyHeading: 'No results found',
    emptyDesc: 'Try adjusting your search terms or filters.',
    emptyClearBtn: 'Clear all filters',
    langToggleText: '中',
    langToggleAria: '切换到中文',
    logoAlt: 'LeftoverTalk AI Group Knowledge Base',
    itemListName: 'AI Tool Recommendations',
    itemListDescription: 'AI tools recommended by LeftoverTalk AI Group Knowledge Base members',
  },
};

// --- Pre-render card HTML (matches main.js Tailwind classes) ---

function renderToolCard(item, memberProjectByName, strings) {
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
  const memberBadge = mp ? `<span class="text-xs font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">${escapeHTML(strings.memberBadge)}</span>` : '';
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

function renderExperienceCard(item, strings) {
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
        ${isLong ? `<button class="expand-btn text-xs text-cta font-medium mt-2 cursor-pointer hover:underline min-h-[28px]">${escapeHTML(strings.expandText)}</button>` : ''}
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

function generateItemListJsonLd(tools, strings) {
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
    name: strings.itemListName,
    description: strings.itemListDescription,
    numberOfItems: items.length,
    itemListElement: items,
  };
}

// --- Process a single language page ---

function processPage(html, lang, data, projects, stats, outputPath) {
  const strings = META_STRINGS[lang];
  const tools = data.tools || [];

  // Build member project lookup
  const memberProjectByName = {};
  projects.forEach(p => { memberProjectByName[p.toolName] = p; });

  // <html lang="...">
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${strings.htmlLang}">`);

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHTML(strings.title)}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHTML(strings.metaDescription(stats))}">`
  );

  // <link rel="canonical">
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${strings.canonical}">`
  );

  // <link rel="alternate" hreflang="en">
  html = html.replace(
    /<link rel="alternate" hreflang="en" href="[^"]*">/,
    `<link rel="alternate" hreflang="en" href="${BASE_URL}/en/">`
  );

  // og:title
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${escapeHTML(strings.ogTitle)}">`
  );

  // og:description
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${escapeHTML(strings.ogDescription)}">`
  );

  // og:url
  html = html.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${strings.ogUrl}">`
  );

  // og:locale
  html = html.replace(
    /<meta property="og:locale" content="[^"]*">/,
    `<meta property="og:locale" content="${strings.ogLocale}">`
  );

  // og:locale:alternate
  html = html.replace(
    /<meta property="og:locale:alternate" content="[^"]*">/,
    `<meta property="og:locale:alternate" content="${strings.ogLocaleAlternate}">`
  );

  // og:site_name
  html = html.replace(
    /<meta property="og:site_name" content="[^"]*">/,
    `<meta property="og:site_name" content="${escapeHTML(strings.ogSiteName)}">`
  );

  // twitter:title
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${escapeHTML(strings.twitterTitle)}">`
  );

  // twitter:description
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${escapeHTML(strings.twitterDescription)}">`
  );

  // keywords
  html = html.replace(
    /<meta name="keywords" content="[^"]*">/,
    `<meta name="keywords" content="${escapeHTML(strings.keywords)}">`
  );

  // WebSite JSON-LD (the first script type="application/ld+json" block)
  html = html.replace(
    /<script type="application\/ld\+json">\s*\{[^}]*"@type":\s*"WebSite"[\s\S]*?\}\s*<\/script>/,
    `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "${strings.jsonLdName}",
    "alternateName": "${lang === 'zh' ? 'LeftoverTalk AI Discussion Group Knowledge Base' : '边角聊 AI 讨论组知识库'}",
    "url": "${strings.canonical}",
    "description": "${strings.jsonLdDescription}",
    "inLanguage": ["zh-CN", "en"]
  }
  </script>`
  );

  // Hero <h1>
  html = html.replace(
    /(<h1 class="font-heading[^"]*">)[^<]*(<\/h1>)/,
    `$1${escapeHTML(strings.heroTitle)}$2`
  );

  // Hero subtitle <p> — preserve the Twitter link structure
  html = html.replace(
    /(<p class="text-muted text-base sm:text-lg">)[\s\S]*?(<a href="https:\/\/x\.com\/ZQInTheShell"[\s\S]*?<\/a>)[\s\S]*?(<\/p>)/,
    `$1${escapeHTML(strings.heroSubtitle)}$2${escapeHTML(strings.heroSubtitleEnd)}$3`
  );

  // Footer text
  html = html.replace(
    /(<footer[^>]*>[\s\S]*?<div class="max-w-5xl mx-auto text-center text-muted text-sm">)\s*[^<]*\s*(<\/div>)/,
    `$1\n      ${escapeHTML(strings.footerText)}\n    $2`
  );

  // Tab button text — Tools
  html = html.replace(
    /(id="tab-tools"[\s\S]*?<i data-lucide="wrench"[^>]*><\/i>)\s*\n\s*[^\n<]*/,
    `$1\n            ${escapeHTML(strings.tabTools)} `
  );

  // Tab button text — Experiences
  html = html.replace(
    /(id="tab-experiences"[\s\S]*?<i data-lucide="lightbulb"[^>]*><\/i>)\s*\n\s*[^\n<]*/,
    `$1\n            ${escapeHTML(strings.tabExperiences)} `
  );

  // Tab button text — Projects
  html = html.replace(
    /(id="tab-projects"[\s\S]*?<i data-lucide="users"[^>]*><\/i>)\s*\n\s*[^\n<]*/,
    `$1\n            ${escapeHTML(strings.tabProjects)} `
  );

  // Sort button label
  html = html.replace(
    /(<span id="sort-label">)[^<]*(<\/span>)/,
    `$1${escapeHTML(strings.sortLabel)}$2`
  );

  // Sort button title
  html = html.replace(
    /(id="sort-btn"[\s\S]*?)title="[^"]*"/,
    `$1title="${escapeHTML(strings.sortTitle)}"`
  );

  // Search placeholder
  html = html.replace(
    /(id="search-input"[\s\S]*?)placeholder="[^"]*"/,
    `$1placeholder="${escapeHTML(strings.searchPlaceholder)}"`
  );

  // Clear search aria-label
  html = html.replace(
    /(id="search-clear"[\s\S]*?)aria-label="[^"]*"/,
    `$1aria-label="${escapeHTML(strings.clearSearchAria)}"`
  );

  // Empty state heading
  html = html.replace(
    /(id="empty-state"[\s\S]*?<h3[^>]*>)[^<]*(<\/h3>)/,
    `$1${escapeHTML(strings.emptyHeading)}$2`
  );

  // Empty state description
  html = html.replace(
    /(id="empty-state"[\s\S]*?<p class="text-muted text-sm[^"]*">)[^<]*(<\/p>)/,
    `$1${escapeHTML(strings.emptyDesc)}$2`
  );

  // Empty state clear button
  html = html.replace(
    /(id="clear-all-btn"[^>]*>)[^<]*(<\/button>)/,
    `$1${escapeHTML(strings.emptyClearBtn)}$2`
  );

  // Language toggle button text and aria-label
  html = html.replace(
    /(id="lang-toggle"[^>]*?)aria-label="[^"]*"([^>]*>)[^<]*(<\/button>)/,
    `$1aria-label="${escapeHTML(strings.langToggleAria)}"$2${escapeHTML(strings.langToggleText)}$3`
  );

  // Logo alt text
  html = html.replace(
    /(<img src="\/logo-32\.png" alt=")[^"]*(")/,
    `$1${escapeHTML(strings.logoAlt)}$2`
  );

  // Pre-render tool cards into #content-grid
  const sortedTools = sortByDateDesc(tools);
  const preRenderedCards = sortedTools.map(t => renderToolCard(t, memberProjectByName, strings)).join('\n');
  html = html.replace(
    /(<div id="content-grid"[^>]*>)([\s\S]*?)(<\/div>)/,
    `$1\n${preRenderedCards}\n$3`
  );

  // Inject ItemList JSON-LD before </head>
  const itemListJsonLd = JSON.stringify(generateItemListJsonLd(tools, strings));
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${itemListJsonLd}</script>\n</head>`
  );

  writeFileSync(outputPath, html, 'utf-8');
  return sortedTools.length;
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

  // Compute stats (shared across both languages)
  const people = new Set();
  const toolsZh = dataZh.tools || [];
  const experiencesZh = dataZh.experiences || [];
  toolsZh.forEach(t => (t.recommenders || []).forEach(r => people.add(r)));
  experiencesZh.forEach(e => (e.sharers || []).forEach(s => people.add(s)));
  const stats = {
    tools: toolsZh.length,
    experiences: experiencesZh.length,
    people: people.size,
  };

  // Inject inline data as window globals before </head> (shared by both versions)
  const inlineDataScript = `<script>
window.__DATA_ZH__=${JSON.stringify(dataZh)};
window.__DATA_EN__=${JSON.stringify(dataEn)};
window.__PROJECTS_ZH__=${JSON.stringify(projectsZh)};
window.__PROJECTS_EN__=${JSON.stringify(projectsEn)};
</script>`;

  html = html.replace('</head>', `${inlineDataScript}\n</head>`);

  // Process Chinese version (write to dist/index.html)
  const zhCount = processPage(html, 'zh', dataZh, projectsZh, stats, htmlPath);
  console.log(`[zh] Generated dist/index.html with ${zhCount} pre-rendered tool cards`);

  // Process English version (write to dist/en/index.html)
  const enDir = resolve(DIST, 'en');
  mkdirSync(enDir, { recursive: true });
  const enCount = processPage(html, 'en', dataEn, projectsEn, stats, resolve(enDir, 'index.html'));
  console.log(`[en] Generated dist/en/index.html with ${enCount} pre-rendered tool cards`);

  console.log(`Injected inline data (zh/en) and ${projectsZh.length + projectsEn.length} member projects`);
  console.log(`Stats: ${stats.tools} tools, ${stats.experiences} experiences, ${stats.people} people`);
}

main();
