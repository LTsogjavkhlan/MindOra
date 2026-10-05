const { Router } = require('express');
const bcrypt = require('bcrypt');
const AdminUser = require('../models/AdminUser.js');
const asyncHandler = require('../asyncHandler.js');
const createRateLimiter = require('../rateLimit.js');

const router = Router();

const loginRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Хэт олон удаа оролдлоо. 15 минутын дараа дахин оролдоно уу.',
});

router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
    // Coerce to strings so a JSON object like {"$ne": null} can never reach the query.
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Нэвтрэх нэр болон нууц үгээ оруулна уу.' });
    }

    const admin = await AdminUser.findOne({ username });
    if (!admin) {
        return res.status(401).json({ success: false, message: 'Нэвтрэх нэр эсвэл нууц үг буруу байна.' });
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Нэвтрэх нэр эсвэл нууц үг буруу байна.' });
    }

    await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.isAdmin = true;
    req.session.username = admin.username;
    await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
    });
    res.json({ success: true, username: admin.username });
}));

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

router.get('/me', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ success: true, username: req.session.username });
    }
    res.status(401).json({ success: false });
});

module.exports = router;
