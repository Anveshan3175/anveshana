# Anveshana.net — Content Pipeline

A lightweight, Markdown-based CMS for Anveshana.net. No database, no admin panel —
just Markdown files in Git. Add a file, run the build, push, and the live site updates
itself automatically.

## How it works

```
content/articles/*.md   →   npm run build   →   dist/  (deployable static site)
                                                    │
                              GitHub Actions picks this up on every push to main
                              and publishes dist/ to GitHub Pages automatically.
```

- **content/articles/** — one Markdown file per article. This is your entire CMS.
- **templates/** — the HTML shells (homepage + article page). You only touch these
  if you want to change the site's design, not to publish new content.
- **assets/** — shared CSS/JS used by every page.
- **scripts/build.js** — reads the Markdown, injects it into the templates, and
  writes the finished site into `dist/`.
- **.github/workflows/deploy.yml** — rebuilds and redeploys the site automatically
  whenever you push to `main`.

## Publishing a new article (this is the entire workflow)

1. Create a new file in `content/articles/`, named like `YYYY-MM-DD-your-slug.md`.
2. Add frontmatter + your article body in Markdown:

   ```markdown
   ---
   title: "Your Headline Here"
   slug: your-url-slug
   date: 2026-08-01
   tag: "Agentic AI"
   field: "Machine Reasoning & Autonomous Agents"
   readTime: 6
   summary: "One or two sentences — used for the meta description and previews."
   ---

   Your first paragraph goes here...

   Second paragraph...
   ```

3. Run the build locally to preview:

   ```bash
   npm install     # first time only
   npm run build
   ```

   Open `dist/index.html` in a browser to check it.

4. Commit and push:

   ```bash
   git add content/articles/2026-08-01-your-slug.md
   git commit -m "Add article: Your Headline Here"
   git push
   ```

That's it. GitHub Actions rebuilds the site and republishes it — no manual deploy
step, no FTP, no touching HTML.

## What the build script generates

- `dist/index.html` — homepage, automatically showing your **2 most recent**
  articles as cards (change `HOMEPAGE_ARTICLE_COUNT` in `scripts/build.js` to show
  more or fewer).
- `dist/articles/<slug>.html` — a full page for every article, ever, so old
  articles stay reachable and indexable.
- `dist/sitemap.xml` — regenerated on every build from the actual content, so
  Google always sees an accurate, current list of pages.
- `dist/robots.txt`
- Structured data (JSON-LD) on every page, generated from your frontmatter —
  no manual SEO tagging required per article.

## One-time setup to go live

1. Push this repository to GitHub.
2. In the repo settings → **Pages**, set the source to **GitHub Actions**.
3. Point your domain (`anveshana.net`) at GitHub Pages (CNAME/A records — GitHub's
   Pages docs cover this), or deploy `dist/` to Netlify/Vercel instead if you'd
   rather use one of those (both support "build command: `npm run build`,
   publish directory: `dist`" directly, no code changes needed).
4. Submit `https://www.anveshana.net/sitemap.xml` in Google Search Console once
   the domain is live, so new articles get discovered quickly.

## Why this helps SEO (and what it doesn't do)

- Every article gets its own indexable URL, a unique title/description, and
  Article structured data — this is what actually matters for search engines,
  far more than any homepage tag.
- The sitemap always reflects reality, so crawlers don't waste time on stale
  or missing URLs.
- Publishing regularly (this pipeline makes that a 2-minute task) is the single
  biggest lever for ranking on freshness-sensitive queries like "latest AI news."
- This pipeline does **not** by itself win rankings for competitive terms —
  that still depends on backlinks, domain age/authority, and consistent
  publishing over time.
