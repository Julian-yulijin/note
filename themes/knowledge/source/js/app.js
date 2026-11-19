(function () {
  'use strict';

  var docEl = document.documentElement;
  var body = document.body;
  var root = body.getAttribute('data-root') || '/';

  /* ---------------- 配色切换 ---------------- */

  var themeToggle = document.getElementById('theme-toggle');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  var SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
  var MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg>';

  function paintThemeIcon() {
    if (!themeToggle) return;
    var isDark = docEl.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark ? SUN_ICON : MOON_ICON;
    themeToggle.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
    themeToggle.setAttribute('title', isDark ? '切换到浅色模式' : '切换到深色模式');
    if (themeColorMeta) themeColorMeta.setAttribute('content', isDark ? '#080b10' : '#f6f8fb');
  }

  if (themeToggle) {
    paintThemeIcon();
    themeToggle.addEventListener('click', function () {
      var next = docEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      docEl.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.cookie = 'theme=' + next + '; path=/; max-age=31536000; SameSite=Lax';
      paintThemeIcon();
    });
  }

  /* ---------------- 移动端菜单 ---------------- */

  var header = document.getElementById('site-header');
  var navToggle = document.getElementById('nav-toggle');

  if (header && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', function (event) {
      if (!header.classList.contains('nav-open')) return;
      if (!header.contains(event.target)) {
        header.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- 全站搜索 ---------------- */

  var overlay = document.getElementById('search-overlay');
  var input = document.getElementById('search-input');
  var resultsBox = document.getElementById('search-results');
  var closeBtn = document.getElementById('search-close');
  var palette = document.getElementById('palette-actions');
  var searchData = null;
  var searchLoading = false;
  var activeIndex = -1;
  var currentResults = [];

  function textOf(node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el ? el.textContent : '';
  }

  function loadIndex() {
    if (searchData || searchLoading) return;
    searchLoading = true;
    fetch(root + 'search.xml')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'text/xml');
        var nodes = doc.getElementsByTagName('entry');
        searchData = [];
        for (var i = 0; i < nodes.length; i++) {
          var title = textOf(nodes[i], 'title');
          var tags = textOf(nodes[i], 'tags');
          var categories = textOf(nodes[i], 'categories');
          var plain = textOf(nodes[i], 'content').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          searchData.push({
            title: title,
            url: textOf(nodes[i], 'url'),
            titleLower: title.toLowerCase(),
            plain: plain,
            haystack: (title + ' ' + tags + ' ' + categories + ' ' + plain).toLowerCase()
          });
        }
      })
      .catch(function () {
        searchData = [];
      })
      .then(function () {
        searchLoading = false;
        if (input && input.value.trim()) runSearch(input.value);
      });
  }

  function setActive(index) {
    activeIndex = index;
    if (!resultsBox) return;
    var items = resultsBox.querySelectorAll('.search-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', i === index);
    }
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function makeSnippet(item, tokens) {
    var frag = document.createDocumentFragment();
    var text = item.plain || '';
    if (!tokens || !tokens.length) {
      frag.appendChild(document.createTextNode(text.slice(0, 120)));
      return frag;
    }
    var lower = text.toLowerCase();
    var pos = -1;
    tokens.forEach(function (token) {
      var at = lower.indexOf(token);
      if (at !== -1 && (pos === -1 || at < pos)) pos = at;
    });
    var start = pos > 40 ? pos - 40 : 0;
    var snippet = text.slice(start, start + 120);
    var re = new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'gi');
    var last = 0;
    var match;
    while ((match = re.exec(snippet)) !== null) {
      if (match.index > last) {
        frag.appendChild(document.createTextNode(snippet.slice(last, match.index)));
      }
      var mark = document.createElement('mark');
      mark.textContent = match[0];
      frag.appendChild(mark);
      last = match.index + match[0].length;
      if (!match[0]) re.lastIndex++;
    }
    if (last < snippet.length) {
      frag.appendChild(document.createTextNode(snippet.slice(last)));
    }
    return frag;
  }

  function renderResults(list, tokens) {
    if (!resultsBox) return;
    resultsBox.innerHTML = '';
    if (!list.length) {
      if (!input || !input.value.trim()) return;
      var empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = '没有找到匹配的内容';
      resultsBox.appendChild(empty);
      return;
    }
    list.forEach(function (item, index) {
      var link = document.createElement('a');
      link.className = 'search-item' + (index === activeIndex ? ' active' : '');
      link.href = item.url;
      var title = document.createElement('h4');
      title.textContent = item.title;
      var desc = document.createElement('p');
      desc.appendChild(makeSnippet(item, tokens));
      link.appendChild(title);
      link.appendChild(desc);
      link.addEventListener('mouseenter', function () { setActive(index); });
      resultsBox.appendChild(link);
    });
  }

  function runSearch(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) {
      currentResults = [];
      activeIndex = -1;
      if (palette) palette.classList.remove('is-hidden');
      renderResults([]);
      return;
    }
    if (palette) palette.classList.add('is-hidden');
    var tokens = q.split(/\s+/).filter(Boolean);
    var scored = [];
    (searchData || []).forEach(function (item) {
      var score = 0;
      for (var i = 0; i < tokens.length; i++) {
        if (item.haystack.indexOf(tokens[i]) === -1) return;
        score += item.titleLower.indexOf(tokens[i]) !== -1 ? 8 : 1;
      }
      scored.push({ item: item, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    currentResults = scored.slice(0, 20).map(function (entry) { return entry.item; });
    activeIndex = currentResults.length ? 0 : -1;
    renderResults(currentResults, tokens);
  }

  function openSearch() {
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    body.classList.add('search-open');
    loadIndex();
    if (input) {
      input.value = '';
      input.focus();
    }
    runSearch('');
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    body.classList.remove('search-open');
    activeIndex = -1;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-open-search]'), function (button) {
    button.addEventListener('click', openSearch);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeSearch);

  if (overlay) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeSearch();
    });
  }

  if (input) {
    input.addEventListener('input', function () { runSearch(input.value); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (currentResults.length) setActive((activeIndex + 1) % currentResults.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentResults.length) setActive((activeIndex - 1 + currentResults.length) % currentResults.length);
      } else if (event.key === 'Enter') {
        if (currentResults[activeIndex]) window.location.href = currentResults[activeIndex].url;
      } else if (event.key === 'Escape') {
        closeSearch();
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    var key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      openSearch();
    } else if (event.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      closeSearch();
    } else if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      openSearch();
    }
  });

  /* ---------------- 文章目录 ---------------- */

  function buildToc() {
    var content = document.getElementById('post-content');
    var nav = document.getElementById('toc-nav');
    var toc = document.getElementById('toc');
    if (!content || !nav || !toc) return;

    var mobileNav = document.getElementById('toc-nav-mobile');
    var navs = [nav];
    if (mobileNav) navs.push(mobileNav);

    var headings = Array.prototype.slice.call(content.querySelectorAll('h2, h3'));
    if (!headings.length) {
      toc.style.display = 'none';
      if (mobileNav) mobileNav.closest('details').style.display = 'none';
      var bodyEl = toc.closest('.post-body');
      if (bodyEl) bodyEl.classList.add('no-toc');
      return;
    }

    var usedIds = {};
    headings.forEach(function (heading, index) {
      if (!heading.id) {
        var base = (heading.textContent || '').trim().toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
          .replace(/^-+|-+$/g, '') || ('section-' + (index + 1));
        var id = base;
        var n = 2;
        while (usedIds[id] || document.getElementById(id)) {
          id = base + '-' + n;
          n++;
        }
        heading.id = id;
      }
      usedIds[heading.id] = true;

      navs.forEach(function (target) {
        var link = document.createElement('a');
        link.className = 'toc-link level-' + heading.tagName.slice(1);
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        target.appendChild(link);
      });
    });

    if (mobileNav) {
      var drawer = mobileNav.closest('details');
      mobileNav.addEventListener('click', function (event) {
        if (event.target.closest('a') && drawer) drawer.removeAttribute('open');
      });
    }

    var links = Array.prototype.slice.call(document.querySelectorAll('#toc-nav .toc-link, #toc-nav-mobile .toc-link'));
    var ticking = false;

    function updateActive() {
      var offset = window.scrollY + 110;
      var current = 0;
      headings.forEach(function (heading, index) {
        var top = heading.getBoundingClientRect().top + window.scrollY;
        if (top <= offset) current = index;
      });
      links.forEach(function (link, index) {
        link.classList.toggle('active', index === current);
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActive);
    }, { passive: true });

    updateActive();
  }

  /* ---------------- 阅读进度 / 返回顶部 ---------------- */

  function initScrollUi() {
    var progressBar = document.getElementById('read-progress');
    var backTop = document.getElementById('back-top');
    var ring = document.querySelector('.progress-ring circle');
    var content = document.getElementById('post-content');
    if (!progressBar && !backTop) return;

    var ticking = false;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      var ratio = 0;
      if (content) {
        var start = content.getBoundingClientRect().top + y - 120;
        var span = Math.max(1, content.offsetHeight - window.innerHeight + 240);
        ratio = Math.min(1, Math.max(0, (y - start) / span));
      } else {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      }
      if (progressBar) progressBar.style.width = (ratio * 100).toFixed(2) + '%';
      if (ring) {
        var total = 2 * Math.PI * 20;
        ring.style.strokeDashoffset = (total * (1 - ratio)).toFixed(1);
      }
      if (backTop) backTop.classList.toggle('show', y > 600);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (backTop) {
      backTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ---------------- 代码块：语言标签与复制 ---------------- */

  function copyText(text, button) {
    function done() {
      button.textContent = '已复制';
      button.classList.add('copied');
      setTimeout(function () {
        button.textContent = '复制';
        button.classList.remove('copied');
      }, 1600);
    }

    function fallback() {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {}
      document.body.removeChild(area);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  function enhanceCodeBlocks() {
    var content = document.getElementById('post-content');
    if (!content) return;

    var blocks = content.querySelectorAll('figure.highlight, pre');
    Array.prototype.forEach.call(blocks, function (block) {
      if (block.parentNode && block.parentNode.classList.contains('code-block')) return;
      if (block.tagName === 'PRE' && block.parentNode && block.parentNode.closest('figure.highlight')) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      var lang = '';
      var codeEl = block.querySelector('td.code pre') || block.querySelector('pre') || block.querySelector('code');
      var className = (codeEl && codeEl.className) || '';
      var matched = className.match(/language-([\w-]+)/);
      if (matched) lang = matched[1];
      if (!lang) {
        Array.prototype.forEach.call(block.classList, function (name) {
          if (lang || name === 'highlight' || name === 'table' || name === 'code' || name === 'gutter') return;
          lang = name;
        });
      }

      var toolbar = document.createElement('div');
      toolbar.className = 'code-toolbar';

      if (lang) {
        var label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = lang;
        toolbar.appendChild(label);
      }

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-btn';
      button.textContent = '复制';
      button.setAttribute('aria-label', '复制代码');
      button.addEventListener('click', function () {
        var target = block.querySelector('td.code pre') || block.querySelector('pre') || block;
        copyText(target.innerText, button);
      });
      toolbar.appendChild(button);
      wrapper.appendChild(toolbar);
    });
  }

  /* ---------------- 图片灯箱 ---------------- */

  function initLightbox() {
    var content = document.getElementById('post-content');
    var lightbox = document.getElementById('lightbox');
    if (!content || !lightbox) return;
    var image = lightbox.querySelector('img');
    var close = document.getElementById('lightbox-close');
    if (!image) return;

    function open(src, alt) {
      image.src = src;
      image.alt = alt || '';
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
    }

    function hide() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      body.classList.remove('lightbox-open');
      image.removeAttribute('src');
    }

    Array.prototype.forEach.call(content.querySelectorAll('img'), function (img) {
      img.addEventListener('click', function () {
        open(img.currentSrc || img.src, img.alt);
      });
    });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox || event.target === close) hide();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && lightbox.classList.contains('open')) hide();
    });
  }

  /* ---------------- 标题锚点与外部链接 ---------------- */

  function addHeadingAnchors() {
    var content = document.getElementById('post-content');
    if (!content) return;
    Array.prototype.forEach.call(content.querySelectorAll('h2[id], h3[id]'), function (heading) {
      if (heading.querySelector('.heading-anchor')) return;
      var anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = '#' + heading.id;
      anchor.textContent = '#';
      anchor.setAttribute('aria-label', '链接到本节');
      heading.appendChild(anchor);
    });
  }

  function markExternalLinks() {
    var content = document.getElementById('post-content');
    if (!content) return;
    Array.prototype.forEach.call(content.querySelectorAll('a[href^="http"]'), function (link) {
      if (link.hostname && link.hostname !== window.location.hostname) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  }

  /* ---------------- 页头状态与滚动进场 ---------------- */

  function initHeaderState() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function update() {
      header.classList.toggle('scrolled', (window.scrollY || window.pageYOffset) > 6);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initReveal() {
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll('.card, .section-head, .taxonomy-card, .tag-chip, .topic');
    Array.prototype.forEach.call(targets, function (el, index) {
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(index * 35, 280) + 'ms';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });
  }

  /* ---------------- 命令面板 / 卡片光斑 / 文章操作 ---------------- */

  function initPalette() {
    var themeBtn = document.getElementById('palette-theme');
    if (!themeBtn) return;
    themeBtn.addEventListener('click', function () {
      var toggle = document.getElementById('theme-toggle');
      if (toggle) toggle.click();
    });
  }

  function initCardSpotlight() {
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    document.addEventListener('pointermove', function (event) {
      var target = event.target;
      var card = target && target.closest ? target.closest('.card') : null;
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (event.clientX - rect.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (event.clientY - rect.top).toFixed(1) + 'px');
    }, { passive: true });
  }

  function copyUrl() {
    var url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url);
    }
    return new Promise(function (resolve) {
      var area = document.createElement('textarea');
      area.value = url;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(area);
      resolve();
    });
  }

  function initPostRail() {
    var copyBtn = document.getElementById('copy-link');
    var shareBtn = document.getElementById('share-post');
    var topBtn = document.getElementById('back-top-rail');
    if (!copyBtn && !shareBtn && !topBtn) return;

    function flash(button) {
      button.classList.add('is-done');
      setTimeout(function () { button.classList.remove('is-done'); }, 1400);
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyUrl().then(function () { flash(copyBtn); });
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({ title: document.title, url: location.href }).catch(function () {});
        } else {
          copyUrl().then(function () { flash(shareBtn); });
        }
      });
    }

    if (topBtn) {
      topBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function initStatsCount() {
    var stats = document.querySelectorAll('.stat strong');
    if (!stats.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        observer.unobserve(el);
        var target = parseInt(el.textContent, 10);
        if (!target || target < 2) return;
        var start = 0;
        function tick(now) {
          if (!start) start = now;
          var progress = Math.min(1, (now - start) / 700);
          el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) window.requestAnimationFrame(tick);
        }
        el.textContent = '0';
        window.requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(stats, function (el) { observer.observe(el); });
  }

  buildToc();
  initScrollUi();
  enhanceCodeBlocks();
  initLightbox();
  addHeadingAnchors();
  markExternalLinks();
  initHeaderState();
  initReveal();
  initPalette();
  initCardSpotlight();
  initPostRail();
  initStatsCount();
})();
