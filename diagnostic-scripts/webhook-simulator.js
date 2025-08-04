const axios = require('axios');
const fs = require('fs');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/webhook-simulator.log', formattedMessage + '\n');
}

// Тестовый вебхук при переходе в этап для сделки
const testWebhookData = {
  leads: {
    status: [
      {
        id: 123456,
        old_pipeline_id: 752662,
        pipeline_id: 752662,
        old_status_id: 16203334,
        status_id: 16203337
      }
    ]
  }
};

async function sendTestWebhook() {
  log('=== Начало отправки тестового вебхука ===');

  try {
    // Определяем URL сервера для вебхука
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
    
    log(`Отправляем тестовый вебхук на ${webhookUrl}`);
    log(`Тело запроса: ${JSON.stringify(testWebhookData)}`);
    
    const response = await axios.post(webhookUrl, testWebhookData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    log(`Ответ сервера: ${response.status} ${response.statusText}`);
    log(`Тело ответа: ${JSON.stringify(response.data)}`);
    log('=== Тестовый вебхук успешно отправлен ===');
  } catch (error) {
    log(`ОШИБКА: ${error.message}`);
    if (error.response) {
      log(`Статус ответа: ${error.response.status}`);
      log(`Тело ответа: ${JSON.stringify(error.response.data)}`);
    }
    log('=== Отправка тестового вебхука завершена с ошибкой ===');
  }
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/webhook-simulator.log', '');

// Отправляем тестовый вебхук
sendTestWebhook();
