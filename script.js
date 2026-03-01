const hero = document.getElementById('hero');
const articleContainer = document.getElementById('article-container');
const articleContent = document.getElementById('article-content');
const navBtns = document.querySelectorAll('.folder-item');

let currentArticle = null;

navBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const name = btn.dataset.article;
    if (name === currentArticle) return;

    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // clear search when opening article directly
    searchInput.value = '';
    searchResultsSection.classList.remove('visible');
    searchResultsInner.innerHTML = '';

    loadArticle(name);
  });
});

// ── Search ────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchResultsSection = document.getElementById('search-results-section');
const searchResultsInner = document.getElementById('search-results-inner');

const ARTICLES = [
  { key: '01_hierarquia',   label: 'Hierarquia'   },
  { key: '02_disciplina',   label: 'Disciplina'   },
  { key: '03_formacoes',    label: 'Formações'    },
  { key: '04_equipamentos', label: 'Equipamentos' },
  { key: '05_estrategia',   label: 'Estratégia'   },
  { key: '06_logistica',    label: 'Logística'    },
  { key: '07_campanhas',    label: 'Campanhas'    },
  { key: '08_reformas',     label: 'Reformas'     },
  { key: '09_glossario',    label: 'Glossário'    },
];

const articleCache = {};

async function fetchArticleText(key) {
  if (articleCache[key] !== undefined) return articleCache[key];
  try {
    const res = await fetch(`articles/${key}.md`);
    if (!res.ok) { articleCache[key] = null; return null; }
    const text = await res.text();
    articleCache[key] = text;
    return text;
  } catch {
    articleCache[key] = null;
    return null;
  }
}

function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getExcerpt(text, query, contextLen = 120) {
  const normText  = normalize(text);
  const normQuery = normalize(query);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return null;
  const start = Math.max(0, idx - contextLen / 2);
  const end   = Math.min(text.length, idx + query.length + contextLen / 2);
  let excerpt = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  const normExcerpt = normalize(excerpt);
  let result = '';
  let lastIndex = 0;
  let match;
  const re = new RegExp(normQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  while ((match = re.exec(normExcerpt)) !== null) {
    result += escHtml(excerpt.slice(lastIndex, match.index));
    result += `<mark>${escHtml(excerpt.slice(match.index, match.index + match[0].length))}</mark>`;
    lastIndex = match.index + match[0].length;
  }
  result += escHtml(excerpt.slice(lastIndex));
  return result;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let searchTimeout = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) {
    hideSearch();
    return;
  }
  searchTimeout = setTimeout(() => runSearch(q), 280);
});

function hideSearch() {
  searchResultsSection.classList.remove('visible');
  searchResultsInner.innerHTML = '';
  if (currentArticle) {
    articleContainer.classList.add('visible');
    articleContainer.classList.add('shown');
  } else {
    hero.classList.remove('hidden');
  }
}

async function runSearch(q) {
  // hide hero and article, show results — search bar is NOT affected (it's outside hero)
  hero.classList.add('hidden');
  articleContainer.classList.remove('shown');
  articleContainer.classList.remove('visible');
  navBtns.forEach(b => b.classList.remove('active'));
  currentArticle = null;

  searchResultsSection.classList.add('visible');
  searchResultsInner.innerHTML = `<p class="search-results-title">A pesquisar…</p>`;

  const results = [];

  await Promise.all(ARTICLES.map(async (art) => {
    const text = await fetchArticleText(art.key);
    if (!text) return;
    if (normalize(text).includes(normalize(q))) {
      const excerpt = getExcerpt(text, q);
      results.push({ art, excerpt });
    }
  }));

  results.sort((a, b) => ARTICLES.indexOf(a.art) - ARTICLES.indexOf(b.art));

  if (results.length === 0) {
    searchResultsInner.innerHTML = `
      <p class="search-results-title">Resultados para "${escHtml(q)}"</p>
      <p class="search-no-results">Nenhum artigo encontrado.</p>`;
    return;
  }

  let html = `<p class="search-results-title">Resultados para "${escHtml(q)}" — ${results.length} artigo(s)</p>`;
  for (const { art, excerpt } of results) {
    html += `
      <div class="search-result-card" data-key="${art.key}">
        <div class="search-result-article-name">${escHtml(art.label)}</div>
        ${excerpt ? `<div class="search-result-excerpt">${excerpt}</div>` : ''}
      </div>`;
  }
  searchResultsInner.innerHTML = html;

  searchResultsInner.querySelectorAll('.search-result-card').forEach(card => {
    card.addEventListener('click', () => {
      searchInput.value = '';
      searchResultsSection.classList.remove('visible');
      searchResultsInner.innerHTML = '';
      const key = card.dataset.key;
      const btn = [...navBtns].find(b => b.dataset.article === key);
      if (btn) {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      loadArticle(key);
    });
  });
}

async function loadArticle(name) {
  currentArticle = name;
  hero.classList.add('hidden');
  articleContainer.classList.remove('shown');

  try {
    const res = await fetch(`articles/${name}.md`);
    if (!res.ok) throw new Error('not found');
    const md   = await res.text();
    const html = marked.parse(md);

    setTimeout(() => {
      articleContent.innerHTML = html;
      articleContainer.classList.add('visible');
      void articleContainer.offsetWidth;
      articleContainer.classList.add('shown');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 220);

  } catch {
    articleContent.innerHTML = `<p style="text-align:center;color:var(--text-dim);margin-top:80px;">O artigo para <em>${name}</em> ainda não foi invocado.</p>`;
    articleContainer.classList.add('visible');
    void articleContainer.offsetWidth;
    articleContainer.classList.add('shown');
  }
}