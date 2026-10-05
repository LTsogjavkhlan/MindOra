const { Router } = require('express');
const { mongoose } = require('../db.js');
const HeroSlide = require('../models/HeroSlide.js');
const Category = require('../models/Category.js');
const CourseSection = require('../models/CourseSection.js');
const Course = require('../models/Course.js');
const Product = require('../models/Product.js');
const AdviceCard = require('../models/AdviceCard.js');
const asyncHandler = require('../asyncHandler.js');

const router = Router();

const BY_ORDER = { order: 1 };
const HOME_TEASER_COUNT = 3;

// Each page's queries, run in parallel. Home only needs the first few items
// of each collection for its teasers/trending row, so it gets them in this
// one request instead of fetching every other page's full payload.
const PAGE_QUERIES = {
    home: () => ({
        products: Product.find().sort(BY_ORDER).limit(HOME_TEASER_COUNT).lean(),
        courses: Course.find().sort(BY_ORDER).limit(HOME_TEASER_COUNT).lean(),
        // trusted(): sanitizeFilter is on globally; this operator is ours, not user input.
        featuredCourses: Course.find({ badge: mongoose.trusted({ $ne: 'none' }) }).sort(BY_ORDER).limit(HOME_TEASER_COUNT).lean(),
        adviceCards: AdviceCard.find().sort(BY_ORDER).limit(HOME_TEASER_COUNT).lean(),
    }),
    surgalt: () => ({
        categories: Category.find().sort(BY_ORDER).lean(),
        sections: CourseSection.find().sort(BY_ORDER).lean(),
        courses: Course.find().sort(BY_ORDER).lean(),
    }),
    td: () => ({
        products: Product.find().sort(BY_ORDER).lean(),
    }),
    zuwluguu: () => ({
        adviceCards: AdviceCard.find().sort(BY_ORDER).lean(),
    }),
};

router.get('/:page', asyncHandler(async (req, res) => {
    const buildQueries = Object.hasOwn(PAGE_QUERIES, req.params.page) && PAGE_QUERIES[req.params.page];
    if (!buildQueries) {
        return res.status(404).json({ success: false, message: 'Unknown page.' });
    }

    const queries = { hero: HeroSlide.find({ page: req.params.page }).sort(BY_ORDER).lean(), ...buildQueries() };
    const keys = Object.keys(queries);
    const results = await Promise.all(Object.values(queries));

    res.json({ success: true, ...Object.fromEntries(keys.map((key, i) => [key, results[i]])) });
}));

module.exports = router;
