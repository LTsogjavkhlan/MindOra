// One-time migration script: inserts the site's current hardcoded content into
// MongoDB as-is (so switching to the CMS doesn't change what visitors see),
// and creates the admin login from .env. Safe to re-run: it wipes and
// re-inserts content collections, but skips creating the admin user if one
// already exists (so it won't lock you out of a changed password).
require('dotenv').config();
const bcrypt = require('bcrypt');
const { connectDB, mongoose } = require('./db.js');
const AdminUser = require('./models/AdminUser.js');
const HeroSlide = require('./models/HeroSlide.js');
const Category = require('./models/Category.js');
const CourseSection = require('./models/CourseSection.js');
const Course = require('./models/Course.js');
const Product = require('./models/Product.js');
const AdviceCard = require('./models/AdviceCard.js');

const heroSlides = [
    // home (index.html) - 4 carousel slides
    { page: 'home', order: 0, title: 'Тавтай морил, Дижитал Инновац', body: 'Дэвшилтэт технологи, мэргэжлийн зөвлөгөөгөөр санаагаа дижитал бодит байдал болгон хувиргана', ctaLabel: 'Үйлчилгээг Үзэх', ctaLink: '#services', imageUrl: 'assets/images/cow-7200409-copy.jpg', imageAlt: 'Дижитал инновацийг илэрхийлсэн орчин үеийн ажлын орчин' },
    { page: 'home', order: 1, title: 'Мэргэжлийн Сургалтын Хөтөлбөр', body: 'Веб хөгжүүлэлт, дата шинжлэх ухаан болон шинэ технологийн чиглэлээр туршлагатай багш нарын хичээл', ctaLabel: 'Хичээлүүдийг Үзэх', ctaLink: 'surgalt.html', imageUrl: 'assets/images/hero1.jpg', imageAlt: 'Орчин үеийн технологийн ур чадвар судалж буй сурагчидтай мэргэжлийн сургалтын хичээл' },
    { page: 'home', order: 2, title: 'Дижитал Шилжилтийн Үйлчилгээ', body: 'Дэвшилтэт технологийн шийдэл, стратегийн зөвлөгөөгөөр бизнесийнхээ үйл ажиллагааг орчин үеийн болгоно', ctaLabel: 'Дэлгэрэнгүй Үзэх', ctaLink: 'TD.html', imageUrl: 'assets/images/hero2.jpg', imageAlt: 'Орчин үеийн бизнесийн шинжилгээ, cloud шийдлийг харуулсан дижитал шилжилтийн самбар' },
    { page: 'home', order: 3, title: 'Мэргэжлийн Зөвлөгөө & Дэмжлэг', body: 'Мэргэжлийн хөгжлөө хурдасгах хувь хүнд тохирсон зөвлөгөө, ажил мэргэжлийн дэмжлэг', ctaLabel: 'Эхлэх', ctaLink: 'zuwluguu.html', imageUrl: 'assets/images/hero3.jpg', imageAlt: 'Ажил мэргэжлийн чиглүүлэг өгч буй мэргэжлийн зөвлөхтэй нэг-нэгийн уулзалт' },
    // surgalt.html
    { page: 'surgalt', order: 0, title: 'Surgalt Хөтөлбөр', body: 'Таны сурах зорилгодоо хүрэхэд туслах цогц сургалтын хөтөлбөрүүдийг үзнэ үү.', ctaLabel: '', ctaLink: '', imageUrl: '', imageAlt: '' },
    // TD.html - no hero existed before; sensible new default
    { page: 'td', order: 0, title: 'Онцлох Бүтээгдэхүүнүүд', body: 'Чанар, эдэлгээтэй байдалд анхаарсан, сонгомол бүтээгдэхүүний цуглуулгыг үзнэ үү.', ctaLabel: '', ctaLink: '', imageUrl: '', imageAlt: '' },
    // zuwluguu.html
    { page: 'zuwluguu', order: 0, title: 'Таны Аяллын Чиглүүлэгч', body: 'Өсөж хөгжихөд тань туслах туршлагатай зөвлөгөө, дэмжлэг', ctaLabel: '', ctaLink: '', imageUrl: '', imageAlt: '' },
];

