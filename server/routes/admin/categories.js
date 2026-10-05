const Category = require('../../models/Category.js');
const { upload, uploadImageBuffer } = require('../../upload.js');
const createCrudRouter = require('./crudFactory.js');

const router = createCrudRouter(Category, {
    listKey: 'categories',
    itemKey: 'category',
    notFoundMessage: 'Ангилал олдсонгүй.',
    uploadMiddleware: upload.single('icon'),
    imageUrls: (category) => [category.iconUrl],
    async buildData(req) {
        const data = { ...req.body };
        if (req.file) data.iconUrl = await uploadImageBuffer(req.file.buffer);
        return data;
    },
});

module.exports = router;
