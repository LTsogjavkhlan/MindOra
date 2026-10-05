const HeroSlide = require('../../models/HeroSlide.js');
const { upload, uploadImageBuffer } = require('../../upload.js');
const createCrudRouter = require('./crudFactory.js');

const router = createCrudRouter(HeroSlide, {
    listKey: 'slides',
    itemKey: 'slide',
    notFoundMessage: 'Слайд олдсонгүй.',
    filterFields: ['page'],
    sort: { page: 1, order: 1 },
    uploadMiddleware: upload.single('image'),
    imageUrls: (slide) => [slide.imageUrl],
    async buildData(req) {
        const data = { ...req.body };
        if (req.file) data.imageUrl = await uploadImageBuffer(req.file.buffer);
        return data;
    },
});

module.exports = router;
