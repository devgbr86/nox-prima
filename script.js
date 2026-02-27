const hero = document.getElementById('hero');
const articleContainer = document.getElementById('article-container');
const articleContent = document.getElementById('article-content');
const navBtns = document.querySelectorAll('.nav-btn');

let currentArticle = null;

navBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const name = btn.dataset.article;
    if (name === currentArticle) return;

    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    loadArticle(name);
  });
});

async function loadArticle(name) {
  currentArticle = name;

  // Hide hero
  hero.classList.add('hidden');

  // Fade out article if visible
  articleContainer.classList.remove('shown');

  try {
    const res = await fetch(`articles/${name}.md`);
    if (!res.ok) throw new Error('not found');
    const md = await res.text();
    const html = marked.parse(md);

    // Short delay for transition
    setTimeout(() => {
      articleContent.innerHTML = html;
      articleContainer.classList.add('visible');
      // Force reflow
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