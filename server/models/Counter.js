const { mongoose } = require('../db.js');

// Named sequences (e.g. "order" -> 1001, 1002, ...) for human-friendly numbers.
// `seq` counts how many numbers have been issued.
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

// Atomically returns the next value; `start` is the first number ever issued.
async function nextSequence(name, { start = 1, session } = {}) {
    const counter = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session },
    );
    return start - 1 + counter.seq;
}

module.exports = { Counter, nextSequence };
