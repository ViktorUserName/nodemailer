const nodemailer = require('nodemailer');



const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.GMAIL_USER,      
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    
    timeout: 300,
});

/**
 * Отправляет email с контактной формы.
 * @param {string} name - Имя отправителя.
 * @param {string} email - Email отправителя.
 * @param {string} message - Текст сообщения.
 */
async function sendContactEmail({ name, email, message }) {
    if (!name || !email || !message) {
        console.error("NodemailerHandler: Недостаточно данных для отправки email.");
        throw new Error("Missing required fields for sending email.");
    }

    const mailOptions = {
        from: `"${name}" <${email}>`, 
        to: process.env.ADMIN_EMAIL || 'ваш_адрес_для_сообщений@example.com', 
        subject: `Новое сообщение с формы контакта от ${name}`, 
        html: `
            <p><strong>Получено новое сообщение с формы контакта:</strong></p>
            <ul>
                <li><strong>Имя:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
            <p><strong>Сообщение:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
            <hr>
            <p>Этот email был отправлен автоматически через вашу контактную форму.</p>
        `,
        replyTo: email,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email отправлен: ${info.messageId}`);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Ошибка при отправке email через Nodemailer:', error);
        throw new Error(`Ошибка отправки email: ${error.message}`);
    }
}

module.exports = {
    sendContactEmail,
};