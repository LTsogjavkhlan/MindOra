const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(Object.assign(new Error('Зөвхөн зураг (JPEG, PNG, WebP, GIF) оруулах боломжтой.'), { status: 400 }));
        }
        cb(null, true);
    },
});

function uploadImageBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'mindora' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

// .../<cloud>/image/upload/[transformations/][v123/]mindora/abc.jpg -> "mindora/abc"
const UPLOADED_URL_REGEX = /\/image\/upload\/(?:.*?\/)?(mindora\/[^.]+)\.\w+$/;

// Best-effort removal of images we uploaded that nothing references any more.
// Ignores anything that isn't ours (e.g. the seeded /assets/images/... paths),
// and never fails the request - a leftover file is better than a failed save.
async function deleteUploadedImages(urls) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const publicIds = urls
        .filter((url) => url && cloudName && url.includes(`res.cloudinary.com/${cloudName}/`))
        .map((url) => (url.match(UPLOADED_URL_REGEX) || [])[1])
        .filter(Boolean);
    if (!publicIds.length) return;

    try {
        await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
        console.error('Failed to delete unused Cloudinary images:', publicIds, error.message);
    }
}

module.exports = { upload, uploadImageBuffer, deleteUploadedImages };
