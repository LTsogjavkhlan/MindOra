// Field rules shared by the public contact form and checkout.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{8}$/; // Mongolian numbers: 8 digits

// "9911 2233", "(9911)-2233" -> "99112233"
const normalizePhone = (phone) => String(phone).replace(/[\s\-()]/g, '');

// Trimmed string, or '' for anything missing / not a string, capped at `max`.
const cleanText = (value, max = 1000) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

module.exports = { EMAIL_REGEX, PHONE_REGEX, normalizePhone, cleanText };
