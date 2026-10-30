// Order placement and status changes. Both move stock, so each runs in a
// MongoDB transaction: either every stock change and the order write happen
// together, or none of them do.
const { mongoose } = require('./db.js');
const Product = require('./models/Product.js');
const Order = require('./models/Order.js');
const { nextSequence } = require('./models/Counter.js');

const FIRST_ORDER_NUMBER = 1001;

// Which status changes the admin may make. Delivered and cancelled are final,
// so stock is only ever returned once (on cancel).
const TRANSITIONS = {
    new: ['confirmed', 'delivered', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
};

class OrderError extends Error {
    constructor(status, message, details = {}) {
        super(message);
        this.status = status;
        Object.assign(this, details);
    }
}

// `trusted()`: sanitizeFilter is on globally; these operators are ours.
const trusted = mongoose.trusted;

/**
 * @param {Array<{productId: string, quantity: number}>} requested - already validated
 * @param {{name, phone, email, address, note}} customer - already validated
 */
async function placeOrder(requested, customer) {
    // Merge duplicate lines for the same product.
    const quantities = new Map();
    for (const { productId, quantity } of requested) {
        quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }
    const ids = [...quantities.keys()];

    const session = await mongoose.startSession();
    try {
        let order;
        await session.withTransaction(async () => {
            const products = await Product.find({ _id: trusted({ $in: ids }) }, 'title price stock')
                .session(session).lean();
            const byId = new Map(products.map((p) => [String(p._id), p]));

            // Report every short item at once so the cart can fix them all.
            const shortages = ids
                .filter((id) => !byId.has(id) || byId.get(id).stock < quantities.get(id))
                .map((id) => ({
                    productId: id,
                    title: byId.get(id)?.title || '',
                    available: byId.get(id)?.stock || 0,
                }));
            if (shortages.length) {
                throw new OrderError(409, 'Зарим бүтээгдэхүүний үлдэгдэл хүрэлцэхгүй байна.', { shortages });
            }

            // The `stock >= quantity` condition is the real guard against overselling.
            for (const id of ids) {
                const quantity = quantities.get(id);
                const { modifiedCount } = await Product.updateOne(
                    { _id: id, stock: trusted({ $gte: quantity }) },
                    { $inc: { stock: -quantity } },
                    { session },
                );
                if (modifiedCount !== 1) {
                    const p = byId.get(id);
                    throw new OrderError(409, 'Зарим бүтээгдэхүүний үлдэгдэл хүрэлцэхгүй байна.', {
                        shortages: [{ productId: id, title: p.title, available: 0 }],
                    });
                }
            }

            const items = ids.map((id) => ({
                product: id,
                title: byId.get(id).title,
                unitPrice: byId.get(id).price,
                quantity: quantities.get(id),
            }));
            const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            const orderNumber = await nextSequence('order', { start: FIRST_ORDER_NUMBER, session });

            [order] = await Order.create([{ orderNumber, items, total, customer }], { session });
        });
        return order;
    } finally {
        await session.endSession();
    }
}

async function setOrderStatus(orderId, nextStatus) {
    const session = await mongoose.startSession();
    try {
        let order;
        await session.withTransaction(async () => {
            order = await Order.findById(orderId).session(session);
            if (!order) throw new OrderError(404, 'Захиалга олдсонгүй.');
            if (order.status === nextStatus) return;
            if (!TRANSITIONS[order.status]?.includes(nextStatus)) {
                throw new OrderError(400, 'Энэ захиалгын төлөвийг өөрчлөх боломжгүй.');
            }

            order.status = nextStatus;
            await order.save({ session });

            // Cancelling returns the reserved stock (skips products deleted since).
            if (nextStatus === 'cancelled') {
                for (const item of order.items) {
                    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
                }
            }
        });
        return order;
    } finally {
        await session.endSession();
    }
}

module.exports = { placeOrder, setOrderStatus, OrderError, TRANSITIONS };
