#!/usr/bin/env node
/**
 * Post-build script: Injects pre-rendered content into dist/index.html
 * for SEO. Crawlers that don't execute JS will see static article HTML.
 * When JS loads, renderContent() replaces it with the interactive version.
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

function renderToolArticle(item) {
  const recommenders = (item.recommenders || [])
    .map(r => `<span>${escapeHTML(r)}</span>`)
    .join(', ');
  const urls = (item.urls || [])
    .map(u => `<a href="${escapeHTML(u)}" rel="noopener noreferrer">${escapeHTML(extractDomain(u))}</a>`)
    .join(' ');

  return `<article>
<h3>${escapeHTML(item.name)}</h3>
<p>${escapeHTML(item.description || '')}</p>
<div>${recommenders}</div>
${item.date ? `<time>${escapeHTML(item.date)}</time>` : ''}
${urls ? `<div>${urls}</div>` : ''}
</article>`;
}

function renderExperienceArticle(item) {
  const sharers = (item.sharers || [])
    .map(s => `<span>${escapeHTML(s)}</span>`)
    .join(', ');

  return `<article>
<h3>${escapeHTML(item.name)}</h3>
<p>${escapeHTML(item.content || '')}</p>
<div>${sharers}</div>
${item.date ? `<time>${escapeHTML(item.date)}</time>` : ''}
</article>`;
}

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
    description: '边角聊 AI 讨论组成员推荐的 AI 工具列表',
    numberOfItems: items.length,
    itemListElement: items,
  };
}

function main() {
  const htmlPath = resolve(DIST, 'index.html');
  const dataPath = resolve(DIST, 'data.json');

  let html;
  try {
    html = readFileSync(htmlPath, 'utf-8');
  } catch (e) {
    console.error('Could not read dist/index.html. Did you run `vite build` first?');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  } catch (e) {
    console.error('Could not read dist/data.json.');
    process.exit(1);
  }

  const tools = data.tools || [];
  const experiences = data.experiences || [];

  // Compute stats
  const people = new Set();
  tools.forEach(t => (t.recommenders || []).forEach(r => people.add(r)));
  experiences.forEach(e => (e.sharers || []).forEach(s => people.add(s)));
  const numTools = tools.length;
  const numExp = experiences.length;
  const numPeople = people.size;

  // Generate pre-rendered HTML for tools (default tab)
  const toolsHTML = tools.map(renderToolArticle).join('\n');
  const experiencesHTML = experiences.map(renderExperienceArticle).join('\n');

  // The pre-rendered content goes inside #content-grid
  // JS will replace it via innerHTML when it loads
  const preRendered = `<!-- PRE-RENDERED-SEO-START -->
<noscript>
<style>#content-grid .seo-content { display: block; }</style>
</noscript>
<div class="seo-content" style="display:none">
<section>
<h2>AI 工具推荐 (${numTools})</h2>
${toolsHTML}
</section>
<section>
<h2>AI 使用经验 (${numExp})</h2>
${experiencesHTML}
</section>
</div>
<!-- PRE-RENDERED-SEO-END -->`;

  // Inject into content-grid
  html = html.replace(
    /(<div id="content-grid"[^>]*>)([\s\S]*?)(<\/div>)/,
    (match, open, inner, close) => {
      // Keep the original inner content (the "Populated by JS" comment)
      return `${open}${inner}${preRendered}\n${close}`;
    }
  );

  // Add ItemList JSON-LD
  const itemListJsonLd = JSON.stringify(generateItemListJsonLd(tools));
  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${itemListJsonLd}</script>\n</head>`
  );

  // Update meta description with stats
  const statsDesc = `边角聊 AI 讨论组 - ${numTools} 个 AI 工具推荐，${numExp} 条使用经验，${numPeople} 位社区成员共同贡献。`;
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHTML(statsDesc)}">`
  );

  writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Pre-rendered ${numTools} tools and ${numExp} experiences into dist/index.html`);
  console.log(`Updated meta description: ${statsDesc}`);
  console.log(`Added ItemList JSON-LD with ${numTools} items`);
}

main();
