const { mongoose } = require('../db.js');

const COURSE_LEVELS = ['', 'beginner', 'intermediate', 'advanced'];
const COURSE_FORMATS = ['', 'online', 'classroom', 'hybrid'];

// Admin forms send list fields as one-item-per-line text.
const toLines = (v) => (typeof v === 'string' ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : v);

const courseSchema = new mongoose.Schema({
    sectionId: { type: String, required: [true, 'Бүлгийн ID заавал шаардлагатай.'] },
    order: { type: Number, required: true, default: 0, set: (v) => Number(v) || 0 },
    imageUrl: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    badge: { type: String, enum: ['popular', 'new', 'none'], default: 'none' },
    categoryLabel: { type: String, default: '' },
    title: { type: String, required: [true, 'Гарчиг заавал шаардлагатай.'] },
    // Short text on the card.
    description: { type: String, default: '' },

    // ---- Shown in the course details popup (all optional; empty = hidden) ----
    details: { type: String, default: '' }, // longer description, plain text paragraphs
    duration: { type: String, default: '' }, // "8 долоо хоног"
    schedule: { type: String, default: '' }, // "Да, Лх 19:00–21:00"
    startDate: { type: Date, default: null, set: (v) => (v === '' ? null : v) },
    level: { type: String, enum: COURSE_LEVELS, default: '' },
    format: { type: String, enum: COURSE_FORMATS, default: '' },
    instructor: { type: String, default: '' },
    outcomes: { type: [String], default: [], set: toLines }, // what you'll learn
    requirements: { type: [String], default: [], set: toLines },
});

courseSchema.index({ sectionId: 1, order: 1 });

module.exports = mongoose.model('Course', courseSchema);
module.exports.COURSE_LEVELS = COURSE_LEVELS;
module.exports.COURSE_FORMATS = COURSE_FORMATS;
