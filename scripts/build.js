#!/usr/bin/env node
/**
 * Anveshana.net — lightweight CMS build script.
 *
 * Reads Markdown files from /content/articles, and produces:
 *   - dist/index.html          (homepage, latest articles injected)
 *   - dist/articles/<slug>.html (one page per article)
 *   - dist/sitemap.xml          (auto-generated from actual content)
 *   - dist/robots.txt
 *   - dist/assets/*             (shared CSS/JS, copied as-is)
 *
 * Usage:
 *   npm run build
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "articles");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const ASSETS_DIR = path.join(ROOT, "assets");
const DIST_DIR = path.join(ROOT, "dist");

const SITE_URL = "https://www.anveshana.net";
const HOMEPAGE_ARTICLE_COUNT = 2; // how many articles show as cards on the homepage

// ---------- helpers ----------

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function jsonEscape(str) {
  // Returns the JSON-escaped inner content of a string, without the surrounding quotes
  return JSON.stringify(str || "").slice(1, -1);
}

function formatDateDisplay(dateObj) {
  return dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ---------- load content ----------

function loadArticles() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn("No content/articles directory found — nothing to build.");
    return [];
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  const articles = files.map((filename) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf8");
    const { data, content } = matter(raw);

    if (!data.title) throw new Error(`Article ${filename} is missing a "title" in its frontmatter.`);

    const slug = data.slug || filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const date = data.date ? new Date(data.date) : new Date();

    return {
      title: data.title,
      slug,
      date,
      tag: data.tag || "AI",
      field: data.field || "Artificial Intelligence",
      readTime: data.readTime || 6,
      summary: data.summary || "",
      bodyHtml: marked.parse(content),
      url: `${SITE_URL}/articles/${slug}.html`,
    };
  });

  // Newest first
  articles.sort((a, b) => b.date - a.date);
  return articles;
}

// ---------- render pieces ----------

function renderArticleCard(article) {
  return `
      <section class="reveal">
        <article class="scholarly">
          <div class="article-head">
            <span class="article-tag">${article.tag}</span>
            <span class="article-meta">${article.readTime} min read</span>
          </div>
          <h2 class="article-title">${article.title}</h2>
          <div class="article-body">
            ${article.bodyHtml}
          </div>
          <div class="article-footer">
            <span>Field: ${article.field}</span>
            <a href="/articles/${article.slug}.html">Continue reading</a>
          </div>
        </article>
      </section>`;
}

function renderArticlesJsonLd(articles) {
  const graph = articles.slice(0, 10).map((a) => ({
    "@type": "Article",
    headline: a.title,
    description: a.summary,
    datePublished: a.date.toISOString(),
    articleSection: a.field,
    publisher: { "@type": "Organization", name: "Anveshana.net" },
    mainEntityOfPage: a.url,
  }));

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function renderHomepage(articles) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "home.template.html"), "utf8");

  const cardsHtml = articles
    .slice(0, HOMEPAGE_ARTICLE_COUNT)
    .map(renderArticleCard)
    .join("\n");

  return template
    .replace("<!--ARTICLES_HOME-->", cardsHtml)
    .replace("<!--ARTICLES_JSONLD-->", renderArticlesJsonLd(articles));
}

function renderArchiveItem(article) {
  return `      <a class="archive-item" href="/articles/${article.slug}.html">
        <div class="archive-item-top">
          <span class="archive-tag">${article.tag}</span>
          <span class="archive-date">${formatDateDisplay(article.date)}</span>
        </div>
        <h2>${article.title}</h2>
        <p>${article.summary}</p>
      </a>`;
}

function renderArchivePage(articles) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "archive.template.html"), "utf8");
  const itemsHtml = articles.map(renderArchiveItem).join("\n");

  return template
    .replace("{{ARTICLE_COUNT}}", articles.length)
    .replace("{{ARCHIVE_ITEMS}}", itemsHtml);
}

function renderArticlePage(article) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, "article.template.html"), "utf8");

  return template
    .replace(/{{TITLE_JSON}}/g, jsonEscape(article.title))
    .replace(/{{SUMMARY_JSON}}/g, jsonEscape(article.summary))
    .replace(/{{FIELD_JSON}}/g, jsonEscape(article.field))
    .replace(/{{TITLE}}/g, article.title)
    .replace(/{{SUMMARY}}/g, article.summary)
    .replace(/{{TAG}}/g, article.tag)
    .replace(/{{FIELD}}/g, article.field)
    .replace(/{{READ_TIME}}/g, article.readTime)
    .replace(/{{DATE_ISO}}/g, article.date.toISOString())
    .replace(/{{DATE_DISPLAY}}/g, formatDateDisplay(article.date))
    .replace(/{{CANONICAL}}/g, article.url)
    .replace(/{{BODY_HTML}}/g, article.bodyHtml);
}

function renderSitemap(articles) {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${SITE_URL}/archive.html`, changefreq: "daily", priority: "0.9" },
    ...articles.map((a) => ({
      loc: a.url,
      changefreq: "monthly",
      priority: "0.8",
      lastmod: a.date.toISOString().split("T")[0],
    })),
  ];

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ---------- build ----------

function build() {
  const articles = loadArticles();

  rimraf(DIST_DIR);
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, "articles"));
  ensureDir(path.join(DIST_DIR, "assets"));

  // Homepage
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), renderHomepage(articles));

  // Archive page (all articles)
  fs.writeFileSync(path.join(DIST_DIR, "archive.html"), renderArchivePage(articles));

  // Individual article pages
  for (const article of articles) {
    fs.writeFileSync(path.join(DIST_DIR, "articles", `${article.slug}.html`), renderArticlePage(article));
  }

  // Assets
  for (const file of fs.readdirSync(ASSETS_DIR)) {
    fs.copyFileSync(path.join(ASSETS_DIR, file), path.join(DIST_DIR, "assets", file));
  }

  // Sitemap + robots
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), renderSitemap(articles));
  fs.writeFileSync(
    path.join(DIST_DIR, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  console.log(`Built ${articles.length} article(s):`);
  articles.forEach((a) => console.log(`  - /articles/${a.slug}.html  (${formatDateDisplay(a.date)})`));
  console.log(`\nHomepage features the latest ${Math.min(HOMEPAGE_ARTICLE_COUNT, articles.length)} article(s).`);
  console.log(`Output written to: ${DIST_DIR}`);
}

build();
