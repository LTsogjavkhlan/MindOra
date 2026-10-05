const Product = require('../../models/Product.js');
const { upload, uploadImageBuffer } = require('../../upload.js');
const createCrudRouter = require('./crudFactory.js');

function parseFeatures(features) {
    if (Array.isArray(features)) return features;
    if (typeof features === 'string' && features.trim()) {
        return features.split(',').map((f) => f.trim()).filter(Boolean);
    }
    return [];
}

const router = createCrudRouter(Product, {
    listKey: 'products',
    itemKey: 'product',
    notFoundMessage: 'Бүтээгдэхүүн олдсонгүй.',
    uploadMiddleware: upload.array('images', 8),
    imageUrls: (product) => (product.images || []).map((img) => img.url),
    async buildData(req) {
        const data = { ...req.body };
        if (data.features !== undefined) data.features = parseFeatures(data.features);
        delete data.imageAlts;

        if (req.files && req.files.length) {
            const alts = Array.isArray(req.body.imageAlts)
                ? req.body.imageAlts
                : (req.body.imageAlts ? [req.body.imageAlts] : []);
            data.images = await Promise.all(
                req.files.map(async (file, i) => ({
                    url: await uploadImageBuffer(file.buffer),
                    alt: alts[i] || data.title || '',
                }))
            );
        }

        return data;
    },
});

module.exports = router;
