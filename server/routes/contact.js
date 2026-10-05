const { Router } = require('express');
const ContactSubmission = require('../models/ContactSubmission.js');
const { sendContactMail } = require('../mailer.js');
const asyncHandler = require('../asyncHandler.js');
const createRateLimiter = require('../rateLimit.js');

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{8}$/;

const contactRateLimit = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Хэт олон удаа илгээлээ. Түр хүлээгээд дахин оролдоно уу.',
});

router.post('/', contactRateLimit, asyncHandler(async (req, res) => {
    const { name, phone, email, subject, message, sourcePage } = req.body || {};

    if (!name || !String(name).trim() || !email || !String(email).trim() || !message || !String(message).trim()) {
        return res.status(400).json({ success: false, message: 'Шаардлагатай бүх талбарыг бөглөнө үү.' });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, message: 'Зөв имэйл хаяг оруулна уу.' });
    }

    if (phone && !PHONE_REGEX.test(String(phone).replace(/[\s\-()]/g, ''))) {
        return res.status(400).json({ success: false, message: '8 оронтой зөв утасны дугаар оруулна уу.' });
    }

    const fields = {
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : '',
        email: String(email).trim(),
        subject: subject ? String(subject).trim() : '',
        message: String(message).trim(),
        sourcePage: sourcePage ? String(sourcePage).trim() : '',
    };

    await ContactSubmission.create(fields);

    try {
        await sendContactMail(fields);
        return res.json({ success: true, message: 'Холбогдсонд баярлалаа! Бид тантай удахгүй холбогдох болно.' });
    } catch (error) {
        console.error('Failed to send contact email:', error);
        return res.status(502).json({
            success: false,
            message: 'Таны мессежийг хадгалсан ч мэдэгдэл имэйл илгээж чадсангүй. Бид тантай холбогдох болно.',
        });
    }
}));

module.exports = router;
