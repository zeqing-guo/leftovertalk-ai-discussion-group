import './style.css';
import { createIcons, icons } from 'lucide';

(function() {
  'use strict';

  // Make lucide available globally for re-renders
  window.lucide = { createIcons: (opts) => createIcons({ icons, ...opts }) };

  // --- i18n ---
  const UI_STRINGS = {
    htmlLang:        { zh: 'zh-CN', en: 'en' },
    metaDescription: { zh: '边角聊 AI 讨论组 - 社区成员分享的 AI 工具与经验', en: 'LeftoverTalk AI Discussion Group - AI tools and experiences shared by community members' },
    pageTitle:       { zh: '边角聊 AI 讨论组', en: 'LeftoverTalk AI Group' },
    logoAlt:         { zh: '边角聊 AI 讨论组', en: 'LeftoverTalk AI Group' },
    searchPlaceholder: { zh: '搜索分享、成员...', en: 'Search posts, group members...' },
    clearSearchAria: { zh: '清除搜索', en: 'Clear search' },
    heroTitle:       { zh: '边角聊 AI 讨论组', en: 'LeftoverTalk AI Group' },
    heroSubtitle:    { zh: '群友们共同整理的 AI 工具推荐与一线使用经验。欢迎在推特关注和联系码农（', en: 'AI tool recommendations and first-hand experiences curated by group members. Follow and DM the admin on Twitter (' },
    heroSubtitleEnd: { zh: '）申请加入讨论组。', en: ') to join the group.' },
    tabTools:        { zh: '工具', en: 'Tools' },
    tabExperiences:  { zh: '经验', en: 'Experiences' },
    tabProjects:     { zh: '群友项目', en: 'Group Member Projects' },
    sortDescLabel:   { zh: '时间顺序 ↓', en: 'Date ↓' },
    sortAscLabel:    { zh: '时间顺序 ↑', en: 'Date ↑' },
    sortDescTitle:   { zh: '当前：从新到旧', en: 'Current: newest first' },
    sortAscTitle:    { zh: '当前：从旧到新', en: 'Current: oldest first' },
    sortTitle:       { zh: '按时间排序', en: 'Sort by date' },
    emptyHeading:    { zh: '没有找到结果', en: 'No results found' },
    emptyDesc:       { zh: '试试调整搜索关键词或筛选条件。', en: 'Try adjusting your search terms or filters.' },
    emptyClearBtn:   { zh: '清除所有筛选', en: 'Clear all filters' },
    footerText:      { zh: '边角聊 AI 讨论组 &middot; 社区知识库', en: 'LeftoverTalk AI Group &middot; Community Knowledge Base' },
    memberBadge:     { zh: '群友作品', en: 'Group Member Project' },
    expandText:      { zh: '展开全文', en: 'Show more' },
    collapseText:    { zh: '收起', en: 'Show less' },
    loadError:       { zh: '数据加载失败，请通过本地 HTTP 服务器访问此页面。', en: 'Failed to load data. Please access this page via a local HTTP server.' },
  };

  function t(key) {
    const entry = UI_STRINGS[key];
    if (!entry) return key;
    return entry[state.lang] || entry.zh;
  }

  // --- State ---
  const urlParams = new URLSearchParams(window.location.search);
  const initLang = urlParams.get('lang') === 'en' ? 'en'
                 : localStorage.getItem('lang') === 'en' ? 'en'
                 : 'zh';

  const state = {
    data: null,
    projects: null,
    activeTab: 'tools',
    searchQuery: '',
    selectedPerson: null,
    sortOrder: 'desc',
    lang: initLang,
  };

  // --- DOM refs ---
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const tabTools = document.getElementById('tab-tools');
  const tabExperiences = document.getElementById('tab-experiences');
  const tabProjects = document.getElementById('tab-projects');
  const tabToolsCount = document.getElementById('tab-tools-count');
  const tabExperiencesCount = document.getElementById('tab-experiences-count');
  const tabProjectsCount = document.getElementById('tab-projects-count');
  const contentGrid = document.getElementById('content-grid');
  const emptyState = document.getElementById('empty-state');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const sortBtn = document.getElementById('sort-btn');
  const sortLabel = document.getElementById('sort-label');
  const langToggle = document.getElementById('lang-toggle');

  // --- i18n: apply language to static DOM ---
  function applyLanguage() {
    document.documentElement.lang = t('htmlLang');
    document.title = t('pageTitle');
    document.querySelector('meta[name="description"]').content = t('metaDescription');
    document.querySelector('#site-header img[alt]').alt = t('logoAlt');
    searchInput.placeholder = t('searchPlaceholder');
    searchClear.setAttribute('aria-label', t('clearSearchAria'));

    // Hero
    document.querySelector('main h1').textContent = t('heroTitle');
    const heroParagraph = document.querySelector('main section p.text-muted');
    if (heroParagraph) {
      heroParagraph.innerHTML = t('heroSubtitle') + '<a href="https://x.com/ZQInTheShell" target="_blank" rel="noopener">@ZQInTheShell <i data-lucide="external-link" class="w-3 h-3 inline" style="vertical-align: -0.05em;"></i></a>' + t('heroSubtitleEnd');
    }

    // Tab labels - update text nodes only, preserving icons and count spans
    updateTabText(tabTools, t('tabTools'));
    updateTabText(tabExperiences, t('tabExperiences'));
    updateTabText(tabProjects, t('tabProjects'));

    // Sort button
    sortBtn.title = t('sortTitle');

    // Empty state
    document.querySelector('#empty-state h3').textContent = t('emptyHeading');
    document.querySelector('#empty-state p').textContent = t('emptyDesc');
    clearAllBtn.textContent = t('emptyClearBtn');

    // Footer
    document.querySelector('footer div').innerHTML = t('footerText');

    // Toggle button text
    langToggle.textContent = state.lang === 'zh' ? 'EN' : '中';
    langToggle.setAttribute('aria-label', state.lang === 'zh' ? 'Switch to English' : '切换到中文');

    createIcons({ icons });
  }

  function updateTabText(tabEl, text) {
    // The tab structure is: <i> textNode <span>
    // Find and update the text node between icon and count span
    const nodes = tabEl.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === Node.TEXT_NODE && nodes[i].textContent.trim()) {
        nodes[i].textContent = '\n            ' + text + ' ';
        return;
      }
    }
  }

  // --- Utilities ---
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlightText(text, query) {
    if (!query) return escapeHTML(text);
    const escaped = escapeHTML(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(' + escapedQuery + ')', 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
  }

  function extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  function debounce(fn, ms) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const EN_MONTHS = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };

  function parseDate(dateStr) {
    if (!dateStr) return 0;
    // Chinese format: "1月13日"
    const zhMatch = dateStr.match(/(\d+)月(\d+)日/);
    if (zhMatch) return parseInt(zhMatch[1]) * 100 + parseInt(zhMatch[2]);
    // English format: "Jan 13"
    const enMatch = dateStr.match(/^([A-Z][a-z]{2})\s+(\d+)/);
    if (enMatch) return (EN_MONTHS[enMatch[1]] || 0) * 100 + parseInt(enMatch[2]);
    return 0;
  }

  function sortByDate(items) {
    const sorted = items.slice().sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      return state.sortOrder === 'asc' ? da - db : db - da;
    });
    return sorted;
  }

  // --- Filtering ---
  function filterItems(items, type) {
    const q = state.searchQuery.toLowerCase();
    const person = state.selectedPerson;
    return items.filter(item => {
      if (person) {
        const people = type === 'tools' ? item.recommenders : item.sharers;
        if (!people || !people.includes(person)) return false;
      }
      if (q) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || item.content || '').toLowerCase();
        const people = (type === 'tools' ? item.recommenders : item.sharers) || [];
        const peopleStr = people.join(' ').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !peopleStr.includes(q)) return false;
      }
      return true;
    });
  }

  function filterProjects(items) {
    const q = state.searchQuery.toLowerCase();
    const person = state.selectedPerson;
    return items.filter(item => {
      if (person) {
        if (item.author !== person) return false;
      }
      if (q) {
        const name = (item.toolName || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const author = (item.author || '').toLowerCase();
        const perk = (item.perk || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !author.includes(q) && !perk.includes(q)) return false;
      }
      return true;
    });
  }

  // --- Render ---
  function renderTabs(filteredTools, filteredExperiences, filteredProjects) {
    const active = state.activeTab;
    const baseClass = 'tab-btn flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium cursor-pointer border-b-[3px] min-h-[44px]';
    const activeClass = 'border-cta text-cta';
    const inactiveClass = 'border-transparent text-muted hover:text-text';

    tabTools.className = `${baseClass} ${active === 'tools' ? activeClass : inactiveClass}`;
    tabTools.setAttribute('aria-selected', active === 'tools');
    tabExperiences.className = `${baseClass} ${active === 'experiences' ? activeClass : inactiveClass}`;
    tabExperiences.setAttribute('aria-selected', active === 'experiences');
    tabProjects.className = `${baseClass} ${active === 'projects' ? activeClass : inactiveClass}`;
    tabProjects.setAttribute('aria-selected', active === 'projects');

    const activeCountClass = 'text-xs px-1.5 py-0.5 rounded-full bg-cta/10 text-cta';
    const inactiveCountClass = 'text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-muted';

    tabToolsCount.textContent = filteredTools.length;
    tabToolsCount.className = active === 'tools' ? activeCountClass : inactiveCountClass;
    tabExperiencesCount.textContent = filteredExperiences.length;
    tabExperiencesCount.className = active === 'experiences' ? activeCountClass : inactiveCountClass;
    tabProjectsCount.textContent = filteredProjects.length;
    tabProjectsCount.className = active === 'projects' ? activeCountClass : inactiveCountClass;
  }

  function renderToolCard(item) {
    const q = state.searchQuery;
    const name = highlightText(item.name, q);
    const desc = highlightText(item.description || '', q);
    const recommenders = (item.recommenders || []).map(r =>
      `<button data-person="${escapeHTML(r)}" class="inline-person-chip px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${state.selectedPerson === r ? 'bg-cta text-white' : 'bg-blue-50 text-cta hover:bg-blue-100'}">${highlightText(r, q)}</button>`
    ).join('');
    const urls = (item.urls || []).map(u =>
      `<a href="${escapeHTML(u)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-cta hover:underline min-h-[28px]"><i data-lucide="external-link" class="w-3 h-3"></i>${escapeHTML(extractDomain(u))}</a>`
    ).join(' ');

    const lookupName = item.nameZh || item.name;
    const mp = state.memberProjectByName && state.memberProjectByName[lookupName];
    const memberBadge = mp ? `<span class="text-xs font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">${escapeHTML(t('memberBadge'))}</span>` : '';
    const perkHTML = mp && mp.perk ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3"><i data-lucide="gift" class="w-4 h-4 text-amber-600 flex-shrink-0"></i><span class="text-xs text-amber-800">${highlightText(mp.perk, q)}</span></div>` : '';

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
    const q = state.searchQuery;
    const name = highlightText(item.name, q);
    const content = item.content || '';
    const isLong = content.length > 150;
    const contentHTML = highlightText(content, q);
    const sharers = (item.sharers || []).map(s =>
      `<button data-person="${escapeHTML(s)}" class="inline-person-chip px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${state.selectedPerson === s ? 'bg-cta text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}">${highlightText(s, q)}</button>`
    ).join('');

    return `<article class="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-heading text-sm font-semibold leading-snug">${name}</h3>
        <span class="text-xs text-muted whitespace-nowrap flex-shrink-0">${escapeHTML(item.date || '')}</span>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-3">${sharers}</div>
      <div class="exp-content-wrapper">
        <p class="exp-content text-sm text-muted leading-relaxed ${isLong ? 'line-clamp-3' : ''}">${contentHTML}</p>
        ${isLong ? `<button class="expand-btn text-xs text-cta font-medium mt-2 cursor-pointer hover:underline min-h-[28px]">${escapeHTML(t('expandText'))}</button>` : ''}
      </div>
    </article>`;
  }

  function renderProjectCard(item) {
    const q = state.searchQuery;
    const name = highlightText(item.toolName, q);
    const desc = highlightText(item.description || '', q);
    const authorChip = `<button data-person="${escapeHTML(item.author)}" class="inline-person-chip px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${state.selectedPerson === item.author ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}">${highlightText(item.author, q)}</button>`;
    const perkHTML = item.perk ? `<div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3"><i data-lucide="gift" class="w-4 h-4 text-amber-600 flex-shrink-0"></i><span class="text-xs text-amber-800">${highlightText(item.perk, q)}</span></div>` : '';
    const urlHTML = item.url ? `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-cta hover:underline min-h-[28px]"><i data-lucide="external-link" class="w-3 h-3"></i>${escapeHTML(extractDomain(item.url))}</a>` : '';

    return `<article class="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-heading text-sm font-semibold leading-snug">${name}</h3>
        <span class="text-xs font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">${escapeHTML(t('memberBadge'))}</span>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-3">${authorChip}</div>
      <p class="text-sm text-muted leading-relaxed mb-3">${desc}</p>
      ${urlHTML ? `<div class="flex flex-wrap gap-3">${urlHTML}</div>` : ''}
      ${perkHTML}
    </article>`;
  }

  function renderContent() {
    if (!state.data) return;

    const filteredTools = filterItems(state.data.tools || [], 'tools');
    const filteredExperiences = filterItems(state.data.experiences || [], 'experiences');
    const filteredProjects = filterProjects(state.projects || []);

    renderTabs(filteredTools, filteredExperiences, filteredProjects);

    // Update sort button visibility
    if (state.activeTab === 'projects') {
      sortBtn.classList.add('hidden');
    } else {
      sortBtn.classList.remove('hidden');
      if (state.sortOrder === 'asc') {
        sortLabel.textContent = t('sortAscLabel');
        sortBtn.title = t('sortAscTitle');
      } else {
        sortLabel.textContent = t('sortDescLabel');
        sortBtn.title = t('sortDescTitle');
      }
      createIcons({ icons, nodes: [sortBtn] });
    }

    let items;
    if (state.activeTab === 'tools') items = sortByDate(filteredTools);
    else if (state.activeTab === 'experiences') items = sortByDate(filteredExperiences);
    else items = filteredProjects;

    if (items.length === 0) {
      contentGrid.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      contentGrid.classList.remove('hidden');
      emptyState.classList.add('hidden');

      if (state.activeTab === 'tools') {
        contentGrid.innerHTML = items.map(renderToolCard).join('');
      } else if (state.activeTab === 'experiences') {
        contentGrid.innerHTML = items.map(renderExperienceCard).join('');
      } else {
        contentGrid.innerHTML = items.map(renderProjectCard).join('');
      }

      // Attach inline person chip clicks
      contentGrid.querySelectorAll('.inline-person-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.person;
          if (state.selectedPerson === p) {
            state.selectedPerson = null;
          } else {
            state.selectedPerson = p;
          }
          renderContent();
        });
      });

      // Attach expand/collapse for experiences
      contentGrid.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wrapper = btn.closest('.exp-content-wrapper');
          const contentEl = wrapper.querySelector('.exp-content');
          const isExpanded = !contentEl.classList.contains('line-clamp-3');
          if (isExpanded) {
            contentEl.classList.add('line-clamp-3');
            btn.textContent = t('expandText');
          } else {
            contentEl.classList.remove('line-clamp-3');
            btn.textContent = t('collapseText');
          }
        });
      });
    }

    // Re-init Lucide icons for newly rendered content
    createIcons({ icons });
  }

  // --- Data Loading ---
  function loadData() {
    const dataFile = state.lang === 'en' ? './data-en.json' : './data.json';
    const projectsFile = state.lang === 'en' ? './member-projects-en.json' : './member-projects.json';

    return Promise.all([
      fetch(dataFile).then(r => r.json()),
      fetch(projectsFile).then(r => r.json()),
    ])
      .then(([data, projects]) => {
        state.data = data;
        const toolByName = {};
        (data.tools || []).forEach(t => {
          toolByName[t.name] = t;
          // Also index by nameZh for cross-language member-projects matching
          if (t.nameZh) toolByName[t.nameZh] = t;
        });
        state.memberProjectNames = new Set(projects.map(p => p.toolName));
        state.memberProjectByName = {};
        projects.forEach(p => { state.memberProjectByName[p.toolName] = p; });
        state.projects = projects.map(p => {
          const tool = toolByName[p.toolName];
          return { ...p, description: tool ? tool.description : '' };
        });
        renderContent();
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        contentGrid.innerHTML = `<p class="text-muted text-sm col-span-2 text-center py-8">${escapeHTML(t('loadError'))}</p>`;
      });
  }

  // --- Events ---
  const debouncedSearch = debounce(() => {
    state.searchQuery = searchInput.value.trim();
    searchClear.classList.toggle('hidden', !state.searchQuery);
    renderContent();
  }, 250);

  searchInput.addEventListener('input', debouncedSearch);

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.classList.add('hidden');
    renderContent();
    searchInput.focus();
  });

  tabTools.addEventListener('click', () => {
    if (state.activeTab === 'tools') return;
    state.activeTab = 'tools';
    renderContent();
  });

  tabExperiences.addEventListener('click', () => {
    if (state.activeTab === 'experiences') return;
    state.activeTab = 'experiences';
    renderContent();
  });

  tabProjects.addEventListener('click', () => {
    if (state.activeTab === 'projects') return;
    state.activeTab = 'projects';
    renderContent();
  });

  sortBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
    renderContent();
  });

  clearAllBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    state.selectedPerson = null;
    state.sortOrder = 'desc';
    searchClear.classList.add('hidden');
    renderContent();
  });

  langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', state.lang);
    applyLanguage();
    loadData();
  });

  // Shadow on header scroll
  window.addEventListener('scroll', () => {
    const header = document.getElementById('site-header');
    if (window.scrollY > 10) {
      header.classList.add('shadow-sm');
    } else {
      header.classList.remove('shadow-sm');
    }
  });

  // --- Init ---
  applyLanguage();
  loadData();

  // Init Lucide icons
  createIcons({ icons });
})();
