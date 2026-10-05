// Fetches this page's content from the CMS API and renders it into the
// existing static markup (which stays as a fallback if the fetch fails).
// Fires 'content:rendered' when done (success or failure) so each page's
// own script can safely set up carousels/animations/galleries afterward.
(function () {
    const PAGE = document.body.dataset.page;
    if (!PAGE) return;

    const HERO_BODY_SELECTOR = { td: '.hero-subtitle', surgalt: '.hero-description', zuwluguu: '.hero-subtitle' };
    const IMG_FALLBACK = `onerror="this.onerror=null;this.src='/assets/images/placeholder.svg'"`;

    // Escaped as a CSS string so a quote in the URL can't break out of url().
    const cssUrl = (url) => `url("${String(url).replace(/["\\\n]/g, '\\$&')}")`;

    // Admin-entered SVG path data: only path-command characters can pass.
    const svgPath = (d) => String(d || '').replace(/[^a-zA-Z0-9.,\s-]/g, '');

    function renderSimpleHero(slide) {
        if (!slide) return;
        const heroSection = document.querySelector('.hero-section');
        const titleEl = document.querySelector('.hero-title');
        const bodyEl = document.querySelector(HERO_BODY_SELECTOR[PAGE]);
        if (titleEl) titleEl.textContent = slide.title;
        if (bodyEl) bodyEl.textContent = slide.body;
        if (heroSection && slide.imageUrl) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), ${cssUrl(slide.imageUrl)}`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
        }
    }

    function buildSlideEl(slide, index, total) {
        const div = document.createElement('div');
        div.className = 'slide' + (index === 0 ? ' active' : '');
        div.dataset.index = String(index);
        div.setAttribute('role', 'group');
        div.setAttribute('aria-roledescription', 'slide');
        div.setAttribute('aria-label', `${index + 1} / ${total}: ${slide.title}`);

        const content = document.createElement('div');
        content.className = 'slide-content';

        // Only the first slide is the page's <h1>; the rest are h2 so the
        // page has a single top-level heading.
        const heading = document.createElement(index === 0 ? 'h1' : 'h2');
        if (index === 0) heading.id = 'hero-title';
        heading.textContent = slide.title;
        content.appendChild(heading);

        const p = document.createElement('p');
        p.textContent = slide.body;
        content.appendChild(p);

        const href = safeUrl(slide.ctaLink);
        if (slide.ctaLabel && href) {
            const ctaWrap = document.createElement('div');
            ctaWrap.className = 'hero-cta';
            ctaWrap.innerHTML = `
                <div class="button-wrap">
                    <a href="${escapeHtml(href)}" class="cta-btn"><span>${escapeHtml(slide.ctaLabel)}</span></a>
                    <div class="button-shadow" aria-hidden="true"></div>
                </div>`;
            content.appendChild(ctaWrap);
        }

        div.appendChild(content);

        const bg = document.createElement('div');
        bg.className = 'slide-bg';
        const priority = index === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
        bg.innerHTML = `<img src="${escapeHtml(slide.imageUrl)}" data-src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.imageAlt)}" class="lazy-load slide-bg-img" ${priority}>`;
        div.appendChild(bg);

        return div;
    }

    function renderHomeHero(slides) {
        const container = document.querySelector('.slider-container');
        if (!container || !slides.length) return;

        container.querySelectorAll('.slide').forEach((el) => el.remove());
        const navArea = container.querySelector('.slider-nav-area');
        slides.forEach((slide, i) => {
            const el = buildSlideEl(slide, i, slides.length);
            if (navArea) container.insertBefore(el, navArea);
            else container.appendChild(el);
        });

        const indicators = container.querySelector('.slide-indicators');
        if (indicators) {
            indicators.innerHTML = slides.map((slide, i) =>
                `<button class="indicator${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}: ${escapeHtml(slide.title)}" type="button"></button>`
            ).join('');
        }
    }

    function renderCategories(categories) {
        const container = document.querySelector('.categories-container');
        if (!container) return;
        container.innerHTML = categories.map((cat, i) => `
            <div class="category-card" role="article" aria-labelledby="cat${i}-title">
                <div class="category-icon" role="img" aria-label="${escapeHtml(cat.title)} icon">
                    <img src="${escapeHtml(cat.iconUrl)}" alt="${escapeHtml(cat.iconAlt)}" loading="lazy" ${IMG_FALLBACK}>
                </div>
                <h3 id="cat${i}-title" class="category-title">${escapeHtml(cat.title)}</h3>
                <p class="category-description">${escapeHtml(cat.description)}</p>
                <a href="#${escapeHtml(cat.linkSectionId)}" class="category-link" aria-describedby="cat${i}-title">${escapeHtml(cat.linkText)}</a>
            </div>
        `).join('');
    }

    function courseCardHtml(course) {
        const badgeHtml = course.badge && course.badge !== 'none'
            ? `<div class="course-badge${course.badge === 'new' ? ' new' : ''}"${course.badge === 'popular' ? ' aria-label="Popular course"' : ''}>${course.badge === 'new' ? 'New' : 'Popular'}</div>`
            : '';
        return `
            <div class="course-card" data-categories="all ${course.badge !== 'none' ? escapeHtml(course.badge) : ''}">
                <div class="course-image">
                    <img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(course.imageAlt)}" loading="lazy" ${IMG_FALLBACK}>
                    ${badgeHtml}
                </div>
                <div class="course-content">
                    <div class="course-meta"><span class="course-category">${escapeHtml(course.categoryLabel)}</span></div>
                    <h3 class="course-title">${escapeHtml(course.title)}</h3>
                    <p class="course-description">${escapeHtml(course.description)}</p>
                    <a href="${escapeHtml(safeUrl(course.linkHref))}" class="course-link">${escapeHtml(course.linkText)}</a>
                </div>
            </div>`;
    }

    function renderCourseSections(sections, courses) {
        const container = document.getElementById('course-sections-container');
        if (!container) return;

        container.innerHTML = sections.map((section) => {
            const sectionCourses = courses.filter((c) => c.sectionId === section.sectionId);
            return `
                <section id="${escapeHtml(section.sectionId)}" class="courses-section collapsed${section.colorVariant ? ' ' + escapeHtml(section.colorVariant) : ''}" aria-labelledby="${escapeHtml(section.sectionId)}-title">
                    <div class="container">
                        <div class="section-header">
                            <h2 id="${escapeHtml(section.sectionId)}-title" class="section-title">${escapeHtml(section.title)}</h2>
                            <button class="view-all-btn" aria-expanded="false" aria-controls="${escapeHtml(section.sectionId)}-list" type="button">
                                <span class="btn-text">Бүгдийг харах</span>
                                <span class="toggle-icon" aria-hidden="true">+</span>
                            </button>
                        </div>
                        <p class="section-description">${escapeHtml(section.description)}</p>
                        <div id="${escapeHtml(section.sectionId)}-list" class="course-cards-container" role="grid" aria-label="${escapeHtml(section.title)}">
                            ${sectionCourses.map(courseCardHtml).join('')}
                        </div>
                    </div>
                </section>`;
        }).join('');
    }

    function renderProducts(products) {
        const grid = document.querySelector('.products-grid');
        if (!grid) return;

        window.__productGalleries = {};
        products.forEach((p) => {
            window.__productGalleries[`product-${p._id}`] = (p.images || []).map((img) => img.url);
        });

        grid.innerHTML = products.map((p) => {
            const img = p.images && p.images[0];
            return `
                <div class="product-card" data-category="${escapeHtml(p.category)}">
                    <div class="product-image" data-product="product-${p._id}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${escapeHtml(p.title)}: зургууд үзэх">
                        <img src="${escapeHtml(img ? img.url : '')}" alt="${escapeHtml(img ? img.alt : p.title)}" loading="lazy">
                        <div class="gallery-overlay" aria-hidden="true">
                            <div class="gallery-icon">🖼️</div>
                            <div class="gallery-text">Илүү олон зураг үзэх</div>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${escapeHtml(p.title)}</h3>
                        <div class="product-price">${escapeHtml(p.price)}</div>
                        <div class="product-description">
                            <p>${escapeHtml(p.description)}</p>
                            <div class="product-features">${(p.features || []).map((f) => `<span class="feature">${escapeHtml(f)}</span>`).join('')}</div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    function renderAdviceCards(cards) {
        const container = document.querySelector('.advice-cards');
        if (!container) return;

        window.__caseStudies = {};
        cards.forEach((card, i) => {
            window.__caseStudies[`card-${i}`] = { title: card.studyTitle, content: card.studyContent, link: card.studyLink };
        });

        container.innerHTML = cards.map((card, i) => `
            <div class="advice-card">
                <div class="card-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${svgPath(card.iconSvgPath)}"></path></svg>
                </div>
                <h3 class="card-title">${escapeHtml(card.title)}</h3>
                <p class="card-content">${escapeHtml(card.content)}</p>
                <button type="button" class="card-link" data-study="card-${i}" aria-haspopup="dialog">${escapeHtml(card.linkText)}</button>
            </div>
        `).join('');
    }

    function renderTdTeaser(products) {
        const grid = document.getElementById('td-teaser-grid');
        if (!grid || !products.length) return;
        grid.innerHTML = products.slice(0, 3).map((p) => {
            const img = p.images && p.images[0];
            return `
                <a href="TD.html" class="teaser-card" role="listitem">
                    <div class="teaser-image">
                        <img src="${escapeHtml(img ? img.url : '')}" alt="${escapeHtml(img ? img.alt : p.title)}" loading="lazy">
                    </div>
                    <div class="teaser-info">
                        <h3 class="teaser-title">${escapeHtml(p.title)}</h3>
                        <p class="teaser-price">${escapeHtml(p.price)}</p>
                    </div>
                </a>`;
        }).join('');
    }

    function renderSurgaltTeaser(courses) {
        const grid = document.getElementById('surgalt-teaser-grid');
        if (!grid || !courses.length) return;
        grid.innerHTML = courses.slice(0, 3).map((c) => `
            <a href="surgalt.html" class="teaser-card" role="listitem">
                <div class="teaser-image">
                    <img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.imageAlt)}" loading="lazy">
                </div>
                <div class="teaser-info">
                    <span class="teaser-category">${escapeHtml(c.categoryLabel)}</span>
                    <h3 class="teaser-title">${escapeHtml(c.title)}</h3>
                </div>
            </a>`).join('');
    }

    function renderZuwluguuTeaser(cards) {
        const grid = document.getElementById('zuwluguu-teaser-grid');
        if (!grid || !cards.length) return;
        grid.innerHTML = cards.slice(0, 3).map((card) => `
            <a href="zuwluguu.html" class="teaser-card teaser-card-advice" role="listitem">
                <div class="teaser-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${svgPath(card.iconSvgPath)}"></path></svg>
                </div>
                <h3 class="teaser-title">${escapeHtml(card.title)}</h3>
                <p class="teaser-desc">${escapeHtml(card.content)}</p>
            </a>`).join('');
    }

    // Trending Now: interleaves real items already fetched for the Featured
    // Services showcases below (courses/products/advice cards) into one
    // horizontal row. Only ever shows a badge when the CMS actually set one
    // (course.badge) - never a fabricated view/interaction count.
    function trendCardHtml(item) {
        const media = item.imageUrl
            ? `<div class="trend-image"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy">${item.badgeLabel ? `<span class="trend-badge${item.badge === 'new' ? ' new' : ''}">${escapeHtml(item.badgeLabel)}</span>` : ''}</div>`
            : `<div class="trend-image"><div class="trend-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${svgPath(item.iconSvgPath)}"></path></svg></div></div>`;

        return `
            <a href="${escapeHtml(item.href)}" class="trend-card" role="listitem">
                ${media}
                <div class="trend-body">
                    <span class="trend-type">${escapeHtml(item.typeLabel)}</span>
                    <h3 class="trend-title">${escapeHtml(item.title)}</h3>
                    ${item.meta ? `<span class="trend-meta">${escapeHtml(item.meta)}</span>` : ''}
                    <span class="trend-arrow-row" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
                    </span>
                </div>
            </a>`;
    }

    function renderTrending({ courses, featuredCourses, products, adviceCards }) {
        const track = document.getElementById('trend-track');
        if (!track) return;

        const studyItems = (featuredCourses.length ? featuredCourses : courses).slice(0, 3).map((c) => ({
            typeLabel: 'Сургалт', title: c.title, meta: c.categoryLabel,
            imageUrl: c.imageUrl, imageAlt: c.imageAlt,
            badge: c.badge, badgeLabel: c.badge === 'popular' ? 'Түгээмэл' : c.badge === 'new' ? 'Шинэ' : '',
            href: 'surgalt.html',
        }));
        const marketItems = products.slice(0, 3).map((p) => {
            const img = p.images && p.images[0];
            return { typeLabel: 'Дэлгүүр', title: p.title, meta: p.price, imageUrl: img && img.url, imageAlt: img && img.alt, href: 'TD.html' };
        });
        const guidanceItems = adviceCards.slice(0, 2).map((a) => ({
            typeLabel: 'Зөвлөгөө', title: a.title, meta: '', iconSvgPath: a.iconSvgPath, href: 'zuwluguu.html',
        }));

        // Round-robin interleave so the row alternates between pillars instead of grouping them.
        const groups = [studyItems, marketItems, guidanceItems];
        const items = [];
        for (let i = 0; items.length < 8 && groups.some((g) => i < g.length); i++) {
            groups.forEach((g) => { if (g[i]) items.push(g[i]); });
        }

        if (!items.length) return;
        track.innerHTML = items.map(trendCardHtml).join('');
    }

    async function fetchPageContent(page) {
        try {
            const response = await fetch(`/api/content/${page}`);
            const json = await response.json();
            return json.success ? json : null;
        } catch (error) {
            console.error(`Failed to load CMS content for ${page}:`, error);
            return null;
        }
    }

    function render(data) {
        if (PAGE === 'home') {
            renderHomeHero(data.hero);
            renderTdTeaser(data.products);
            renderSurgaltTeaser(data.courses);
            renderZuwluguuTeaser(data.adviceCards);
            renderTrending(data);
            return;
        }

        renderSimpleHero(data.hero[0]);
        if (PAGE === 'surgalt') {
            renderCategories(data.categories);
            renderCourseSections(data.sections, data.courses);
        } else if (PAGE === 'td') {
            renderProducts(data.products);
        } else if (PAGE === 'zuwluguu') {
            renderAdviceCards(data.adviceCards);
        }
    }

    // Start the request right away; only the rendering waits for the DOM.
    const contentPromise = fetchPageContent(PAGE);

    async function loadContent() {
        const data = await contentPromise;
        if (data) render(data);
        document.dispatchEvent(new CustomEvent('content:rendered', { detail: data }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadContent);
    } else {
        loadContent();
    }
})();
