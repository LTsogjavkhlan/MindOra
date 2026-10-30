// Shared by content-loader.js, zuwluguu.js and admin.js so the escaping logic
// has one source of truth instead of being copy-pasted into each file.
window.escapeHtml = function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Form rules shared by the contact form, checkout and course enrollment
// (the server applies the same rules in server/validation.js).
window.isValidPhone = (value) => /^\d{8}$/.test(String(value).replace(/[\s\-()]/g, ''));
window.isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// Course level/format values (server/models/Course.js) -> labels.
window.COURSE_LEVELS = { beginner: 'Анхан', intermediate: 'Дунд', advanced: 'Ахисан' };
window.COURSE_FORMATS = { online: 'Онлайн', classroom: 'Танхим', hybrid: 'Хосолсон' };

// Whole tögrög -> "1,289,000₮" (the site's existing price style).
const PRICE_FORMAT = new Intl.NumberFormat('mn-MN');
window.formatPrice = function formatPrice(amount) {
    return `${PRICE_FORMAT.format(Number(amount) || 0)}₮`;
};

// "2024.03.15" / "2024.03.15 16:43". Numeric on purpose: Chrome ships without
// Mongolian locale data, so Intl month names silently fall back to English.
window.formatDate = function formatDate(value, { time = false, utc = false } = {}) {
    const d = new Date(value);
    const get = (local, utcGetter) => (utc ? d[utcGetter]() : d[local]());
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${get('getFullYear', 'getUTCFullYear')}.${pad(get('getMonth', 'getUTCMonth') + 1)}.${pad(get('getDate', 'getUTCDate'))}`;
    return time ? `${date} ${pad(get('getHours', 'getUTCHours'))}:${pad(get('getMinutes', 'getUTCMinutes'))}` : date;
};

// CMS links may only be relative paths, #anchors, http(s), mailto: or tel:.
// Anything else (javascript:, data:, ...) is replaced with "#".
window.safeUrl = function safeUrl(value) {
    const url = String(value == null ? '' : value).trim();
    if (!url) return '';
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.replace(/[\s\u0000-\u001f]/g, ''));
    return !scheme || /^(https?|mailto|tel)$/i.test(scheme[1]) ? url : '#';
};

// For CMS-authored rich text (e.g. case-study bodies): keeps only basic
// formatting tags, drops every attribute except a safe href on links.
const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H3', 'H4', 'BLOCKQUOTE', 'A']);

window.sanitizeHtml = function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html');
    (function clean(node) {
        [...node.children].forEach((el) => {
            if (!ALLOWED_TAGS.has(el.tagName)) {
                // Keep the text of unknown tags, but not of script/style-like ones.
                if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) el.remove();
                else { clean(el); el.replaceWith(...el.childNodes); }
                return;
            }
            const href = el.tagName === 'A' ? window.safeUrl(el.getAttribute('href')) : '';
            [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
            if (href) el.setAttribute('href', href);
            clean(el);
        });
    })(doc.body);
    return doc.body.innerHTML;
};
