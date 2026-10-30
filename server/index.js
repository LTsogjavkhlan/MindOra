require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { connectDB } = require('./db.js');
const contactRouter = require('./routes/contact.js');
const authRouter = require('./routes/auth.js');
const contentRouter = require('./routes/content.js');
const ordersRouter = require('./routes/orders.js');
const enrollmentsRouter = require('./routes/enrollments.js');
const adminHeroRouter = require('./routes/admin/hero.js');
const adminCategoriesRouter = require('./routes/admin/categories.js');
const adminCoursesRouter = require('./routes/admin/courses.js');
const adminProductsRouter = require('./routes/admin/products.js');
const adminAdviceCardsRouter = require('./routes/admin/adviceCards.js');
const adminOrdersRouter = require('./routes/admin/orders.js');
const adminEnrollmentsRouter = require('./routes/admin/enrollments.js');
const requireAuth = require('./middleware/requireAuth.js');

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set in .env');
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Only trust X-Forwarded-* when a proxy is actually in front (see .env.example);
// otherwise clients could spoof their IP and dodge the rate limiters.
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
    },
}));

app.use('/api/contact', contactRouter);
app.use('/api/admin', authRouter);
app.use('/api/content', contentRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/admin/hero', requireAuth, adminHeroRouter);
app.use('/api/admin/categories', requireAuth, adminCategoriesRouter);
app.use('/api/admin/courses', requireAuth, adminCoursesRouter);
app.use('/api/admin/products', requireAuth, adminProductsRouter);
app.use('/api/admin/advice-cards', requireAuth, adminAdviceCardsRouter);
app.use('/api/admin/orders', requireAuth, adminOrdersRouter);
app.use('/api/admin/enrollments', requireAuth, adminEnrollmentsRouter);
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found.' }));

// The built site (`npm run build` -> dist/). In development Vite serves the
// frontend instead, so this is a no-op until dist/ exists.
const DIST_DIR = path.join(__dirname, '..', 'dist');
app.use(express.static(DIST_DIR, {
    setHeaders(res, filePath) {
        const rel = path.relative(DIST_DIR, filePath).split(path.sep).join('/');
        if (rel.startsWith('static/')) {
            // Content-hashed by Vite: safe to cache forever.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (rel.startsWith('assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        } else {
            // HTML and the unhashed public/js scripts: always revalidate (ETag).
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

// Final safety net: any error forwarded via next(err) (including from
// asyncHandler-wrapped routes) lands here instead of crashing the process.
// Only messages we wrote ourselves are shown to the client; internal error
// text (Mongo, Cloudinary, stack details) stays in the server log.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.name === 'ValidationError') {
        const firstError = Object.values(err.errors)[0];
        return res.status(400).json({
            success: false,
            message: firstError ? firstError.message : 'Оруулсан мэдээлэл буруу байна.',
        });
    }
    if (err.name === 'CastError') {
        return res.status(404).json({ success: false, message: 'Олдсонгүй.' });
    }
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Ийм утгатай бичлэг аль хэдийн байна.' });
    }
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Зургийн хэмжээ 8MB-аас хэтэрсэн байна.'
            : 'Файл оруулахад алдаа гарлаа.';
        return res.status(400).json({ success: false, message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Invalid JSON.' });
    }
    if (err.status && err.status < 500) {
        return res.status(err.status).json({ success: false, message: err.message });
    }

    console.error('Unhandled request error:', err);
    res.status(500).json({ success: false, message: 'Серверт алдаа гарлаа. Дахин оролдоно уу.' });
});

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`MindOra API listening on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    });
