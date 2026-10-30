const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

const FROM_NAME = 'MindOra';
const BRAND = '#069494';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const formatPrice = (amount) => `${new Intl.NumberFormat('mn-MN').format(amount)}₮`;

function row(label, value) {
    return `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                <div style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
                <div style="font-size: 15px; color: #222; margin-top: 2px;">${value}</div>
            </td>
        </tr>`;
}

// Shared card layout for every email: coloured header, body, small footer.
function layout({ title, subtitle = 'MindOra', body, footer }) {
    return `
    <div style="background: #f4f4f7; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <div style="background: ${BRAND}; padding: 20px 24px;">
                <h1 style="margin: 0; font-size: 18px; color: #ffffff;">${title}</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">${subtitle}</p>
            </div>
            ${body}
        </div>
        ${footer ? `<p style="max-width: 520px; margin: 16px auto 0; text-align: center; font-size: 12px; color: #999;">${footer}</p>` : ''}
    </div>`;
}

const section = (inner, padding = '8px 24px 4px') => `<div style="padding: ${padding};">${inner}</div>`;

// ---------------- Contact form ----------------

async function sendContactMail({ name, phone, email, subject, message }) {
    const html = layout({
        title: 'Шинэ Холбоо Барих Хүсэлт',
        body: section(`
            <table style="width: 100%; border-collapse: collapse;">
                ${row('Нэр', escapeHtml(name))}
                ${row('Имэйл', `<a href="mailto:${escapeHtml(email)}" style="color: ${BRAND}; text-decoration: none;">${escapeHtml(email)}</a>`)}
                ${row('Утас', escapeHtml(phone) || 'Оруулаагүй')}
                ${row('Гарчиг', escapeHtml(subject) || 'Холбоо барих хүсэлт')}
            </table>`) + section(`
            <div style="font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Мессеж</div>
            <div style="background: #f0f9f8; border: 1px solid #cdeae8; border-radius: 8px; padding: 14px 16px; font-size: 15px; line-height: 1.5; color: #222; white-space: pre-wrap;">${escapeHtml(message)}</div>`, '4px 24px 24px'),
        footer: `MindOra-ийн холбоо барих маягтаас илгээгдсэн &mdash; ${escapeHtml(name)}-д хариулахын тулд шууд хариу бичнэ үү.`,
    });

    await transporter.sendMail({
        from: `"${FROM_NAME} Contact Form" <${process.env.GMAIL_USER}>`,
        to: process.env.CONTACT_TO_EMAIL,
        replyTo: email,
        subject: `${name}-с ирсэн хүсэлт - ${subject || 'Холбоо барих хүсэлт'}`,
        text: `Нэр: ${name}\nУтас: ${phone || 'Оруулаагүй'}\nИмэйл: ${email}\nГарчиг: ${subject || 'Холбоо барих хүсэлт'}\n\nМессеж:\n${message}`,
        html,
    });
}

// ---------------- Orders ----------------

function itemsTable(order) {
    const rows = order.items.map((item) => `
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #222;">${escapeHtml(item.title)} &times; ${item.quantity}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #222; text-align: right; white-space: nowrap;">${formatPrice(item.unitPrice * item.quantity)}</td>
        </tr>`).join('');
    return `
        <table style="width: 100%; border-collapse: collapse;">
            ${rows}
            <tr>
                <td style="padding: 12px 0 0; font-size: 15px; font-weight: 700; color: #222;">Нийт</td>
                <td style="padding: 12px 0 0; font-size: 15px; font-weight: 700; color: #222; text-align: right; white-space: nowrap;">${formatPrice(order.total)}</td>
            </tr>
        </table>`;
}

const itemsText = (order) => order.items
    .map((item) => `- ${item.title} x ${item.quantity}: ${formatPrice(item.unitPrice * item.quantity)}`)
    .join('\n') + `\nНийт: ${formatPrice(order.total)}`;

// To the shop owner: everything needed to fulfil the order.
async function sendOrderNotification(order) {
    const { customer } = order;
    const html = layout({
        title: `Шинэ захиалга #${order.orderNumber}`,
        subtitle: 'Бэлэн мөнгөөр, хүргэлтээр төлнө',
        body: section(itemsTable(order), '16px 24px 8px') + section(`
            <table style="width: 100%; border-collapse: collapse;">
                ${row('Нэр', escapeHtml(customer.name))}
                ${row('Утас', `<a href="tel:${escapeHtml(customer.phone)}" style="color: ${BRAND}; text-decoration: none;">${escapeHtml(customer.phone)}</a>`)}
                ${row('Имэйл', `<a href="mailto:${escapeHtml(customer.email)}" style="color: ${BRAND}; text-decoration: none;">${escapeHtml(customer.email)}</a>`)}
                ${row('Хүргэх хаяг', `<span style="white-space: pre-wrap;">${escapeHtml(customer.address)}</span>`)}
                ${customer.note ? row('Тэмдэглэл', `<span style="white-space: pre-wrap;">${escapeHtml(customer.note)}</span>`) : ''}
            </table>`, '4px 24px 24px'),
        footer: 'Захиалгыг админ хуудасны "Захиалга" хэсгээс удирдана уу.',
    });

    await transporter.sendMail({
        from: `"${FROM_NAME} Shop" <${process.env.GMAIL_USER}>`,
        to: process.env.CONTACT_TO_EMAIL,
        replyTo: customer.email,
        subject: `Шинэ захиалга #${order.orderNumber} - ${customer.name} (${formatPrice(order.total)})`,
        text: `Захиалга #${order.orderNumber}\n\n${itemsText(order)}\n\nНэр: ${customer.name}\nУтас: ${customer.phone}\nИмэйл: ${customer.email}\nХаяг: ${customer.address}${customer.note ? `\nТэмдэглэл: ${customer.note}` : ''}`,
        html,
    });
}

