const { mongoose } = require('../db.js');

const ENROLLMENT_STATUSES = ['new', 'contacted', 'enrolled', 'cancelled'];

// A student's request to join a course. The course title is copied in so the
// request still reads correctly if the course is renamed or deleted later.
const enrollmentSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'new' },
}, { timestamps: true });

enrollmentSchema.index({ status: 1, createdAt: -1 });
enrollmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
module.exports.ENROLLMENT_STATUSES = ENROLLMENT_STATUSES;
