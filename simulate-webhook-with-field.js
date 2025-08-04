const fs = require('fs');
const axios = require('axios');

// Функция для логирования
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Вспомогательная функция для красивого вывода объекта
function prettyPrint(obj) {
  return JSON.stringify(obj, null, 2);
}

// Функция для симуляции вебхука с разными данными
async function simulateWebhook() {
  log('=== Симуляция вебхука AmoCRM ===');
  
  try {
    // Определение URL сервера
    const port = process.env.PORT || 3000;
    const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${port}/webhook`;
    
    // Тестовый вебхук для сделки с полем "Бар (deal)" = "ЕВГ СПБ"
    const testWebhookData = {
      leads: {
        status: [
          {
            id: 123456789, // ID сделки (можно заменить на реальный)
            old_pipeline_id: 752662,
            pipeline_id: 752662,
            old_status_id: 16203334,
            status_id: 16203337,
            custom_fields: [
              {
                id: 1039939, // ID поля "Бар (deal)"
                name: "Бар (deal)",
                values: [
                  {
                    value: "ЕВГ СПБ"
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    
    log('Отправка тестового вебхука со значением "Бар (deal)" = "ЕВГ СПБ"');
    log(`URL: ${webhookUrl}`);
    log(`Тело запроса:\n${prettyPrint(testWebhookData)}`);
    
    // Отправка запроса
    const response = await axios.post(webhookUrl, testWebhookData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    log(`Статус ответа: ${response.status}`);
    log(`Тело ответа: ${prettyPrint(response.data)}`);
    
    log('Тестовый вебхук успешно отправлен!');
    
  } catch (error) {
    log(`ОШИБКА при отправке тестового вебхука: ${error.message}`);
    if (error.response) {
      log(`Статус ответа: ${error.response.status}`);
      log(`Тело ответа: ${prettyPrint(error.response.data)}`);
    }
  }
  
  log('=== Симуляция вебхука AmoCRM завершена ===');
}

// Запуск симуляции
simulateWebhook();
