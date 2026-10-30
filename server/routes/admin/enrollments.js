const { Router } = require('express');
const asyncHandler = require('../../asyncHandler.js');
const Enrollment = require('../../models/Enrollment.js');
const { ENROLLMENT_STATUSES } = require('../../models/Enrollment.js');

const router = Router();

const LIST_LIMIT = 200;

// Newest first, optionally one status; `counts` drives the tab badges.
router.get('/', asyncHandler(async (req, res) => {
    const filter = ENROLLMENT_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const [enrollments, grouped] = await Promise.all([
        Enrollment.find(filter).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
        Enrollment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(ENROLLMENT_STATUSES.map((s) => [s, 0]));
    grouped.forEach((g) => { counts[g._id] = g.count; });
    res.json({ success: true, enrollments, counts });
}));

// No stock involved, so any status can move to any other (e.g. undo a mistake).
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!ENROLLMENT_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Төлөв буруу байна.' });
    }
    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Бүртгэл олдсонгүй.' });
    res.json({ success: true, enrollment });
}));

module.exports = router;