const categories = [
    { order: 0, iconUrl: 'assets/images/surgaltcategory1.png', iconAlt: 'Суурь хичээлүүд - Веб хөгжүүлэлт, дизайн, маркетингийн үндэс', title: 'Суурь Хичээлүүд', description: 'Аяллаа шинээр эхэлж буй хүмүүст тохиромжтой. Веб хөгжүүлэлт, дизайн, дижитал маркетингийн үндсийг судалж, бат бэх суурь тавина.', linkText: 'Хичээлүүдийг Үзэх', linkSectionId: 'beginner-courses' },
    { order: 1, iconUrl: 'assets/images/surgaltcategory2.png', iconAlt: 'Мэргэжлийн хөгжил - AI, cloud, кибер аюулгүй байдлын гүнзгийрүүлсэн хичээл', title: 'Мэргэжлийн Хөгжил', description: 'AI, үүлэн тооцоолол, кибер аюулгүй байдал, орчин үеийн хөгжүүлэлтийн framework-үүдийн гүнзгийрүүлсэн хичээлээр ур чадвараа дараагийн түвшинд гаргана.', linkText: 'Хичээлүүдийг Үзэх', linkSectionId: 'advanced-courses' },
    { order: 2, iconUrl: 'assets/images/surgaltcategory3.png', iconAlt: 'Салбарын гэрчилгээ - Төслийн менежмент, cloud платформын гэрчилгээ', title: 'Салбарын Гэрчилгээ', description: 'Нарийн төвөгтэй ойлголтуудыг эзэмшиж, төслийн менежмент, cloud платформ болон тусгай технологийн чиглэлээр салбарын хүлээн зөвшөөрөгдсөн гэрчилгээ авна.', linkText: 'Хичээлүүдийг Үзэх', linkSectionId: 'certification-courses' },
];

const courseSections = [
    { sectionId: 'beginner-courses', order: 0, title: 'Суурь Хичээлүүд', description: 'Технологи, дижитал ур чадварын бат бэх суурь тавихад зориулсан анхлан суралцагчдад ээлтэй хичээлүүдийн цуглуулгыг үзнэ үү.', colorVariant: '' },
    { sectionId: 'advanced-courses', order: 1, title: 'Гүнзгийрүүлсэн Хичээлүүд', description: 'Ур чадвараа дараагийн түвшинд гаргах гүнзгийрүүлсэн сургалт, тусгай чиглэлийн хөтөлбөрүүдийг үзнэ үү.', colorVariant: 'courses-section-blue' },
    { sectionId: 'certification-courses', order: 2, title: 'Гэрчилгээт Хөтөлбөр', description: 'Ур чадвараа баталгаажуулж, ажил мэргэжлээ ахиулах салбарын хүлээн зөвшөөрөгдсөн гэрчилгээт хөтөлбөрүүд.', colorVariant: 'courses-section-green' },
];

