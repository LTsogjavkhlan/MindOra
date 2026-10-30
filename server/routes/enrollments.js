const { Router } = require('express');
const { mongoose } = require('../db.js');
const asyncHandler = require('../asyncHandler.js');
const createRateLimiter = require('../rateLimit.js');
const Course = require('../models/Course.js');
const Enrollment = require('../models/Enrollment.js');
const { sendEnrollmentNotification, sendEnrollmentConfirmation } = require('../mailer.js');
const { EMAIL_REGEX, PHONE_REGEX, normalizePhone, cleanText } = require('../validation.js');

const router = Router();

const enrollmentRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.',
});

const badRequest = (res, message) => res.status(400).json({ success: false, message });

router.post('/', enrollmentRateLimit, asyncHandler(async (req, res) => {
    const body = req.body || {};

    // Honeypot: a field hidden from people that bots tend to fill in.
    if (cleanText(body.website)) return badRequest(res, 'Хүсэлт буруу байна.');

    const courseId = typeof body.courseId === 'string' ? body.courseId : '';
    if (!mongoose.isValidObjectId(courseId)) return badRequest(res, 'Хичээл олдсонгүй.');

    const fields = {
        name: cleanText(body.name, 100),
        phone: normalizePhone(cleanText(body.phone, 30)),
        email: cleanText(body.email, 200),
        note: cleanText(body.note, 500),
    };
    if (!fields.name) return badRequest(res, 'Нэрээ оруулна уу.');
    if (!PHONE_REGEX.test(fields.phone)) return badRequest(res, '8 оронтой зөв утасны дугаар оруулна уу.');
    if (!EMAIL_REGEX.test(fields.email)) return badRequest(res, 'Зөв имэйл хаяг оруулна уу.');

    const course = await Course.findById(courseId, 'title').lean();
    if (!course) return res.status(404).json({ success: false, message: 'Хичээл олдсонгүй.' });

    const enrollment = await Enrollment.create({ course: course._id, courseTitle: course.title, ...fields });

    // Saved already; an email hiccup shouldn't turn into an error for the student.
    Promise.allSettled([sendEnrollmentNotification(enrollment), sendEnrollmentConfirmation(enrollment)]).then((results) => {
        results.filter((r) => r.status === 'rejected')
            .forEach((r) => console.error(`Enrollment ${enrollment._id} email failed:`, r.reason));
    });

    res.status(201).json({ success: true, message: 'Бүртгэлийн хүсэлтийг хүлээн авлаа. Бид тантай удахгүй холбогдоно.' });
}));

module.exports = router;