// To the customer: their receipt and what happens next.
async function sendOrderConfirmation(order) {
    const { customer } = order;
    const html = layout({
        title: `Таны захиалга #${order.orderNumber} хүлээн авлаа`,
        body: section(`
            <p style="margin: 8px 0 16px; font-size: 15px; line-height: 1.5; color: #222;">
                Сайн байна уу, ${escapeHtml(customer.name)}. Захиалга өгсөнд баярлалаа!
                Бид тантай <strong>${escapeHtml(customer.phone)}</strong> дугаараар холбогдож хүргэлтийг баталгаажуулна.
            </p>
            ${itemsTable(order)}`, '16px 24px 8px') + section(`
            <table style="width: 100%; border-collapse: collapse;">
                ${row('Хүргэх хаяг', `<span style="white-space: pre-wrap;">${escapeHtml(customer.address)}</span>`)}
                ${row('Төлбөр', 'Хүргэлтээр бэлнээр төлнө')}
            </table>`, '4px 24px 24px'),
        footer: 'Асуулт байвал энэ имэйлд хариу бичнэ үү.',
    });

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to: customer.email,
        replyTo: process.env.CONTACT_TO_EMAIL,
        subject: `MindOra захиалга #${order.orderNumber} баталгаажлаа`,
        text: `Сайн байна уу, ${customer.name}.\n\nТаны захиалга #${order.orderNumber} хүлээн авлаа.\n\n${itemsText(order)}\n\nХүргэх хаяг: ${customer.address}\nТөлбөр: Хүргэлтээр бэлнээр төлнө.\n\nБид тантай ${customer.phone} дугаараар холбогдоно.`,
        html,
    });
}

// ---------------- Course enrollments ----------------

async function sendEnrollmentNotification(enrollment) {
    const html = layout({
        title: 'Шинэ сургалтын бүртгэл',
        subtitle: escapeHtml(enrollment.courseTitle),
        body: section(`
            <table style="width: 100%; border-collapse: collapse;">
                ${row('Хичээл', escapeHtml(enrollment.courseTitle))}
                ${row('Нэр', escapeHtml(enrollment.name))}
                ${row('Утас', `<a href="tel:${escapeHtml(enrollment.phone)}" style="color: ${BRAND}; text-decoration: none;">${escapeHtml(enrollment.phone)}</a>`)}
                ${row('Имэйл', `<a href="mailto:${escapeHtml(enrollment.email)}" style="color: ${BRAND}; text-decoration: none;">${escapeHtml(enrollment.email)}</a>`)}
                ${enrollment.note ? row('Тэмдэглэл', `<span style="white-space: pre-wrap;">${escapeHtml(enrollment.note)}</span>`) : ''}
            </table>`, '8px 24px 24px'),
        footer: 'Бүртгэлийг админ хуудасны "Бүртгэл" хэсгээс удирдана уу.',
    });

    await transporter.sendMail({
        from: `"${FROM_NAME} Surgalt" <${process.env.GMAIL_USER}>`,
        to: process.env.CONTACT_TO_EMAIL,
        replyTo: enrollment.email,
        subject: `Шинэ бүртгэл: ${enrollment.courseTitle} - ${enrollment.name}`,
        text: `Хичээл: ${enrollment.courseTitle}\nНэр: ${enrollment.name}\nУтас: ${enrollment.phone}\nИмэйл: ${enrollment.email}${enrollment.note ? `\nТэмдэглэл: ${enrollment.note}` : ''}`,
        html,
    });
}

async function sendEnrollmentConfirmation(enrollment) {
    const html = layout({
        title: 'Таны бүртгэлийн хүсэлт хүлээн авлаа',
        body: section(`
            <p style="margin: 8px 0 16px; font-size: 15px; line-height: 1.5; color: #222;">
                Сайн байна уу, ${escapeHtml(enrollment.name)}. <strong>${escapeHtml(enrollment.courseTitle)}</strong>
                хичээлд бүртгүүлэх хүсэлтийг тань хүлээн авлаа. Бид тантай
                <strong>${escapeHtml(enrollment.phone)}</strong> дугаараар холбогдож дэлгэрэнгүй мэдээлэл өгнө.
            </p>`, '16px 24px 24px'),
        footer: 'Асуулт байвал энэ имэйлд хариу бичнэ үү.',
    });

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to: enrollment.email,
        replyTo: process.env.CONTACT_TO_EMAIL,
        subject: `MindOra: ${enrollment.courseTitle} - бүртгэлийн хүсэлт`,
        text: `Сайн байна уу, ${enrollment.name}.\n\n${enrollment.courseTitle} хичээлд бүртгүүлэх хүсэлтийг тань хүлээн авлаа. Бид тантай ${enrollment.phone} дугаараар холбогдоно.`,
        html,
    });
}

module.exports = {
    sendContactMail,
    sendOrderNotification,
    sendOrderConfirmation,
    sendEnrollmentNotification,
    sendEnrollmentConfirmation,
};