const courses = [
    // beginner-courses
    { sectionId: 'beginner-courses', order: 0, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Веб хөгжүүлэлтийн сургалт - HTML, CSS, JavaScript, React судлах', badge: 'popular', categoryLabel: 'Хөгжүүлэлт', title: 'Веб Хөгжүүлэлтийн Эрчимжүүлсэн Сургалт', description: 'Энэ цогц эрчимжүүлсэн сургалтаар HTML, CSS, JavaScript, React зэргийг бүрэн анхнаас нь судална.' },
    { sectionId: 'beginner-courses', order: 1, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Хичээл 2', badge: 'new', categoryLabel: 'Дизайн', title: 'UI/UX Дизайны Үндэс', description: 'Сонирхолтой дижитал бүтээгдэхүүн бүтээхэд шаардлагатай хэрэглэгчийн интерфейс, туршлагын дизайны зарчмуудыг эзэмшинэ.' },
    { sectionId: 'beginner-courses', order: 2, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Хичээл 3', badge: 'popular', categoryLabel: 'Маркетинг', title: 'Дижитал Маркетингийн Ур Чадвар', description: 'SEO, сошиал медиа маркетинг, имэйл кампанит ажил, контент маркетингийн стратегиудыг судална.' },
    { sectionId: 'beginner-courses', order: 3, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Хичээл 4', badge: 'new', categoryLabel: 'Дата Шинжлэх Ухаан', title: 'Машин Сургалтын Үндэс', description: 'Машин сургалтын алгоритм, дата шинжилгээ, практик хэрэглээг судална.' },
    { sectionId: 'beginner-courses', order: 4, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Хичээл 5', badge: 'popular', categoryLabel: 'Бизнес', title: 'Бизнес Эрхлэлтийн Үндэс', description: 'Батлагдсан стратеги, framework ашиглан амжилттай бизнес эхлүүлж, өсгөх аргыг судална.' },
    // advanced-courses
    { sectionId: 'advanced-courses', order: 0, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 1', badge: 'popular', categoryLabel: 'AI ба Машин Сургалт', title: 'Гүнзгий Сургалтын Мэргэшүүлэх Хөтөлбөр', description: 'Мэдрэлийн сүлжээ, машин сургалтын алгоритмыг эзэмшиж, гүнзгийрүүлсэн AI систем бүтээнэ.' },
    { sectionId: 'advanced-courses', order: 1, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 2', badge: 'new', categoryLabel: 'Үүлэн Тооцоолол', title: 'AWS Solutions Architect', description: 'Amazon Web Services дээр өргөтгөх боломжтой, өндөр найдвартай систем зохион бүтээж, байршуулахыг судална.' },
    { sectionId: 'advanced-courses', order: 2, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 3', badge: 'popular', categoryLabel: 'Кибер Аюулгүй Байдал', title: 'Ёс Зүйт Хакинг & Пентест', description: 'Сүлжээ, аппликейшны аюулгүй байдлын сул талыг илрүүлж, засварлахыг судална.' },
    { sectionId: 'advanced-courses', order: 3, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 4', badge: 'new', categoryLabel: 'Блокчэйн', title: 'Блокчэйн Хөгжүүлэлт', description: 'Solidity, ухаалаг гэрээ (smart contract)-г эзэмшиж, Ethereum дээр төвлөрлийг сааруулсан аппликейшн бүтээнэ.' },
    { sectionId: 'advanced-courses', order: 4, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 5', badge: 'popular', categoryLabel: 'DevOps', title: 'DevOps Инженерчлэл', description: 'Docker, Kubernetes ашиглан CI/CD, контейнержуулалт, дэд бүтцийн автоматжуулалтыг судална.' },
    { sectionId: 'advanced-courses', order: 5, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 6', badge: 'new', categoryLabel: 'Full-Stack Хөгжүүлэлт', title: 'Гүнзгийрүүлсэн MERN Stack', description: 'MongoDB, Express, React, Node.js ашиглан байгууллагын түвшний нарийн төвөгтэй аппликейшн бүтээнэ.' },
    { sectionId: 'advanced-courses', order: 6, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 7', badge: 'popular', categoryLabel: 'Дата Инженерчлэл', title: 'Их Өгөгдлийн Шинжилгээ', description: 'Hadoop, Spark болон бодит цагийн шинжилгээний framework ашиглан гүнзгийрүүлсэн өгөгдөл боловсруулалтыг эзэмшинэ.' },
    { sectionId: 'advanced-courses', order: 7, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 8', badge: 'new', categoryLabel: 'Мобайл Хөгжүүлэлт', title: 'Олон Платформ Апп Хөгжүүлэлт', description: 'React Native, Flutter framework ашиглан iOS, Android-д зориулсан чанартай апп бүтээнэ.' },
    { sectionId: 'advanced-courses', order: 8, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гүнзгийрүүлсэн Хичээл 9', badge: 'popular', categoryLabel: 'Компьютер Хараа', title: 'Гүнзгийрүүлсэн Компьютер Хараа', description: 'TensorFlow, PyTorch ашиглан хамгийн дэвшилтэт хараа алгоритмыг AI аппликейшнд хэрэгжүүлнэ.' },
    // certification-courses
    { sectionId: 'certification-courses', order: 0, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гэрчилгээ 1', badge: 'popular', categoryLabel: 'Төслийн Менежмент', title: 'PMP Гэрчилгээ', description: 'Project Management Professional гэрчилгээний шалгалтад бүрэн бэлтгэнэ.' },
    { sectionId: 'certification-courses', order: 1, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Гэрчилгээ 2', badge: 'new', categoryLabel: 'Дата Шинжлэх Ухаан', title: 'Дата Шинжлэх Ухааны Мэргэжлийн Гэрчилгээ', description: 'Статистик, Python, машин сургалт, өгөгдлийн дүрслэлийг хамарсан цогц хөтөлбөр.' },
    { sectionId: 'certification-courses', order: 2, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гэрчилгээ 3', badge: 'popular', categoryLabel: 'Сүлжээ', title: 'CISCO CCNA Гэрчилгээ', description: 'Гарын дадлагаар дамжуулан сүлжээний үндэс, IP үйлчилгээ, аюулгүй байдал, автоматжуулалтыг судална.' },
    { sectionId: 'certification-courses', order: 3, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гэрчилгээ 4', badge: 'new', categoryLabel: 'Cloud', title: 'Microsoft Azure Administrator', description: 'AZ-104 гэрчилгээнд зориулсан дадлага шалгалт, гарын төслүүдтэй бүрэн сургалт.' },
    { sectionId: 'certification-courses', order: 4, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гэрчилгээ 5', badge: 'popular', categoryLabel: 'Agile & Scrum', title: 'Гэрчлэгдсэн Scrum Master', description: 'Scrum арга зүйг эзэмшиж, мэргэжлийн зөвлөгөөгөөр CSM гэрчилгээний шалгалтад бэлдэнэ.' },
    { sectionId: 'certification-courses', order: 5, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гэрчилгээ 6', badge: 'new', categoryLabel: 'Аюулгүй Байдал', title: 'CompTIA Security+', description: 'Сүлжээний аюулгүй байдал, аюул заналыг удирдахыг хамарсан Security+ гэрчилгээнд цогц бэлтгэл хийнэ.' },
    { sectionId: 'certification-courses', order: 6, imageUrl: 'assets/images/surgalt2.jpg', imageAlt: 'Гэрчилгээ 7', badge: 'popular', categoryLabel: 'Веб Хөгжүүлэлт', title: 'Гэрчлэгдсэн JavaScript Хөгжүүлэгч', description: 'Цогц сургалт, гарын төслөөр дамжуулан гэрчлэгдсэн JavaScript мэргэжилтэн болно.' },
    { sectionId: 'certification-courses', order: 7, imageUrl: 'assets/images/surgalt3.jpg', imageAlt: 'Гэрчилгээ 8', badge: 'new', categoryLabel: 'Үүлэн Тооцоолол', title: 'Google Cloud Professional', description: 'Cloud архитектур, дэд бүтцийн удирдлагад зориулсан албан ёсны Google Cloud гэрчилгээний сургалт.' },
    { sectionId: 'certification-courses', order: 8, imageUrl: 'assets/images/surgalt1.jpg', imageAlt: 'Гэрчилгээ 9', badge: 'popular', categoryLabel: 'UI/UX Дизайн', title: 'Гэрчлэгдсэн UX Дизайнер', description: 'Portfolio хөгжүүлэлт, зөвлөгөөтэй, салбарын хүлээн зөвшөөрөгдсөн UX дизайны гэрчилгээ.' },
];

const products = [
    { order: 0, title: 'Тансаг Электроник', price: 289000, stock: 10, category: 'electronics', description: 'Дэвшилтэт функц, удаан эдэлгээтэй материал, цогц баталгаат хамрах хүрээтэй өндөр чанарын электрон төхөөрөмж.', features: ['Өндөр Чанар', 'Удаан Эдэлгээтэй', 'Баталгаат'], images: [
        { url: 'assets/images/card1.jpg', alt: 'Тансаг электроник бүтээгдэхүүн - Өндөр чанарын төхөөрөмж' },
        { url: 'assets/images/card2.jpg', alt: 'Тансаг электроник бүтээгдэхүүн - Зураг 2' },
        { url: 'assets/images/card3.jpg', alt: 'Тансаг электроник бүтээгдэхүүн - Зураг 3' },
        { url: 'assets/images/card4.jpg', alt: 'Тансаг электроник бүтээгдэхүүн - Зураг 4' },
        { url: 'assets/images/portrait.jpg', alt: 'Тансаг электроник бүтээгдэхүүн - Зураг 5' },
    ] },
    { order: 1, title: 'Бүтээгдэхүүн 2', price: 429000, stock: 10, category: 'fashion', description: 'Хоёр дахь бүтээгдэхүүний тайлбар. Хэрэглэгчдэд таалагдах гол онцлог, давуу талыг онцолно.', features: ['Тансаг Чанар', 'Тухтай', 'Загварлаг'], images: [
        { url: 'assets/images/card2.jpg', alt: 'Бүтээгдэхүүн 2' },
        { url: 'assets/images/card1.jpg', alt: 'Бүтээгдэхүүн 2 - Зураг 2' },
        { url: 'assets/images/card4.jpg', alt: 'Бүтээгдэхүүн 2 - Зураг 3' },
        { url: 'assets/images/portrait.jpg', alt: 'Бүтээгдэхүүн 2 - Зураг 4' },
        { url: 'assets/images/card3.jpg', alt: 'Бүтээгдэхүүн 2 - Зураг 5' },
    ] },
    { order: 2, title: 'Бүтээгдэхүүн 3', price: 579000, stock: 10, category: 'home', description: 'Гурав дахь бүтээгдэхүүний дэлгэрэнгүй. Онцгой шинж чанар, өрсөлдөгчөөсөө ялгарах давуу талыг тодорхойлоход тохиромжтой.', features: ['Байгальд Ээлтэй', 'Хялбар Суурилуулалт', 'Орчин Үеийн Загвар'], images: [
        { url: 'assets/images/card3.jpg', alt: 'Бүтээгдэхүүн 3' },
        { url: 'assets/images/card4.jpg', alt: 'Бүтээгдэхүүн 3 - Зураг 2' },
        { url: 'assets/images/card1.jpg', alt: 'Бүтээгдэхүүн 3 - Зураг 3' },
        { url: 'assets/images/portrait.jpg', alt: 'Бүтээгдэхүүн 3 - Зураг 4' },
        { url: 'assets/images/card2.jpg', alt: 'Бүтээгдэхүүн 3 - Зураг 5' },
    ] },
    { order: 3, title: 'Бүтээгдэхүүн 4', price: 729000, stock: 10, category: 'sports', description: 'Дөрөв дэх бүтээгдэхүүний тайлбар. Зорилтот хэрэглэгчдэд таалагдах нэмэлт онцлог, давуу талыг харуулахад тохиромжтой.', features: ['Мэргэжлийн Зэрэглэл', 'Хөнгөн', 'Олон Талт'], images: [
        { url: 'assets/images/card4.jpg', alt: 'Бүтээгдэхүүн 4' },
        { url: 'assets/images/portrait.jpg', alt: 'Бүтээгдэхүүн 4 - Зураг 2' },
        { url: 'assets/images/card2.jpg', alt: 'Бүтээгдэхүүн 4 - Зураг 3' },
        { url: 'assets/images/card1.jpg', alt: 'Бүтээгдэхүүн 4 - Зураг 4' },
        { url: 'assets/images/card3.jpg', alt: 'Бүтээгдэхүүн 4 - Зураг 5' },
    ] },
    { order: 4, title: 'Бүтээгдэхүүн 5', price: 869000, stock: 10, category: 'premium', description: 'Тав дахь бүтээгдэхүүний тайлбар. Шалгуур сайтай хэрэглэгчдэд тансаг сонголт болгодог өвөрмөц чанар, давуу талыг онцолно.', features: ['Тансаг Материал', 'Гар Урлал', 'Хязгаарлагдмал Хувилбар'], images: [
        { url: 'assets/images/portrait.jpg', alt: 'Бүтээгдэхүүн 5' },
        { url: 'assets/images/card1.jpg', alt: 'Бүтээгдэхүүн 5 - Зураг 2' },
        { url: 'assets/images/card3.jpg', alt: 'Бүтээгдэхүүн 5 - Зураг 3' },
        { url: 'assets/images/card2.jpg', alt: 'Бүтээгдэхүүн 5 - Зураг 4' },
        { url: 'assets/images/card4.jpg', alt: 'Бүтээгдэхүүн 5 - Зураг 5' },
    ] },
    { order: 5, title: 'Бүтээгдэхүүн 6', price: 229000, stock: 10, category: 'accessories', description: 'Таны үндсэн бүтээгдэхүүнийг нөхөх төгс дагалдах хэрэгсэл. Өндөр чанарын материал, нарийвчлалд анхаарсан байдал үүнийг заавал байх ёстой зүйл болгодог.', features: ['Тохиромжтой', 'Компакт', 'Зайлшгүй Хэрэгтэй'], images: [
        { url: 'assets/images/service1.jpg', alt: 'Бүтээгдэхүүн 6' },
        { url: 'assets/images/card1.jpg', alt: 'Бүтээгдэхүүн 6 - Зураг 2' },
        { url: 'assets/images/card2.jpg', alt: 'Бүтээгдэхүүн 6 - Зураг 3' },
        { url: 'assets/images/card3.jpg', alt: 'Бүтээгдэхүүн 6 - Зураг 4' },
        { url: 'assets/images/card4.jpg', alt: 'Бүтээгдэхүүн 6 - Зураг 5' },
    ] },
];

const adviceCards = [
    { order: 0, iconSvgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', title: 'Карьерийн Хөгжил', content: 'Ажил мэргэжлээ ахиулж, мэргэжлийн өсөлтөд хүрэх стратегиуд.', linkText: 'Жишээ Судалгааг Үзэх →', studyTitle: 'Ажил Мэргэжлийн Хөгжлийн Жишээ Судалгаа', studyContent: '<p>Манай судалгаагаар бүтэцтэй карьерийн төлөвлөгөө хийдэг мэргэжилтнүүд 5 жилийн дотор зорилгодоо хүрэх магадлал 3 дахин өндөр байдаг нь харагдсан. Энэхүү судалгаа нь янз бүрийн салбарын амжилттай мэргэжилтнүүдийн ашигладаг стратегийг судалдаг.</p><p>Гол дүгнэлт нь тасралтгүй суралцах, харилцаа холбоо тогтоох, хэмжигдэхүйц зорилт тавихын ач холбогдол юм.</p>', studyLink: '#career-full-study' },
    { order: 1, iconSvgPath: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v3H8v2h3v3h2v-3h3v-2h-3V8z', title: 'Ур Чадвар Хөгжүүлэх', content: 'Өнөөгийн өрсөлдөөнт орчинд амжилтад хүрэхэд зайлшгүй шаардлагатай ур чадварууд.', linkText: 'Судалгааг Үзэх →', studyTitle: 'Ур Чадвар Хөгжүүлэх Судалгаа', studyContent: '<p>Энэхүү цогц судалгаа нь салбар бүрт хамгийн эрэлттэй ур чадваруудыг болон мэргэжилтнүүд тэдгээрийг хэрхэн үр дүнтэй эзэмшиж болохыг шинжилдэг. Бид 500 оролцогчийн ур чадвар хөгжүүлэх аяллыг дагаж судалсан.</p><p>Өгөгдөл харуулж байгаагаар зорилтот, төсөл дээр суурилсан сургалт нь шинэ ур чадварыг хамгийн урт хугацаанд хадгалж, хэрэглэхэд хамгийн үр дүнтэй байдаг.</p>', studyLink: '#skill-full-study' },
    { order: 2, iconSvgPath: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', title: 'Харилцаа Холбоо', content: 'Урт хугацаанд үргэлжлэх утга учиртай мэргэжлийн харилцаа холбоог бүрдүүлээрэй.', linkText: 'Амжилтын Түүхийг Үзэх →', studyTitle: 'Харилцаа Холбооны Амжилтын Түүх', studyContent: '<p>Стратегийн харилцаа холбоо тогтоох замаар карьераа өөрчилсөн мэргэжилтнүүдийн бодит жишээг судлаарай. Эдгээр жишээ судалгаанууд нь утга учиртай мэргэжлийн харилцаа бүрдүүлэх өөр өөр аргуудыг харуулдаг.</p><p>Нийтлэг сэдвүүд нь зөвлөгөөний ач холбогдол, салбарын арга хэмжээнд оролцох, жинхэнэ холбоо харилцааг хадгалахад оршдог.</p>', studyLink: '#network-full-study' },
];

async function seed() {
    await connectDB();

    // Admin user - only create if none exists, so re-running the seed never
    // clobbers a password you've already changed.
    const existingAdmin = await AdminUser.findOne();
    if (!existingAdmin) {
        if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
            console.warn('ADMIN_USERNAME/ADMIN_PASSWORD not set in .env - skipping admin user creation.');
        } else {
            const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
            await AdminUser.create({ username: process.env.ADMIN_USERNAME, passwordHash });
            console.log(`Created admin user "${process.env.ADMIN_USERNAME}".`);
        }
    } else {
        console.log('Admin user already exists - leaving it untouched.');
    }

    // Content collections: wipe and re-insert so this script is safely re-runnable.
    await Promise.all([
        HeroSlide.deleteMany({}),
        Category.deleteMany({}),
        CourseSection.deleteMany({}),
        Course.deleteMany({}),
        Product.deleteMany({}),
        AdviceCard.deleteMany({}),
    ]);

    await HeroSlide.insertMany(heroSlides);
    await Category.insertMany(categories);
    await CourseSection.insertMany(courseSections);
    await Course.insertMany(courses);
    await Product.insertMany(products);
    await AdviceCard.insertMany(adviceCards);

    console.log('Seed complete:', {
        heroSlides: heroSlides.length,
        categories: categories.length,
        courseSections: courseSections.length,
        courses: courses.length,
        products: products.length,
        adviceCards: adviceCards.length,
    });

    await mongoose.disconnect();
}

seed().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
});
