// Shared contact form handler for index.html, TD.html, surgalt.html and zuwluguu.html.
// Submits to the Express/Nodemailer backend at POST /api/contact instead of EmailJS.
document.addEventListener('DOMContentLoaded', initContactForm);

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_REGEX = /^\d{8}$/;

    const submitButton = form.querySelector('button[type="submit"]');
    const submitButtonLabel = submitButton ? submitButton.querySelector('span') : null;
    const originalButtonText = submitButtonLabel ? submitButtonLabel.textContent : (submitButton ? submitButton.textContent : '');

    let statusEl = form.querySelector('#submit-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'submit-status';
        statusEl.className = 'form-status';
        statusEl.setAttribute('aria-live', 'polite');
        const buttonWrap = form.querySelector('.button-wrap');
        if (buttonWrap) {
            buttonWrap.insertAdjacentElement('afterend', statusEl);
        } else {
            form.appendChild(statusEl);
        }
    }

    function showStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = `form-status ${type}`;
        statusEl.style.display = 'block';
    }

    function clearFieldErrors() {
        form.querySelectorAll('.error-message').forEach((el) => {
            el.textContent = '';
        });
        form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    }

    function showFieldError(field, message) {
        const errorEl = form.querySelector(`#${field}-error`);
        if (errorEl) {
            errorEl.textContent = message;
        }
        form.querySelector(`#${field}`)?.setAttribute('aria-invalid', 'true');
    }

    function setLoading(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading;
        const target = submitButtonLabel || submitButton;
        target.textContent = isLoading ? 'Илгээж байна…' : originalButtonText;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        clearFieldErrors();
        statusEl.style.display = 'none';

        const name = form.querySelector('#name').value.trim();
        const phone = form.querySelector('#phone').value.trim();
        const email = form.querySelector('#email').value.trim();
        const subject = form.querySelector('#subject').value.trim();
        const message = form.querySelector('#message').value.trim();

        let hasError = false;
        if (!name) {
            showFieldError('name', 'Нэрээ оруулна уу.');
            hasError = true;
        }
        if (!email) {
            showFieldError('email', 'Имэйл хаягаа оруулна уу.');
            hasError = true;
        } else if (!EMAIL_REGEX.test(email)) {
            showFieldError('email', 'Зөв имэйл хаяг оруулна уу.');
            hasError = true;
        }
        if (!message) {
            showFieldError('message', 'Мессежээ оруулна уу.');
            hasError = true;
        }
        if (phone && !PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ''))) {
            showFieldError('phone', '8 оронтой зөв утасны дугаар оруулна уу.');
            hasError = true;
        }

        if (hasError) {
            form.querySelector('[aria-invalid="true"]')?.focus();
            showStatus('Тэмдэглэсэн талбаруудыг засна уу.', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, email, subject, message, sourcePage: document.title }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Мессеж илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
            }

            showStatus(data.message || 'Мессежийг тань хүлээж авлаа. Баярлалаа!', 'success');
            form.reset();
        } catch (error) {
            console.error('Contact form submission failed:', error);
            showStatus(error.message || 'Мессеж илгээхэд алдаа гарлаа. Дахин оролдоно уу.', 'error');
        } finally {
            setLoading(false);
        }
    });
}
