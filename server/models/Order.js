const { mongoose } = require('../db.js');

const ORDER_STATUSES = ['new', 'confirmed', 'delivered', 'cancelled'];

// Title and price are copied in at order time, so later product edits
// (or deletion) never change what a past order says.
const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: { type: Number, required: true, unique: true },
    items: {
        type: [orderItemSchema],
        validate: { validator: (items) => items.length > 0, message: 'Захиалга хоосон байна.' },
    },
    total: { type: Number, required: true, min: 0 },
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
        address: { type: String, required: true },
        note: { type: String, default: '' },
    },
    paymentMethod: { type: String, enum: ['cash_on_delivery'], default: 'cash_on_delivery' },
    status: { type: String, enum: ORDER_STATUSES, default: 'new' },
}, { timestamps: true });

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
