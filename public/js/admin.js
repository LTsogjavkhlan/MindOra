(function () {
    'use strict';

    // ---------------- Generic helpers ----------------

    async function apiFetch(url, options) {
        const response = await fetch(url, { credentials: 'same-origin', ...options });
        let data = {};
        try { data = await response.json(); } catch (e) { /* no body */ }
        if (!response.ok || data.success === false) {
            throw new Error(data.message || `Request failed (${response.status})`);
        }
        return data;
    }

    function thumbHtml(url) {
        return url
            ? `<img class="item-thumb" src="${escapeHtml(url)}" alt="">`
            : `<div class="item-thumb-placeholder">Зураггүй</div>`;
    }

    function imagePreviewHtml(url, removeCheckboxId) {
        if (!url) return '';
        return `
            <div class="current-image-preview">
                <img src="${escapeHtml(url)}" alt="">
                <label class="checkbox-row"><input type="checkbox" id="${removeCheckboxId}"> Одоогийн зургийг устгах</label>
            </div>`;
    }

    // Renders a fetched list into `<div class="item-card">` rows with
    // Edit/Delete buttons, and wires those buttons up. Shared by every
    // admin section's load*() function - only the endpoint, container,
    // and per-item markup differ between them.
    async function renderList({ url, responseKey, listElId, itemHtml, emptyMessage, onEdit, onDelete }) {
        const data = await apiFetch(url);
        const items = data[responseKey];
        const list = document.getElementById(listElId);
        list.innerHTML = items.length
            ? items.map((item) => `
                <div class="item-card">
                    ${itemHtml(item)}
                    <div class="item-actions">
                        <button class="btn-secondary btn-small" data-edit="${item._id}">Засах</button>
                        <button class="btn-danger btn-small" data-delete="${item._id}">Устгах</button>
                    </div>
                </div>`).join('')
            : `<p class="empty-state">${emptyMessage}</p>`;

        list.querySelectorAll('[data-edit]').forEach((btn) =>
            btn.addEventListener('click', () => onEdit(items.find((i) => i._id === btn.dataset.edit))));
        list.querySelectorAll('[data-delete]').forEach((btn) =>
            btn.addEventListener('click', () => onDelete(items.find((i) => i._id === btn.dataset.delete))));

        return items;
    }

    // Wires a form's submit handler: disables the submit button for the
    // duration of the request (so a slow image upload can't be double-
    // submitted), calls apiFetch, and reports errors inline. Shared by
    // every admin section's show*Form() - only the URL/body/success
    // handling differ between them.
    // Ties each `.form-row > label` to its row's control (for/id, ids scoped
    // to the form so two open forms can't collide), and gives label-less
    // extra controls (e.g. the image alt-text field) an aria-label from
    // their placeholder - so every field is clickable and announced.
    function linkLabels(form) {
        form.querySelectorAll('.form-row').forEach((row) => {
            const label = row.querySelector(':scope > label');
            const controls = row.querySelectorAll(':scope > input, :scope > textarea, :scope > select');
            controls.forEach((control, i) => {
                control.id ||= `${form.id}-${control.name || 'field'}${i ? `-${i}` : ''}`;
                if (i === 0 && label) label.htmlFor = control.id;
                else if (!control.hasAttribute('aria-label')) {
                    control.setAttribute('aria-label', control.placeholder || label?.textContent || control.name);
                }
            });
        });
    }

    function bindAdminForm(formId, { buildUrl, buildOptions, errorElId, onSuccess }) {
        const form = document.getElementById(formId);
        linkLabels(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorEl = document.getElementById(errorElId);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (submitBtn) submitBtn.disabled = true;
            errorEl.textContent = '';
            try {
                const data = await apiFetch(buildUrl(), buildOptions(form));
                await onSuccess(data);
            } catch (err) {
                errorEl.textContent = err.message;
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // ---------------- Auth ----------------

    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginSuccess = document.getElementById('login-success');
    const adminStatus = document.getElementById('admin-status');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const loginSubmitLabel = loginSubmitBtn.querySelector('.btn-label');

    function showAlert(el, message) {
        el.textContent = message;
        el.hidden = false;
    }

    function hideAlert(el) {
        el.hidden = true;
        el.textContent = '';
    }

    function setLoginLoading(isLoading) {
        loginSubmitBtn.disabled = isLoading;
        loginSubmitBtn.classList.toggle('is-loading', isLoading);
        loginSubmitLabel.textContent = isLoading ? 'Нэвтэрч байна…' : 'Нэвтрэх';
    }

    async function checkAuth() {
        try {
            const data = await apiFetch('/api/admin/me');
            loginScreen.hidden = true;
            showDashboard(data.username);
        } catch (e) {
            showLogin();
        }
    }

    function showLogin() {
        loginScreen.classList.remove('is-leaving');
        loginScreen.hidden = false;
        dashboard.hidden = true;
        setLoginLoading(false);
        hideAlert(loginError);
        hideAlert(loginSuccess);
        loginForm.reset();
    }

    function showDashboard(username) {
        dashboard.hidden = false;
        document.getElementById('admin-username').textContent = username;
        loadAllContent();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(loginError);
        hideAlert(loginSuccess);
        setLoginLoading(true);
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await apiFetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            showAlert(loginSuccess, 'Амжилттай нэвтэрлээ! Хяналтын самбарыг ачааллаж байна…');
            // Brief pause so the success message is actually readable, then
            // fade the login screen out before swapping to the dashboard.
            await new Promise((resolve) => setTimeout(resolve, 500));
            loginScreen.classList.add('is-leaving');
            await new Promise((resolve) => setTimeout(resolve, 200));
            loginScreen.hidden = true;
            loginForm.reset();
            showDashboard(data.username);
        } catch (err) {
            setLoginLoading(false);
            showAlert(loginError, err.message);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await apiFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
        showLogin();
    });

    // ---------------- Tabs ----------------

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'orders') loadOrders();
            if (btn.dataset.tab === 'enrollments') loadEnrollments();
        });
    });

    function loadAllContent() {
        loadOrders();
        loadEnrollments();
        loadHomeHero();
        loadSimpleHero('td', 'td-hero-form-container');
        loadSimpleHero('surgalt', 'surgalt-hero-form-container');
        loadSimpleHero('zuwluguu', 'zuwluguu-hero-form-container');
        loadProducts();
        loadCategories();
        loadCourseSections();
        loadCourses();
        loadAdviceCards();
    }

    // ==================================================
    // Home hero (carousel: list + add/edit/delete)
    // ==================================================

    async function loadHomeHero() {
        await renderList({
            url: '/api/admin/hero?page=home',
            responseKey: 'slides',
            listElId: 'home-hero-list',
            emptyMessage: 'Одоогоор слайд алга байна.',
            itemHtml: (s) => `
                ${thumbHtml(s.imageUrl)}
                <div class="item-info">
                    <div class="item-title">${escapeHtml(s.title)}</div>
                    <div class="item-subtitle">${escapeHtml(s.body)}</div>
                </div>`,
            onEdit: showHomeHeroForm,
            onDelete: (s) => deleteItem('/api/admin/hero/' + s._id, loadHomeHero),
        });
    }

    document.getElementById('home-hero-add-btn').addEventListener('click', () => showHomeHeroForm(null));

    function showHomeHeroForm(slide) {
        const container = document.getElementById('home-hero-form-container');
        const isEdit = !!slide;
        container.innerHTML = `
            <form class="admin-form" id="home-hero-form">
                <h3>Слайд ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(slide?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Гол текст</label>
                    <textarea name="body">${escapeHtml(slide?.body)}</textarea>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Товчны бичээс</label>
                        <input type="text" name="ctaLabel" value="${escapeHtml(slide?.ctaLabel)}">
                    </div>
                    <div class="form-row">
                        <label>Товчны холбоос</label>
                        <input type="text" name="ctaLink" value="${escapeHtml(slide?.ctaLink)}" placeholder="жишээ нь surgalt.html эсвэл #services">
                    </div>
                </div>
                <div class="form-row">
                    <label>Дараалал (эргэлтэн дэх байрлал, 0 = эхний)</label>
                    <input type="number" name="order" value="${slide ? slide.order : 0}" min="0">
                </div>
                <div class="form-row">
                    <label>Дэвсгэр зураг</label>
                    ${imagePreviewHtml(slide?.imageUrl, 'home-hero-remove-image')}
                    <input type="file" name="image" accept="image/*">
                    <input type="text" name="imageAlt" placeholder="Зургийн тайлбар (хараа бэрхшээлтэй хэрэглэгчдэд)" value="${escapeHtml(slide?.imageAlt)}">
                </div>
                <p class="error-text" role="alert" id="home-hero-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="home-hero-cancel">Цуцлах</button>
                </div>
            </form>`;

        document.getElementById('home-hero-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('home-hero-form', {
            errorElId: 'home-hero-error',
            buildUrl: () => (isEdit ? '/api/admin/hero/' + slide._id : '/api/admin/hero'),
            buildOptions: (form) => {
                const formData = new FormData(form);
                formData.set('page', 'home');
                if (document.getElementById('home-hero-remove-image')?.checked) formData.set('imageUrl', '');
                return { method: isEdit ? 'PUT' : 'POST', body: formData };
            },
            onSuccess: () => {
                container.innerHTML = '';
                loadHomeHero();
            },
        });
    }

    // ==================================================
    // Simple hero (TD / Surgalt / Zuwluguu - single slide, edit only)
    // ==================================================

    const SIMPLE_HERO_LABELS = {
        td: 'TD хуудасны үндсэн хэсэг',
        surgalt: 'Surgalt хуудасны үндсэн хэсэг',
        zuwluguu: 'Zuwluguu хуудасны үндсэн хэсэг',
    };

    async function loadSimpleHero(page, containerId) {
        const { slides } = await apiFetch('/api/admin/hero?page=' + page);
        let slide = slides[0] || null;
        const container = document.getElementById(containerId);
        const removeId = page + '-hero-remove-image';
        container.innerHTML = `
            <form class="admin-form" id="${page}-hero-form">
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(slide?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Дэд гарчиг / тайлбар</label>
                    <textarea name="body">${escapeHtml(slide?.body)}</textarea>
                </div>
                <div class="form-row">
                    <label>Дэвсгэр зураг (заавал биш)</label>
                    ${imagePreviewHtml(slide?.imageUrl, removeId)}
                    <input type="file" name="image" accept="image/*">
                    <input type="text" name="imageAlt" placeholder="Зургийн тайлбар (хараа бэрхшээлтэй хэрэглэгчдэд)" value="${escapeHtml(slide?.imageAlt)}">
                </div>
                <p class="error-text" role="alert" id="${page}-hero-error"></p>
                <p class="success-text" id="${page}-hero-success"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">${SIMPLE_HERO_LABELS[page]}-т хийсэн өөрчлөлтийг хадгалах</button>
                </div>
            </form>`;

        bindAdminForm(page + '-hero-form', {
            errorElId: page + '-hero-error',
            buildUrl: () => (slide ? '/api/admin/hero/' + slide._id : '/api/admin/hero'),
            buildOptions: (form) => {
                const formData = new FormData(form);
                formData.set('page', page);
                if (document.getElementById(removeId)?.checked) formData.set('imageUrl', '');
                return { method: slide ? 'PUT' : 'POST', body: formData };
            },
            onSuccess: (data) => {
                // Remember the (possibly just-created) document so a second save
                // in the same session updates it instead of creating a duplicate,
                // and refresh the image preview in place without wiping this message.
                slide = data.slide;
                document.getElementById(page + '-hero-success').textContent = 'Хадгалагдлаа.';
                const preview = container.querySelector('.current-image-preview img');
                if (preview && slide.imageUrl) preview.src = slide.imageUrl;
            },
        });
    }

    // ==================================================
    // Generic delete helper
    // ==================================================

    async function deleteItem(url, reload, confirmMessage) {
        if (!confirm(confirmMessage || 'Устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
        hideAlert(adminStatus);
        try {
            await apiFetch(url, { method: 'DELETE' });
            (Array.isArray(reload) ? reload : [reload]).forEach((fn) => fn());
        } catch (err) {
            showAlert(adminStatus, `Устгаж чадсангүй: ${err.message}`);
        }
    }

    // ==================================================
    // Inboxes (Orders, Enrollments)
    // ==================================================

    // Shared behaviour for a tab that lists incoming requests: status filter
    // buttons, a "new" count badge, refresh, expandable rows and status buttons.
    // The panel markup (admin.html) carries data-inbox="<name>".
    function createInbox({ name, url, responseKey, statusLabels, actionsFor, itemHtml, emptyText, confirmFor = () => '', afterStatusChange }) {
        const panel = document.querySelector(`[data-inbox="${name}"]`);
        const list = panel.querySelector('.inbox-list');
        const badge = document.getElementById(`${name}-new-count`);
        let filter = '';

        const statusBadge = (status) => `<span class="status-badge status-${status}">${statusLabels[status]}</span>`;
        const actionsHtml = (item) => {
            const buttons = actionsFor(item.status).map(([status, label, cls]) =>
                `<button type="button" class="${cls} btn-small" data-id="${item._id}" data-status="${status}">${label}</button>`).join('');
            return buttons ? `<div class="inbox-actions">${buttons}</div>` : '';
        };

        async function load() {
            try {
                const data = await apiFetch(url + (filter ? `?status=${filter}` : ''));
                const items = data[responseKey];
                badge.textContent = data.counts.new;
                badge.hidden = !data.counts.new;
                list.innerHTML = items.length
                    ? items.map((item) => itemHtml(item, { statusBadge, actionsHtml })).join('')
                    : `<p class="empty-state">${emptyText}</p>`;
            } catch (err) {
                list.innerHTML = `<p class="error-text" role="alert">Ачаалж чадсангүй: ${escapeHtml(err.message)}</p>`;
            }
        }

        panel.querySelector('.inbox-refresh').addEventListener('click', load);

        panel.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.filter-btn').forEach((b) => {
                    b.classList.toggle('active', b === btn);
                    b.setAttribute('aria-pressed', String(b === btn));
                });
                filter = btn.dataset.status;
                load();
            });
        });

        // One delegated handler for every row's status buttons.
        list.addEventListener('click', async (e) => {
            const btn = e.target.closest('.inbox-actions button[data-status]');
            if (!btn) return;
            const { id, status } = btn.dataset;
            const question = confirmFor(status);
            if (question && !confirm(question)) return;

            btn.disabled = true;
            hideAlert(adminStatus);
            try {
                await apiFetch(`${url}/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                });
                await load();
                afterStatusChange?.(status);
            } catch (err) {
                btn.disabled = false;
                showAlert(adminStatus, `Төлөв өөрчилж чадсангүй: ${err.message}`);
            }
        });

        return { load };
    }

    const contactRows = (p) => `
        <dt>Утас</dt><dd><a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a></dd>
        <dt>Имэйл</dt><dd><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></dd>`;

    const summaryDate = (date) =>
        `<time class="inbox-date" datetime="${escapeHtml(date)}">${formatDate(date, { time: true })}</time>`;

    // Mirrors server/orders.js TRANSITIONS (the server enforces it; this just hides impossible buttons).
    const ORDER_ACTIONS = {
        new: [['confirmed', 'Баталгаажуулах', 'btn-primary'], ['delivered', 'Хүргэгдсэн', 'btn-secondary'], ['cancelled', 'Цуцлах', 'btn-danger']],
        confirmed: [['delivered', 'Хүргэгдсэн', 'btn-primary'], ['cancelled', 'Цуцлах', 'btn-danger']],
        delivered: [],
        cancelled: [],
    };

    const ordersInbox = createInbox({
        name: 'orders',
        url: '/api/admin/orders',
        responseKey: 'orders',
        statusLabels: { new: 'Шинэ', confirmed: 'Баталгаажсан', delivered: 'Хүргэгдсэн', cancelled: 'Цуцлагдсан' },
        actionsFor: (status) => ORDER_ACTIONS[status],
        emptyText: 'Захиалга алга байна.',
        confirmFor: (status) => (status === 'cancelled' ? 'Захиалгыг цуцлах уу? Бүтээгдэхүүнүүд үлдэгдэлд буцаж нэмэгдэнэ.' : ''),
        afterStatusChange: (status) => { if (status === 'cancelled') loadProducts(); }, // stock changed
        itemHtml: (order, { statusBadge, actionsHtml }) => {
            const c = order.customer;
            const items = order.items.map((item) => `
                <li><span>${escapeHtml(item.title)} &times; ${item.quantity}</span><span>${formatPrice(item.unitPrice * item.quantity)}</span></li>`).join('');
            return `
                <details class="inbox-card">
                    <summary>
                        <span class="inbox-key">#${order.orderNumber}</span>
                        <span class="inbox-name">${escapeHtml(c.name)}</span>
                        <span class="inbox-amount">${formatPrice(order.total)}</span>
                        ${summaryDate(order.createdAt)}
                        ${statusBadge(order.status)}
                    </summary>
                    <div class="inbox-body">
                        <ul class="order-items">${items}
                            <li class="order-items-total"><span>Нийт</span><span>${formatPrice(order.total)}</span></li>
                        </ul>
                        <dl class="inbox-details">
                            ${contactRows(c)}
                            <dt>Хаяг</dt><dd class="pre-wrap">${escapeHtml(c.address)}</dd>
                            ${c.note ? `<dt>Тэмдэглэл</dt><dd class="pre-wrap">${escapeHtml(c.note)}</dd>` : ''}
                            <dt>Төлбөр</dt><dd>Хүргэлтээр бэлнээр</dd>
                        </dl>
                        ${actionsHtml(order)}
                    </div>
                </details>`;
        },
    });
    const loadOrders = ordersInbox.load;

    // Enrollment statuses can move freely (no stock involved); show every other status.
    const ENROLLMENT_STATUS_LABELS = { new: 'Шинэ', contacted: 'Холбогдсон', enrolled: 'Бүртгэгдсэн', cancelled: 'Цуцлагдсан' };
    const ENROLLMENT_ACTION_STYLE = { new: 'btn-secondary', contacted: 'btn-primary', enrolled: 'btn-primary', cancelled: 'btn-danger' };

    const enrollmentsInbox = createInbox({
        name: 'enrollments',
        url: '/api/admin/enrollments',
        responseKey: 'enrollments',
        statusLabels: ENROLLMENT_STATUS_LABELS,
        actionsFor: (current) => Object.entries(ENROLLMENT_STATUS_LABELS)
            .filter(([status]) => status !== current)
            .map(([status, label]) => [status, label, ENROLLMENT_ACTION_STYLE[status]]),
        emptyText: 'Бүртгэлийн хүсэлт алга байна.',
        itemHtml: (e, { statusBadge, actionsHtml }) => `
            <details class="inbox-card">
                <summary>
                    <span class="inbox-key">${escapeHtml(e.courseTitle)}</span>
                    <span class="inbox-name">${escapeHtml(e.name)}</span>
                    ${summaryDate(e.createdAt)}
                    ${statusBadge(e.status)}
                </summary>
                <div class="inbox-body">
                    <dl class="inbox-details">
                        <dt>Хичээл</dt><dd>${escapeHtml(e.courseTitle)}</dd>
                        ${contactRows(e)}
                        ${e.note ? `<dt>Тэмдэглэл</dt><dd class="pre-wrap">${escapeHtml(e.note)}</dd>` : ''}
                    </dl>
                    ${actionsHtml(e)}
                </div>
            </details>`,
    });
    const loadEnrollments = enrollmentsInbox.load;

    // ==================================================
    // TD Products
    // ==================================================

    const LOW_STOCK = 3;

    async function loadProducts() {
        await renderList({
            url: '/api/admin/products',
            responseKey: 'products',
            listElId: 'td-products-list',
            emptyMessage: 'Одоогоор бүтээгдэхүүн алга байна.',
            itemHtml: (p) => `
                ${thumbHtml(p.images && p.images[0] && p.images[0].url)}
                <div class="item-info">
                    <div class="item-title">${escapeHtml(p.title)} &mdash; ${formatPrice(p.price)}</div>
                    <div class="item-subtitle">
                        <span class="stock-tag${p.stock === 0 ? ' is-out' : p.stock <= LOW_STOCK ? ' is-low' : ''}">Үлдэгдэл: ${p.stock ?? 0}</span>
                        ${escapeHtml(p.description)}
                    </div>
                </div>`,
            onEdit: showProductForm,
            onDelete: (p) => deleteItem('/api/admin/products/' + p._id, loadProducts),
        });
    }

    document.getElementById('td-products-add-btn').addEventListener('click', () => showProductForm(null));

    function showProductForm(product) {
        const container = document.getElementById('td-products-form-container');
        const isEdit = !!product;
        const currentImages = (product?.images || []).map((img) => `<img src="${escapeHtml(img.url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #ddd;margin-right:6px;">`).join('');

        container.innerHTML = `
            <form class="admin-form" id="product-form">
                <h3>Бүтээгдэхүүн ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Нэр</label>
                    <input type="text" name="title" value="${escapeHtml(product?.title)}" required>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Үнэ (₮)</label>
                        <input type="number" name="price" value="${product ? product.price : ''}" min="0" step="1" inputmode="numeric" placeholder="99000" required>
                    </div>
                    <div class="form-row">
                        <label>Үлдэгдэл (ширхэг)</label>
                        <input type="number" name="stock" value="${product ? product.stock ?? 0 : 0}" min="0" step="1" inputmode="numeric" required>
                    </div>
                </div>
                <div class="form-row">
                    <label>Ангилал</label>
                    <input type="text" name="category" value="${escapeHtml(product?.category)}" placeholder="electronics">
                </div>
                <div class="form-row">
                    <label>Тайлбар</label>
                    <textarea name="description">${escapeHtml(product?.description)}</textarea>
                </div>
                <div class="form-row">
                    <label>Онцлог (таслалаар тусгаарлана)</label>
                    <input type="text" name="features" value="${escapeHtml((product?.features || []).join(', '))}" placeholder="Удаан эдэлгээтэй, Баталгаат, Өндөр Чанар">
                </div>
                <div class="form-row">
                    <label>Дараалал (байрлал, 0 = эхний)</label>
                    <input type="number" name="order" value="${product ? product.order : 0}" min="0">
                </div>
                <div class="form-row">
                    <label>Зургууд</label>
                    ${currentImages ? `<div class="current-image-preview">${currentImages}</div>` : ''}
                    <input type="file" name="images" accept="image/*" multiple>
                    <p class="section-hint" style="margin:0.25rem 0 0;">Шинэ зураг оруулбал энэ бүтээгдэхүүний бүх зургийг (галерейг оролцуулан) орлуулна. Одоогийн зургийг хадгалахыг хүсвэл хоосон орхино уу.</p>
                </div>
                <p class="error-text" role="alert" id="product-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="product-cancel">Цуцлах</button>
                </div>
            </form>`;

        document.getElementById('product-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('product-form', {
            errorElId: 'product-error',
            buildUrl: () => (isEdit ? '/api/admin/products/' + product._id : '/api/admin/products'),
            buildOptions: (form) => ({ method: isEdit ? 'PUT' : 'POST', body: new FormData(form) }),
            onSuccess: () => {
                container.innerHTML = '';
                loadProducts();
            },
        });
    }

    // ==================================================
    // Surgalt Categories
    // ==================================================

    async function loadCategories() {
        await renderList({
            url: '/api/admin/categories',
            responseKey: 'categories',
            listElId: 'surgalt-categories-list',
            emptyMessage: 'Одоогоор ангилал алга байна.',
            itemHtml: (c) => `
                ${thumbHtml(c.iconUrl)}
                <div class="item-info">
                    <div class="item-title">${escapeHtml(c.title)}</div>
                    <div class="item-subtitle">Холбоос: #${escapeHtml(c.linkSectionId)}</div>
                </div>`,
            onEdit: showCategoryForm,
            onDelete: (c) => deleteItem('/api/admin/categories/' + c._id, loadCategories),
        });
    }

    document.getElementById('surgalt-categories-add-btn').addEventListener('click', () => showCategoryForm(null));

    function showCategoryForm(category) {
        const container = document.getElementById('surgalt-categories-form-container');
        const isEdit = !!category;
        container.innerHTML = `
            <form class="admin-form" id="category-form">
                <h3>Ангилал ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(category?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Тайлбар</label>
                    <textarea name="description">${escapeHtml(category?.description)}</textarea>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Холбоос товчны бичээс</label>
                        <input type="text" name="linkText" value="${escapeHtml(category?.linkText || 'Хичээлүүдийг Үзэх')}">
                    </div>
                    <div class="form-row">
                        <label>Холбогдох Хичээлийн Бүлгийн ID</label>
                        <input type="text" name="linkSectionId" value="${escapeHtml(category?.linkSectionId)}" placeholder="beginner-courses" required>
                    </div>
                </div>
                <div class="form-row">
                    <label>Дараалал (байрлал, 0 = эхний)</label>
                    <input type="number" name="order" value="${category ? category.order : 0}" min="0">
                </div>
                <div class="form-row">
                    <label>Дүрс зураг</label>
                    ${imagePreviewHtml(category?.iconUrl, 'category-remove-icon')}
                    <input type="file" name="icon" accept="image/*">
                    <input type="text" name="iconAlt" placeholder="Дүрсний тайлбар (хараа бэрхшээлтэй хэрэглэгчдэд)" value="${escapeHtml(category?.iconAlt)}">
                </div>
                <p class="error-text" role="alert" id="category-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="category-cancel">Цуцлах</button>
                </div>
            </form>`;

        document.getElementById('category-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('category-form', {
            errorElId: 'category-error',
            buildUrl: () => (isEdit ? '/api/admin/categories/' + category._id : '/api/admin/categories'),
            buildOptions: (form) => {
                const formData = new FormData(form);
                if (document.getElementById('category-remove-icon')?.checked) formData.set('iconUrl', '');
                return { method: isEdit ? 'PUT' : 'POST', body: formData };
            },
            onSuccess: () => {
                container.innerHTML = '';
                loadCategories();
            },
        });
    }

    // ==================================================
    // Surgalt Course Sections
    // ==================================================

    let sectionsCache = [];

    async function loadCourseSections() {
        sectionsCache = await renderList({
            url: '/api/admin/courses/sections',
            responseKey: 'sections',
            listElId: 'surgalt-sections-list',
            emptyMessage: 'Одоогоор бүлэг алга байна.',
            itemHtml: (s) => `
                <div class="item-info">
                    <div class="item-title">${escapeHtml(s.title)}</div>
                    <div class="item-subtitle">ID: ${escapeHtml(s.sectionId)}</div>
                </div>`,
            onEdit: showSectionForm,
            onDelete: (s) => deleteItem(
                '/api/admin/courses/sections/' + s._id,
                [loadCourseSections, loadCourses],
                'Энэ бүлгийг устгах уу? Дотор нь байгаа бүх хичээл мөн устах болно. Энэ үйлдлийг буцаах боломжгүй.'
            ),
        });
        refreshSectionDropdowns(sectionsCache);
    }

    document.getElementById('surgalt-sections-add-btn').addEventListener('click', () => showSectionForm(null));

    function showSectionForm(section) {
        const container = document.getElementById('surgalt-sections-form-container');
        const isEdit = !!section;
        container.innerHTML = `
            <form class="admin-form" id="section-form">
                <h3>Хичээлийн Бүлэг ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Бүлгийн ID (хуудасны anchor болгож ашиглана, жишээ нь beginner-courses)</label>
                    <input type="text" name="sectionId" value="${escapeHtml(section?.sectionId)}" ${isEdit ? 'readonly' : ''} required>
                </div>
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(section?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Тайлбар</label>
                    <textarea name="description">${escapeHtml(section?.description)}</textarea>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Өнгөний хувилбар</label>
                        <select name="colorVariant">
                            <option value="" ${!section?.colorVariant ? 'selected' : ''}>Үндсэн</option>
                            <option value="courses-section-blue" ${section?.colorVariant === 'courses-section-blue' ? 'selected' : ''}>Цэнхэр</option>
                            <option value="courses-section-green" ${section?.colorVariant === 'courses-section-green' ? 'selected' : ''}>Ногоон</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Дараалал (байрлал, 0 = эхний)</label>
                        <input type="number" name="order" value="${section ? section.order : 0}" min="0">
                    </div>
                </div>
                <p class="error-text" role="alert" id="section-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="section-cancel">Цуцлах</button>
                </div>
            </form>`;

        document.getElementById('section-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('section-form', {
            errorElId: 'section-error',
            buildUrl: () => (isEdit ? '/api/admin/courses/sections/' + section._id : '/api/admin/courses/sections'),
            buildOptions: (form) => ({
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
            }),
            onSuccess: () => {
                container.innerHTML = '';
                loadCourseSections();
            },
        });
    }

    function refreshSectionDropdowns(sections) {
        document.querySelectorAll('.section-dropdown').forEach((select) => {
            const current = select.value;
            select.innerHTML = sections.map((s) => `<option value="${escapeHtml(s.sectionId)}">${escapeHtml(s.title)}</option>`).join('');
            if (current) select.value = current;
        });
    }

    // ==================================================
    // Surgalt Courses
    // ==================================================

    async function loadCourses() {
        const sectionTitle = (id) => (sectionsCache.find((s) => s.sectionId === id) || {}).title || id;

        await renderList({
            url: '/api/admin/courses',
            responseKey: 'courses',
            listElId: 'surgalt-courses-list',
            emptyMessage: 'Одоогоор хичээл алга байна.',
            itemHtml: (c) => `
                ${thumbHtml(c.imageUrl)}
                <div class="item-info">
                    <div class="item-title">${escapeHtml(c.title)}</div>
                    <div class="item-subtitle">${escapeHtml(sectionTitle(c.sectionId))} &middot; ${escapeHtml(c.categoryLabel)}</div>
                </div>`,
            onEdit: showCourseForm,
            onDelete: (c) => deleteItem('/api/admin/courses/' + c._id, loadCourses),
        });
    }

    document.getElementById('surgalt-courses-add-btn').addEventListener('click', () => showCourseForm(null));

    // Level/format labels are shared with the public course popup (html-utils.js).
    const COURSE_LEVEL_LABELS = { '': '—', ...window.COURSE_LEVELS };
    const COURSE_FORMAT_LABELS = { '': '—', ...window.COURSE_FORMATS };

    const optionsHtml = (labels, selected = '') => Object.entries(labels)
        .map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');

    function showCourseForm(course) {
        const container = document.getElementById('surgalt-courses-form-container');
        const isEdit = !!course;
        container.innerHTML = `
            <form class="admin-form" id="course-form">
                <h3>Хичээл ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Бүлэг</label>
                    <select name="sectionId" class="section-dropdown" required></select>
                </div>
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(course?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Тайлбар</label>
                    <textarea name="description">${escapeHtml(course?.description)}</textarea>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Ангиллын бичээс</label>
                        <input type="text" name="categoryLabel" value="${escapeHtml(course?.categoryLabel)}" placeholder="Хөгжүүлэлт">
                    </div>
                    <div class="form-row">
                        <label>Тэмдэг</label>
                        <select name="badge">
                            <option value="none" ${course?.badge === 'none' || !course ? 'selected' : ''}>Байхгүй</option>
                            <option value="popular" ${course?.badge === 'popular' ? 'selected' : ''}>Их эрэлттэй</option>
                            <option value="new" ${course?.badge === 'new' ? 'selected' : ''}>Шинэ</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <label>Дараалал (байрлал, 0 = эхний)</label>
                    <input type="number" name="order" value="${course ? course.order : 0}" min="0">
                </div>

                <h4 class="form-subheading">Дэлгэрэнгүй (popup)</h4>
                <p class="section-hint">"Дэлгэрэнгүй үзэх" дээр дарахад гарч ирнэ. Хоосон талбар харагдахгүй.</p>
                <div class="form-row">
                    <label>Дэлгэрэнгүй тайлбар</label>
                    <textarea name="details" rows="5" placeholder="Хоосон мөрөөр догол мөр тусгаарлана.">${escapeHtml(course?.details)}</textarea>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Үргэлжлэх хугацаа</label>
                        <input type="text" name="duration" value="${escapeHtml(course?.duration)}" placeholder="8 долоо хоног">
                    </div>
                    <div class="form-row">
                        <label>Хуваарь</label>
                        <input type="text" name="schedule" value="${escapeHtml(course?.schedule)}" placeholder="Да, Лх 19:00–21:00">
                    </div>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Эхлэх огноо</label>
                        <input type="date" name="startDate" value="${course?.startDate ? String(course.startDate).slice(0, 10) : ''}">
                    </div>
                    <div class="form-row">
                        <label>Багш</label>
                        <input type="text" name="instructor" value="${escapeHtml(course?.instructor)}">
                    </div>
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Түвшин</label>
                        <select name="level">
                            ${optionsHtml(COURSE_LEVEL_LABELS, course?.level)}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Хэлбэр</label>
                        <select name="format">
                            ${optionsHtml(COURSE_FORMAT_LABELS, course?.format)}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <label>Юу сурах вэ (мөр бүрт нэг)</label>
                    <textarea name="outcomes" rows="4" placeholder="React-ийн үндсийг ойлгоно&#10;Өөрийн вэб апп бүтээнэ">${escapeHtml((course?.outcomes || []).join('\n'))}</textarea>
                </div>
                <div class="form-row">
                    <label>Шаардлага (мөр бүрт нэг)</label>
                    <textarea name="requirements" rows="3" placeholder="Компьютер ашиглах анхан шатны чадвар">${escapeHtml((course?.requirements || []).join('\n'))}</textarea>
                </div>
                <div class="form-row">
                    <label>Зураг</label>
                    ${imagePreviewHtml(course?.imageUrl, 'course-remove-image')}
                    <input type="file" name="image" accept="image/*">
                    <input type="text" name="imageAlt" placeholder="Зургийн тайлбар (хараа бэрхшээлтэй хэрэглэгчдэд)" value="${escapeHtml(course?.imageAlt)}">
                </div>
                <p class="error-text" role="alert" id="course-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="course-cancel">Цуцлах</button>
                </div>
            </form>`;

        refreshSectionDropdowns(sectionsCache);
        if (course) document.querySelector('.section-dropdown').value = course.sectionId;

        document.getElementById('course-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('course-form', {
            errorElId: 'course-error',
            buildUrl: () => (isEdit ? '/api/admin/courses/' + course._id : '/api/admin/courses'),
            buildOptions: (form) => {
                const formData = new FormData(form);
                if (document.getElementById('course-remove-image')?.checked) formData.set('imageUrl', '');
                return { method: isEdit ? 'PUT' : 'POST', body: formData };
            },
            onSuccess: () => {
                container.innerHTML = '';
                loadCourses();
            },
        });
    }

    // ==================================================
    // Zuwluguu Advice Cards
    // ==================================================

    async function loadAdviceCards() {
        await renderList({
            url: '/api/admin/advice-cards',
            responseKey: 'cards',
            listElId: 'zuwluguu-advice-list',
            emptyMessage: 'Одоогоор зөвлөгөөний карт алга байна.',
            itemHtml: (c) => `
                <div class="item-info">
                    <div class="item-title">${escapeHtml(c.title)}</div>
                    <div class="item-subtitle">${escapeHtml(c.content)}</div>
                </div>`,
            onEdit: showAdviceCardForm,
            onDelete: (c) => deleteItem('/api/admin/advice-cards/' + c._id, loadAdviceCards),
        });
    }

    document.getElementById('zuwluguu-advice-add-btn').addEventListener('click', () => showAdviceCardForm(null));

    function showAdviceCardForm(card) {
        const container = document.getElementById('zuwluguu-advice-form-container');
        const isEdit = !!card;
        container.innerHTML = `
            <form class="admin-form" id="advice-form">
                <h3>Зөвлөгөөний Карт ${isEdit ? 'засах' : 'нэмэх'}</h3>
                <div class="form-row">
                    <label>Гарчиг</label>
                    <input type="text" name="title" value="${escapeHtml(card?.title)}" required>
                </div>
                <div class="form-row">
                    <label>Картын текст</label>
                    <textarea name="content">${escapeHtml(card?.content)}</textarea>
                </div>
                <div class="form-row">
                    <label>Дүрсний SVG зам (icon-ий "d" утга)</label>
                    <input type="text" name="iconSvgPath" value="${escapeHtml(card?.iconSvgPath)}" placeholder="M12 2L2 7l10 5 10-5-10-5z">
                </div>
                <div class="form-row-pair">
                    <div class="form-row">
                        <label>Холбоосын бичээс</label>
                        <input type="text" name="linkText" value="${escapeHtml(card?.linkText || 'Дэлгэрэнгүй Үзэх')}">
                    </div>
                    <div class="form-row">
                        <label>Дараалал (байрлал, 0 = эхний)</label>
                        <input type="number" name="order" value="${card ? card.order : 0}" min="0">
                    </div>
                </div>
                <h3 style="margin-top:0.5rem;">Жишээ Судалгааны Popup</h3>
                <p class="section-hint">Хэрэглэгч энэ картын холбоос дээр дарахад харагдана.</p>
                <div class="form-row">
                    <label>Popup-ийн гарчиг</label>
                    <input type="text" name="studyTitle" value="${escapeHtml(card?.studyTitle)}">
                </div>
                <div class="form-row">
                    <label>Popup-ийн текст</label>
                    <textarea name="studyContent">${escapeHtml(card?.studyContent)}</textarea>
                </div>
                <div class="form-row">
                    <label>"Бүрэн Судалгааг Үзэх" холбоосын URL</label>
                    <input type="text" name="studyLink" value="${escapeHtml(card?.studyLink || '#')}">
                </div>
                <p class="error-text" role="alert" id="advice-error"></p>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Хадгалах</button>
                    <button type="button" class="btn-secondary" id="advice-cancel">Цуцлах</button>
                </div>
            </form>`;

        document.getElementById('advice-cancel').addEventListener('click', () => { container.innerHTML = ''; });

        bindAdminForm('advice-form', {
            errorElId: 'advice-error',
            buildUrl: () => (isEdit ? '/api/admin/advice-cards/' + card._id : '/api/admin/advice-cards'),
            buildOptions: (form) => ({
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
            }),
            onSuccess: () => {
                container.innerHTML = '';
                loadAdviceCards();
            },
        });
    }

    // ---------------- Init ----------------
    checkAuth();
})();
