const dns = require('dns');
const mongoose = require('mongoose');

// Wraps any user-supplied `$`-operator objects in query filters with $eq,
// so request values can never turn into query operators (NoSQL injection).
mongoose.set('sanitizeFilter', true);

// On some Windows setups, Node's DNS resolver picks up the router's IPv6
// link-local DNS server, which fails SRV lookups (mongodb+srv://) even
// though the OS resolver works fine. Opt in with e.g. DNS_SERVERS=8.8.8.8,1.1.1.1.
// This is process-wide, so it only applies when explicitly configured.
if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
}

module.exports = { connectDB, mongoose };
