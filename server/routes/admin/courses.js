const { Router } = require('express');
const Course = require('../../models/Course.js');
const CourseSection = require('../../models/CourseSection.js');
const Category = require('../../models/Category.js');
const { upload, uploadImageBuffer, deleteUploadedImages } = require('../../upload.js');
const createCrudRouter = require('./crudFactory.js');

const router = Router();

const sectionsRouter = createCrudRouter(CourseSection, {
    listKey: 'sections',
    itemKey: 'section',
    notFoundMessage: 'Бүлэг олдсонгүй.',
    // Courses and categories reference a section by its sectionId string, so a
    // rename has to carry them along or they'd silently vanish from the page.
    async afterUpdate(before, section) {
        if (before.sectionId === section.sectionId) return;
        await Promise.all([
            Course.updateMany({ sectionId: before.sectionId }, { sectionId: section.sectionId }),
            Category.updateMany({ linkSectionId: before.sectionId }, { linkSectionId: section.sectionId }),
        ]);
    },
    async beforeDelete(section) {
        const inUse = await Category.exists({ linkSectionId: section.sectionId });
        if (inUse) {
            return 'Энэ бүлгийг ашиглаж буй ангилал байгаа тул устгах боломжгүй. Эхлээд холбогдох ангиллыг өөрчилнө үү.';
        }
    },
    async afterDelete(section) {
        const courses = await Course.find({ sectionId: section.sectionId }, 'imageUrl').lean();
        await Course.deleteMany({ sectionId: section.sectionId });
        await deleteUploadedImages(courses.map((c) => c.imageUrl));
    },
});

const coursesRouter = createCrudRouter(Course, {
    listKey: 'courses',
    itemKey: 'course',
    notFoundMessage: 'Хичээл олдсонгүй.',
    filterFields: ['sectionId'],
    uploadMiddleware: upload.single('image'),
    imageUrls: (course) => [course.imageUrl],
    async buildData(req) {
        const data = { ...req.body };
        if (req.file) data.imageUrl = await uploadImageBuffer(req.file.buffer);
        return data;
    },
});

router.use('/sections', sectionsRouter);
router.use('/', coursesRouter);

module.exports = router;
