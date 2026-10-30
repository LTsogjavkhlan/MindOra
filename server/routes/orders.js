const { Router } = require('express');
const { mongoose } = require('../db.js');
const asyncHandler = require('../asyncHandler.js');
const createRateLimiter = require('../rateLimit.js');
const { placeOrder } = require('../orders.js');
const { sendOrderNotification, sendOrderConfirmation } = require('../mailer.js');
const { EMAIL_REGEX, PHONE_REGEX, normalizePhone, cleanText } = require('../validation.js');

const router = Router();

const MAX_LINES = 30;
const MAX_QUANTITY = 99;

const orderRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Хэт олон захиалга илгээлээ. Түр хүлээгээд дахин оролдоно уу.',
});

const badRequest = (res, message) => res.status(400).json({ success: false, message });

router.post('/', orderRateLimit, asyncHandler(async (req, res) => {
    const body = req.body || {};

    // Honeypot: a field hidden from people that bots tend to fill in.
    if (cleanText(body.website)) return badRequest(res, 'Хүсэлт буруу байна.');

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.length > MAX_LINES) return badRequest(res, 'Сагс хоосон байна.');
    const requested = [];
    for (const item of items) {
        const productId = typeof item?.productId === 'string' ? item.productId : '';
        const quantity = Number(item?.quantity);
        if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
            return badRequest(res, 'Сагсанд буруу бүтээгдэхүүн байна.');
        }
        requested.push({ productId, quantity });
    }

    const c = body.customer || {};
    const customer = {
        name: cleanText(c.name, 100),
        phone: normalizePhone(cleanText(c.phone, 30)),
        email: cleanText(c.email, 200),
        address: cleanText(c.address, 500),
        note: cleanText(c.note, 500),
    };
    if (!customer.name) return badRequest(res, 'Нэрээ оруулна уу.');
    if (!PHONE_REGEX.test(customer.phone)) return badRequest(res, '8 оронтой зөв утасны дугаар оруулна уу.');
    if (!EMAIL_REGEX.test(customer.email)) return badRequest(res, 'Зөв имэйл хаяг оруулна уу.');
    if (customer.address.length < 5) return badRequest(res, 'Хүргэх хаягаа дэлгэрэнгүй оруулна уу.');

    let order;
    try {
        order = await placeOrder(requested, customer);
    } catch (error) {
        if (error.shortages) {
            return res.status(error.status).json({ success: false, message: error.message, shortages: error.shortages });
        }
        throw error;
    }

    // The order is saved; an email hiccup shouldn't turn it into an error for the customer.
    Promise.allSettled([sendOrderNotification(order), sendOrderConfirmation(order)]).then((results) => {
        results.filter((r) => r.status === 'rejected')
            .forEach((r) => console.error(`Order #${order.orderNumber} email failed:`, r.reason));
    });

    res.status(201).json({
        success: true,
        orderNumber: order.orderNumber,
        total: order.total,
        message: `Захиалга #${order.orderNumber} амжилттай. Бид тантай удахгүй холбогдоно.`,
    });
}));

module.exports = router;
