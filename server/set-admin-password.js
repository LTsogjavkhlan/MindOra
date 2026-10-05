// Creates the admin login, or resets its password, from ADMIN_USERNAME /
// ADMIN_PASSWORD in .env. Unlike seed.js it never touches page content.
// Usage: npm run admin:password
require('dotenv').config();
const bcrypt = require('bcrypt');
const { connectDB, mongoose } = require('./db.js');
const AdminUser = require('./models/AdminUser.js');

async function setAdminPassword() {
    const { ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = process.env;
    if (!username || !password) {
        throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env first.');
    }

    await connectDB();
    const passwordHash = await bcrypt.hash(password, 12);
    const { upsertedCount } = await AdminUser.updateOne({ username }, { passwordHash }, { upsert: true });
    console.log(upsertedCount ? `Created admin user "${username}".` : `Updated password for "${username}".`);
    await mongoose.disconnect();
}

setAdminPassword().catch((error) => {
    console.error('Failed to set admin password:', error.message);
    process.exit(1);
});
