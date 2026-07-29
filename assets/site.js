  // Tech-only RSS sources split across the two rails
  const LEFT_FEEDS  = [
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml"
  ];
  const RIGHT_FEEDS = [
    "https://www.wired.com/feed/rss",
    "https://feeds.arstechnica.com/arstechnica/index"
  ];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function fetchFeed(url){
    const api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url);
    const res = await fetch(api);
    if(!res.ok) throw new Error("feed fetch failed");
    const data = await res.json();
    if(data.status !== "ok") throw new Error("feed status not ok");
    return {
      source: data.feed && data.feed.title ? data.feed.title : "Feed",
      items: (data.items || []).slice(0, 5)
    };
  }

  function buildItemEl(source, item){
    const a = document.createElement("a");
    a.className = "feed-item";
    a.href = item.link || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const title = (item.title || "Untitled").slice(0, 90);
    a.innerHTML = '<span class="src">' + source + '</span>' + title;
    return a;
  }

  function renderRail(containerId, feedUrls){
    const container = document.getElementById(containerId);

    Promise.allSettled(feedUrls.map(fetchFeed)).then(results => {
      container.innerHTML = "";
      const entries = [];

      results.forEach(result => {
        if(result.status === "fulfilled"){
          const { source, items } = result.value;
          items.forEach(item => entries.push({ source, item }));
        }
      });

      if(entries.length === 0){
        container.innerHTML = '<div class="feed-status">Feeds unavailable right now — check back shortly.</div>';
        return;
      }

      const track = document.createElement("div");
      track.className = "rail-track";

      // Render the list twice back-to-back so the loop reads seamlessly
      const isNarrow = window.matchMedia('(max-width: 780px)').matches;
      const passes = (prefersReducedMotion || isNarrow) ? 1 : 2;
      for(let p = 0; p < passes; p++){
        entries.forEach(({ source, item }) => track.appendChild(buildItemEl(source, item)));
      }

      if(!prefersReducedMotion && !isNarrow){
        const duration = Math.max(entries.length * 6, 18);
        track.style.animationDuration = duration + "s";
      }

      container.innerHTML = "";
      container.appendChild(track);
    }).catch(() => {
      container.innerHTML = '<div class="feed-status">Feeds unavailable right now.</div>';
    });
  }

  function loadFeeds(){
    renderRail("rail-left-feed", LEFT_FEEDS);
    renderRail("rail-right-feed", RIGHT_FEEDS);
  }

  loadFeeds();
  // Keep the rails genuinely live: quietly refresh every 5 minutes
  setInterval(loadFeeds, 5 * 60 * 1000);

  // Scroll-reveal for the article sections
  const revealEls = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window && !prefersReducedMotion){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("in-view"));
  }
