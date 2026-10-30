// Surgalt: "Дэлгэрэнгүй үзэх" opens a popup with the course's full details and
// an enrollment request form (posted to /api/enrollments, no login needed).
(function () {
    'use strict';

    const BADGES = { popular: 'Түгээмэл', new: 'Шинэ' };

    const courses = new Map(); // id -> course (from the page's CMS data)
    let current = null;        // course shown in the dialog
    let opener = null;         // button that opened it, for returning focus

    const dialog = document.getElementById('course-dialog');
    const media = dialog.querySelector('.course-dialog-media');
    const tags = dialog.querySelector('.course-dialog-tags');
    const title = dialog.querySelector('.course-dialog-title');
    const facts = dialog.querySelector('.course-facts');
    const text = dialog.querySelector('.course-dialog-text');
    const outcomes = dialog.querySelector('.course-outcomes');
    const requirements = dialog.querySelector('.course-requirements');
    const form = dialog.querySelector('.enroll-form');
    const notice = dialog.querySelector('.enroll-notice');
    const submitBtn = dialog.querySelector('.enroll-submit');
    const success = dialog.querySelector('.enroll-success');
    const scrollArea = dialog.querySelector('.course-dialog-scroll');

    // ---------------- Rendering ----------------

    // Plain text with blank lines between paragraphs -> <p> elements (escaped).
    const paragraphs = (value) => String(value || '')
        .split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`).join('');

    function renderList(block, items) {
        block.hidden = !items?.length;
        block.querySelector('ul').innerHTML = (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    }

    function render(course) {
        media.innerHTML = course.imageUrl
            ? `<img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(course.imageAlt)}">`
            : '';
        media.hidden = !course.imageUrl;

        tags.innerHTML = [
            course.categoryLabel && `<span class="course-tag">${escapeHtml(course.categoryLabel)}</span>`,
            BADGES[course.badge] && `<span class="course-tag course-tag-${course.badge}">${BADGES[course.badge]}</span>`,
        ].filter(Boolean).join('');

        title.textContent = course.title;

        // Only facts the admin filled in.
        const factRows = [
            ['Хугацаа', course.duration],
            ['Хуваарь', course.schedule],
            ['Эхлэх огноо', course.startDate && formatDate(course.startDate, { utc: true })],
            ['Түвшин', COURSE_LEVELS[course.level]],
            ['Хэлбэр', COURSE_FORMATS[course.format]],
            ['Багш', course.instructor],
        ].filter(([, value]) => value);
        facts.innerHTML = factRows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
        facts.hidden = !factRows.length;

        text.innerHTML = paragraphs(course.details) || paragraphs(course.description);

        renderList(outcomes, course.outcomes);
        renderList(requirements, course.requirements);
    }

    // ---------------- Open / close ----------------

    function open(course, trigger) {
        current = course;
        opener = trigger;
        render(course);
        resetForm();
        dialog.showModal();
        scrollArea.scrollTop = 0;
    }

    dialog.addEventListener('close', () => opener?.focus());
    dialog.querySelector('.course-dialog-close').addEventListener('click', () => dialog.close());
    // Clicking the dimmed backdrop (the dialog element itself) closes it.
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    // Course cards are rendered from the CMS after load, so delegate.
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.course-link[data-course]');
        const course = button && courses.get(button.dataset.course);
        if (course) open(course, button);
    });

    // ---------------- Enrollment ----------------

    function resetForm() {
        form.reset();
        form.hidden = false;
        success.hidden = true;
        clearErrors();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Бүртгүүлэх хүсэлт илгээх';
    }

    function clearErrors() {
        form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
        notice.hidden = true;
    }

    function fieldError(name, message) {
        form.querySelector(`#enroll-${name}-error`).textContent = message;
        form.elements[name].setAttribute('aria-invalid', 'true');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const value = (name) => form.elements[name].value.trim();
        const values = { name: value('name'), phone: value('phone'), email: value('email'), note: value('note') };
        if (!values.name) fieldError('name', 'Нэрээ оруулна уу.');
        if (!isValidPhone(values.phone)) fieldError('phone', '8 оронтой утасны дугаар оруулна уу (жишээ нь 99112233).');
        if (!isValidEmail(values.email)) fieldError('email', 'Зөв имэйл хаяг оруулна уу (жишээ нь name@gmail.com).');
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) return firstInvalid.focus();

        submitBtn.disabled = true;
        submitBtn.textContent = 'Илгээж байна…';
        try {
            const response = await fetch('/api/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: current._id, ...values, website: form.elements.website.value }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Хүсэлт илгээхэд алдаа гарлаа. Дахин оролдоно уу.');

            form.hidden = true;
            success.hidden = false;
            success.querySelector('p').innerHTML =
                `<strong>${escapeHtml(current.title)}</strong> хичээлийн бүртгэлийн хүсэлтийг хүлээн авлаа. ` +
                `Баталгаажуулах имэйлийг ${escapeHtml(values.email)} хаяг руу илгээлээ. Бид тантай удахгүй холбогдоно.`;
        } catch (error) {
            notice.textContent = error.message;
            notice.hidden = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Бүртгүүлэх хүсэлт илгээх';
        }
    });

    // ---------------- Init ----------------

    document.addEventListener('content:rendered', (e) => {
        (e.detail?.courses || []).forEach((course) => courses.set(String(course._id), course));
    });
})();
