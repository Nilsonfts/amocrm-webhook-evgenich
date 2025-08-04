const fs = require('fs');
const axios = require('axios');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/webhook-listener-diagnostic.log', formattedMessage + '\n');
}

// Функция для анализа кода обработчика вебхуков
function analyzeWebhookHandlerCode() {
  log('=== Анализ кода обработчика вебхуков ===');
  
  try {
    // Чтение основных файлов приложения
    if (fs.existsSync('./index.js')) {
      const indexCode = fs.readFileSync('./index.js', 'utf8');
      log('Файл index.js найден, анализ основного кода приложения...');
      
      // Поиск маршрута для вебхуков
      const webhookRouteMatch = indexCode.match(/app\.(post|all)\(['"](\/webhook[^'"]*)['"]/);
      if (webhookRouteMatch) {
        const webhookPath = webhookRouteMatch[2];
        log(`✓ Найден маршрут для вебхуков: ${webhookPath}`);
      } else {
        log('✗ Не удалось найти маршрут для вебхуков в коде');
      }
      
      // Поиск порта для прослушивания
      const portMatch = indexCode.match(/(?:PORT|port)\s*(?:=|:)\s*([0-9]+)|\.listen\(([0-9]+)/);
      if (portMatch) {
        const port = portMatch[1] || portMatch[2];
        log(`✓ Найдена настройка порта: ${port}`);
      } else {
        const envPortMatch = indexCode.match(/process\.env\.PORT/);
        if (envPortMatch) {
          log(`✓ Порт настраивается через переменную окружения PORT`);
        } else {
          log('✗ Не удалось найти настройку порта в коде');
        }
      }
    } else {
      log('✗ Файл index.js не найден');
    }
    
    // Анализ обработки вебхуков AmoCRM
    if (fs.existsSync('./data-synchronizer.js')) {
      const syncCode = fs.readFileSync('./data-synchronizer.js', 'utf8');
      log('Анализ обработчика синхронизации данных...');
      
      // Проверка наличия функций для обработки сделок
      if (syncCode.includes('leads') && syncCode.includes('status')) {
        log('✓ Найден код для обработки изменения статуса сделок');
      } else {
        log('✗ Не найден код для обработки изменения статуса сделок');
      }
    } else {
      log('✗ Файл data-synchronizer.js не найден');
    }
    
    // Анализ маппинга данных
    if (fs.existsSync('./deal-mapper.js')) {
      const mapperCode = fs.readFileSync('./deal-mapper.js', 'utf8');
      log('Анализ маппинга данных из AmoCRM в Google Sheets...');
      
      // Проверка наличия функций для маппинга данных
      if (mapperCode.includes('map') || mapperCode.includes('transform')) {
        log('✓ Найдены функции для маппинга/преобразования данных');
      } else {
        log('✗ Не найдены функции для маппинга/преобразования данных');
      }
    } else {
      log('✗ Файл deal-mapper.js не найден');
    }
    
  } catch (error) {
    log(`ОШИБКА при анализе кода: ${error.message}`);
  }
  
  log('=== Анализ кода обработчика вебхуков завершен ===');
}

// Функция для проверки доступности сервера
async function checkServerAvailability() {
  log('=== Проверка доступности сервера ===');
  
  // Получение порта из переменной окружения или использование порта по умолчанию
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  try {
    log(`Проверка доступности сервера на ${baseUrl}...`);
    const response = await axios.get(baseUrl, { timeout: 5000 });
    
    log(`✓ Сервер доступен, статус ответа: ${response.status}`);
    log(`✓ Тело ответа: ${JSON.stringify(response.data).substring(0, 200)}${response.data.length > 200 ? '...' : ''}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(`✗ Сервер недоступен по адресу ${baseUrl}. Возможно, сервер не запущен.`);
    } else if (error.response) {
      log(`✓ Сервер доступен, но вернул ошибку: ${error.response.status} ${error.response.statusText}`);
    } else {
      log(`✗ Ошибка при проверке доступности сервера: ${error.message}`);
    }
  }
  
  // Проверка маршрута вебхука
  try {
    const webhookUrl = `${baseUrl}/webhook`;
    log(`Проверка маршрута вебхука ${webhookUrl}...`);
    
    const response = await axios.get(webhookUrl, { timeout: 5000 });
    log(`✓ Маршрут вебхука доступен, статус: ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 405) {
      log(`✓ Маршрут вебхука существует, но метод GET не поддерживается (это нормально)`);
    } else if (error.response) {
      log(`✓ Маршрут вебхука вернул ошибку: ${error.response.status} ${error.response.statusText}`);
    } else {
      log(`✗ Маршрут вебхука недоступен: ${error.message}`);
    }
  }
  
  log('=== Проверка доступности сервера завершена ===');
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/webhook-listener-diagnostic.log', '');

// Запуск диагностики
async function runDiagnostics() {
  analyzeWebhookHandlerCode();
  await checkServerAvailability();
}

runDiagnostics();
