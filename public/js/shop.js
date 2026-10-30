// TD shop: cart (kept in this browser), add-to-cart buttons, and a guest
// checkout that posts to /api/orders. Product names, prices and stock always
// come from the freshly loaded page data; storage only holds ids + quantities.
(function () {
    'use strict';

    const STORAGE_KEY = 'mindora-cart';
    const LOW_STOCK = 3;

    const products = new Map(); // id -> { _id, title, price, stock, image }
    let cart = loadCart();      // [{ productId, quantity }]

    const toggleBtn = document.querySelector('.cart-toggle');
    const countEl = toggleBtn.querySelector('.cart-count');
    const announcer = document.getElementById('cart-announcer');
    const dialog = document.getElementById('cart-dialog');
    const itemsEl = dialog.querySelector('.cart-items');
    const emptyEl = dialog.querySelector('.cart-empty');
    const noticeEl = dialog.querySelector('.cart-notice');
    const form = dialog.querySelector('.checkout-form');
    const totalEl = dialog.querySelector('.cart-total-amount');
    const submitBtn = dialog.querySelector('.cart-footer .checkout-submit');
    const panel = dialog.querySelector('.cart-panel');
    const cartViews = [dialog.querySelector('.cart-body'), dialog.querySelector('.cart-footer')];
    const confirmation = dialog.querySelector('.order-confirmation');

    // ---------------- Storage ----------------

    function loadCart() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved.filter((l) => l && typeof l.productId === 'string' && l.quantity > 0) : [];
        } catch {
            return [];
        }
    }

    function saveCart() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage unavailable: cart lasts for this page view */ }
    }

    // ---------------- Cart model ----------------

    const lineFor = (id) => cart.find((l) => l.productId === id);
    const cartCount = () => cart.reduce((n, l) => n + l.quantity, 0);
    const cartTotal = () => cart.reduce((sum, l) => sum + products.get(l.productId).price * l.quantity, 0);

    // Drop products that no longer exist and clamp quantities to current stock.
    function reconcileCart() {
        cart = cart
            .filter((l) => products.has(l.productId))
            .map((l) => ({ ...l, quantity: Math.min(l.quantity, products.get(l.productId).stock) }))
            .filter((l) => l.quantity > 0);
        saveCart();
    }

    function setQuantity(id, quantity) {
        const stock = products.get(id).stock;
        const q = Math.max(0, Math.min(quantity, stock));
        const line = lineFor(id);
        if (q === 0) cart = cart.filter((l) => l.productId !== id);
        else if (line) line.quantity = q;
        else cart.push({ productId: id, quantity: q });
        saveCart();
        render();
    }

    // ---------------- Rendering ----------------

    function stockLabel(stock) {
        if (stock === 0) return '<span class="product-stock is-out">Дууссан</span>';
        if (stock <= LOW_STOCK) return `<span class="product-stock is-low">Үлдсэн: ${stock}</span>`;
        return '<span class="product-stock">Бэлэн байгаа</span>';
    }

    function renderBuyAreas() {
        document.querySelectorAll('.product-buy[data-product-id]').forEach((el) => {
            const p = products.get(el.dataset.productId);
            if (!p) return;
            const inCart = lineFor(p._id)?.quantity || 0;
            const full = inCart >= p.stock;
            el.innerHTML = `
                ${stockLabel(p.stock)}
                <button type="button" class="add-to-cart" data-add="${p._id}" ${full ? 'disabled' : ''}>
                    ${p.stock === 0 ? 'Дууссан' : full ? 'Бүгд сагсанд' : 'Сагсанд нэмэх'}
                </button>`;
        });
    }

    function renderCart() {
        const count = cartCount();
        toggleBtn.hidden = count === 0 && !dialog.open;
        countEl.textContent = count;
        toggleBtn.setAttribute('aria-label', `Сагс, ${count} бүтээгдэхүүн`);

        itemsEl.innerHTML = cart.map((l) => {
            const p = products.get(l.productId);
            return `
                <li class="cart-item">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" class="cart-item-image" width="56" height="56">` : '<span class="cart-item-image"></span>'}
                    <div class="cart-item-info">
                        <span class="cart-item-title">${escapeHtml(p.title)}</span>
                        <span class="cart-item-price">${formatPrice(p.price)}</span>
                    </div>
                    <div class="qty" role="group" aria-label="${escapeHtml(p.title)}: тоо ширхэг">
                        <button type="button" data-qty="${p._id}" data-step="-1" aria-label="Нэгээр хасах">&minus;</button>
                        <span class="qty-value" aria-live="polite">${l.quantity}</span>
                        <button type="button" data-qty="${p._id}" data-step="1" aria-label="Нэгээр нэмэх" ${l.quantity >= p.stock ? 'disabled' : ''}>+</button>
                    </div>
                    <button type="button" class="cart-item-remove" data-remove="${p._id}" aria-label="${escapeHtml(p.title)}-г хасах">&times;</button>
                </li>`;
        }).join('');

        const empty = cart.length === 0;
        emptyEl.hidden = !empty;
        form.hidden = empty;
        totalEl.textContent = formatPrice(empty ? 0 : cartTotal());
        submitBtn.disabled = empty;
        submitBtn.textContent = empty ? 'Захиалга өгөх' : `Захиалга өгөх · ${formatPrice(cartTotal())}`;
    }

    function render() {
        renderBuyAreas();
        renderCart();
    }

    // ---------------- Interaction ----------------

    let announceTimer;
    function announce(message) {
        announcer.textContent = '';
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => { announcer.textContent = message; }, 50);
    }

    // Add-to-cart buttons live inside CMS-rendered cards, so delegate.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-add]');
        if (!btn) return;
        const p = products.get(btn.dataset.add);
        if (!p) return;
        setQuantity(p._id, (lineFor(p._id)?.quantity || 0) + 1);
        announce(`${p.title} сагсанд нэмэгдлээ. Сагсанд ${cartCount()} бүтээгдэхүүн байна.`);
        toggleBtn.classList.remove('bump');
        void toggleBtn.offsetWidth; // restart the CSS bump animation
        toggleBtn.classList.add('bump');
    });

    function openCart() {
        noticeEl.hidden = true;
        dialog.showModal();
        renderCart();
    }

    function closeCart() {
        dialog.close();
    }

    toggleBtn.addEventListener('click', openCart);
    dialog.addEventListener('close', () => {
        setConfirmationVisible(false);
        renderCart();
        // The toggle hides once the cart is empty; don't send focus to a hidden button.
        if (!toggleBtn.hidden) toggleBtn.focus();
    });
    // Clicking the dimmed backdrop (the dialog element itself) closes it.
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeCart();
    });

    // Quantity, remove and close buttons inside the panel.
    panel.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('button[data-qty]');
        if (qtyBtn) {
            const id = qtyBtn.dataset.qty;
            setQuantity(id, lineFor(id).quantity + Number(qtyBtn.dataset.step));
            return;
        }
        const removeBtn = e.target.closest('button[data-remove]');
        if (removeBtn) {
            const p = products.get(removeBtn.dataset.remove);
            setQuantity(p._id, 0);
            announce(`${p.title} сагснаас хасагдлаа.`);
            dialog.querySelector('.cart-close').focus();
            return;
        }
        if (e.target.closest('.cart-close, .confirmation-close')) closeCart();
    });

    // ---------------- Checkout ----------------

    function showFieldError(name, message) {
        const input = form.elements[name];
        const errorEl = form.querySelector(`#checkout-${name}-error`);
        if (errorEl) errorEl.textContent = message;
        input.setAttribute('aria-invalid', 'true');
    }

    function clearErrors() {
        form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
        noticeEl.hidden = true;
    }

    function validate(values) {
        if (!values.name) showFieldError('name', 'Нэрээ оруулна уу.');
        if (!isValidPhone(values.phone)) showFieldError('phone', '8 оронтой утасны дугаар оруулна уу (жишээ нь 99112233).');
        if (!isValidEmail(values.email)) showFieldError('email', 'Зөв имэйл хаяг оруулна уу (жишээ нь name@gmail.com).');
        if (values.address.length < 5) showFieldError('address', 'Хүргэх хаягаа дэлгэрэнгүй оруулна уу.');
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        firstInvalid?.focus();
        return !firstInvalid;
    }

    function showNotice(message) {
        noticeEl.textContent = message;
        noticeEl.hidden = false;
    }

    // Server says some items ran short: take its stock numbers, fix the cart.
    function applyShortages(shortages) {
        shortages.forEach(({ productId, available }) => {
            const p = products.get(productId);
            if (p) p.stock = available;
        });
        reconcileCart();
        render();
        const names = shortages.map((s) => (s.available > 0 ? `${s.title} (үлдсэн ${s.available})` : `${s.title} (дууссан)`));
        showNotice(`Үлдэгдэл өөрчлөгдсөн тул сагсыг шинэчиллээ: ${names.join(', ')}. Шалгаад дахин захиална уу.`);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!cart.length) return;
        clearErrors();

        const field = (name) => form.elements[name].value.trim();
        const values = { name: field('name'), phone: field('phone'), email: field('email'), address: field('address'), note: field('note') };
        if (!validate(values)) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Илгээж байна…';
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    customer: values,
                    website: form.elements.website.value,
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (response.status === 409 && data.shortages) return applyShortages(data.shortages);
            if (!response.ok || !data.success) throw new Error(data.message || 'Захиалга илгээхэд алдаа гарлаа. Дахин оролдоно уу.');

            // Reserve the stock locally too, so the cards show the new numbers.
            cart.forEach((l) => { products.get(l.productId).stock -= l.quantity; });
            cart = [];
            saveCart();
            form.reset();
            renderBuyAreas();
            showConfirmation(data.orderNumber, values.email);
        } catch (error) {
            showNotice(error.message);
        } finally {
            renderCart();
        }
    });

    function setConfirmationVisible(visible) {
        confirmation.hidden = !visible;
        cartViews.forEach((el) => { el.hidden = visible; });
        dialog.setAttribute('aria-labelledby', visible ? 'confirmation-title' : 'cart-title');
    }

    function showConfirmation(orderNumber, email) {
        const title = confirmation.querySelector('.confirmation-title');
        title.id = 'confirmation-title';
        title.textContent = `Захиалга #${orderNumber} амжилттай!`;
        confirmation.querySelector('.confirmation-text').innerHTML =
            `Баталгаажуулах имэйлийг <strong>${escapeHtml(email)}</strong> хаяг руу илгээлээ. ` +
            'Бид тантай удахгүй утсаар холбогдож хүргэлтийг тохирно.';
        setConfirmationVisible(true);
        title.focus();
    }

    // ---------------- Init ----------------

    document.addEventListener('content:rendered', (e) => {
        const data = e.detail;
        if (!data || !Array.isArray(data.products)) return;
        data.products.forEach((p) => {
            products.set(String(p._id), {
                _id: String(p._id),
                title: p.title,
                price: Number(p.price) || 0,
                stock: Number(p.stock) || 0,
                image: p.images && p.images[0] ? p.images[0].url : '',
            });
        });
        reconcileCart();
        render();
    });
})();
