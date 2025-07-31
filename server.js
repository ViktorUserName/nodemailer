require('dotenv').config();
const http = require('node:http');
// const { sendContactEmail } = require('./nodemailerHandler');
const crypto = require('crypto');

const amqp = require('amqplib');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'contact_messages';

const hostname = '127.0.0.1';
const port = 8501;





const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

    if (req.method === 'OPTIONS') {
        res.writeHead(204); 
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/contact') {
        let body = '';
        
        req.on('data', (chunk) => {
            body += chunk.toString(); 
        });

        req.on('end', async () => { 
            try {
                const parsedBody = JSON.parse(body);
                console.log('Получено тело запроса:', parsedBody); 

                const { name, email, message } = parsedBody;

                if (!name || !email || !message) {
                    res.statusCode = 400; 
                    res.end(JSON.stringify({ error: "All fields are required" }));
                    return; 
                }

                const djangoTaskName = 'contact.tasks.send_mail_task';
                const taskArgs = [name, email, message];
                const taskId = crypto.randomUUID();
                const celeryMessage = {
                    id: taskId,
                    task: djangoTaskName,
                    args:taskArgs,
                    kwargs:{},
                }

                const connection = await amqp.connect(RABBITMQ_URL)
                const channel = await connection.createChannel()
                await channel.assertQueue(QUEUE_NAME, {durable: true})

                channel.sendToQueue(
                    QUEUE_NAME, 
                    Buffer.from(JSON.stringify(celeryMessage)), 
                    { 
                        persistent: true,
                        contentType: 'application/json' // <-- Это обязательно!
                    }
                );
                console.log (`[x] отправлено сообщение в Ребит: ${JSON.stringify(celeryMessage)}`);



                // await sendContactEmail({ name, email, message }); 
                // console.log('Контактное сообщение успешно обработано и email отправлен.');

                res.statusCode = 200; 
                res.end(JSON.stringify({ success: "Message received and email sent" }));

            } catch (error) {
                console.error('Ошибка при обработке запроса /contact:', error);
                
              
                if (error.message.includes('JSON')) { 
                    res.statusCode = 400; 
                    res.end(JSON.stringify({ error: "Invalid JSON format in request body." }));
                } else {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: `Failed to process message: ${error.message}` }));
                }
            }
        });
    } 
    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Route not found" }));
    }
});

server.listen(port, hostname, () => {
    console.log(`Сервер запущен по адресу: http://${hostname}:${port}`);
    console.log(`Ожидаю POST-запросы на http://${hostname}:${port}/contact`);
});