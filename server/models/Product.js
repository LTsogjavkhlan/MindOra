const { mongoose } = require('../db.js');

const productImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    alt: { type: String, default: '' },
}, { _id: false });

// Admin forms submit everything as text ("289 000₮"), so keep only the digits.
// Blank text stays unset, so `required` still catches an empty price field.
const toWholeNumber = (v) => {
    if (typeof v !== 'string') return v;
    const digits = v.replace(/[^\d]/g, '');
    return digits ? Number(digits) : undefined;
};

const productSchema = new mongoose.Schema({
    order: { type: Number, required: true, default: 0, set: (v) => Number(v) || 0 },
    title: { type: String, required: [true, 'Гарчиг заавал шаардлагатай.'] },
    // Whole tögrög; formatted for display on the client.
    price: {
        type: Number,
        required: [true, 'Үнэ заавал шаардлагатай.'],
        min: [0, 'Үнэ сөрөг байж болохгүй.'],
        set: toWholeNumber,
    },
    // Units available to order. Orders reserve stock; cancelling returns it.
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Үлдэгдэл сөрөг байж болохгүй.'],
        validate: { validator: Number.isInteger, message: 'Үлдэгдэл бүхэл тоо байх ёстой.' },
        set: toWholeNumber,
    },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    category: { type: String, default: '' },
    images: { type: [productImageSchema], default: [] },
});

productSchema.index({ order: 1 });

module.exports = mongoose.model('Product', productSchema);
