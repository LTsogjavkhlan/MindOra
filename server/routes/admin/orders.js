const { Router } = require('express');
const asyncHandler = require('../../asyncHandler.js');
const Order = require('../../models/Order.js');
const { ORDER_STATUSES } = require('../../models/Order.js');
const { setOrderStatus } = require('../../orders.js');

const router = Router();

const LIST_LIMIT = 200;

// Newest first, optionally one status; `counts` drives the tab badges.
router.get('/', asyncHandler(async (req, res) => {
    const filter = ORDER_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const [orders, grouped] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    grouped.forEach((g) => { counts[g._id] = g.count; });
    res.json({ success: true, orders, counts });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Төлөв буруу байна.' });
    }
    const order = await setOrderStatus(req.params.id, status);
    res.json({ success: true, order });
}));

module.exports = router;
