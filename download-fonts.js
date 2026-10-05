const https = require('https');
const fs = require('fs');
const path = require('path');

// Unbounded and Manrope are variable fonts - Google Fonts serves one file per
// family covering the whole weight range (400-800), not a separate file per weight.
const fontFiles = [
    {
        url: 'https://fonts.gstatic.com/s/unbounded/v12/Yq6W-LOTXCb04q32xlpwu8Zf.woff2',
        dest: 'public/assets/fonts/unbounded-variable-latin.woff2'
    },
    {
        url: 'https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2',
        dest: 'public/assets/fonts/manrope-variable-latin.woff2'
    },
];

// Function to download a file
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log(`Downloaded: ${dest}`);
                    resolve();
                });
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            console.error(`Error downloading ${url}:`, err.message);
            reject(err);
        });
    });
};

// Download all fonts
const downloadFonts = async () => {
    console.log('Downloading font files...');

    for (const font of fontFiles) {
        try {
            await downloadFile(font.url, font.dest);
        } catch (error) {
            console.error(`Failed to download ${font.url}:`, error);
        }
    }

    console.log('All fonts downloaded successfully!');
};

// Create font directory if it doesn't exist
const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
};

// Make sure the fonts directory exists
ensureDirExists(path.join(__dirname, 'assets', 'fonts'));

// Start downloading fonts
downloadFonts();
