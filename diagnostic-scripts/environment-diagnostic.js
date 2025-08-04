const fs = require('fs');
const path = require('path');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/environment-diagnostic.log', formattedMessage + '\n');
}

function checkEnvironmentVariables() {
  log('=== Начало диагностики переменных окружения ===');
  
  // Список ожидаемых переменных окружения
  const requiredVars = [
    'PORT',
    'GOOGLE_SHEET_ID',
    'GOOGLE_CREDENTIALS_PATH',
    'WEBHOOK_TOKEN'
  ];
  
  // Дополнительные переменные, которые могут быть полезны
  const optionalVars = [
    'NODE_ENV',
    'LOG_LEVEL',
    'DEBUG'
  ];
  
  // Проверка обязательных переменных
  log('Проверка обязательных переменных окружения:');
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✓ ${varName} = ${varName === 'WEBHOOK_TOKEN' ? '[СКРЫТО]' : process.env[varName]}`);
    } else {
      log(`✗ ${varName} - ОТСУТСТВУЕТ`);
      missingVars.push(varName);
    }
  });
  
  // Проверка дополнительных переменных
  log('\nПроверка дополнительных переменных окружения:');
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✓ ${varName} = ${process.env[varName]}`);
    } else {
      log(`- ${varName} - не установлена`);
    }
  });
  
  // Проверка файла с учетными данными Google
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json';
  log(`\nПроверка файла учетных данных Google по пути: ${credentialsPath}`);
  
  if (fs.existsSync(credentialsPath)) {
    log(`✓ Файл существует`);
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      log(`✓ Файл содержит корректный JSON`);
      
      // Проверка обязательных полей в credentials
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      
      if (missingFields.length === 0) {
        log(`✓ Файл содержит все необходимые поля`);
        log(`✓ client_email = ${credentials.client_email}`);
        log(`✓ project_id = ${credentials.project_id}`);
      } else {
        log(`✗ В файле отсутствуют обязательные поля: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      log(`✗ Ошибка при чтении файла учетных данных: ${error.message}`);
    }
  } else {
    log(`✗ Файл не существует`);
  }
  
  // Проверка файла с конфигурацией полей
  const fieldsConfigPath = './config/fields.json';
  log(`\nПроверка конфигурации полей: ${fieldsConfigPath}`);
  
  if (fs.existsSync(fieldsConfigPath)) {
    log(`✓ Файл конфигурации полей существует`);
    try {
      const fieldsConfig = JSON.parse(fs.readFileSync(fieldsConfigPath, 'utf8'));
      log(`✓ Файл содержит корректный JSON`);
      log(`✓ Количество настроенных полей: ${Object.keys(fieldsConfig).length}`);
    } catch (error) {
      log(`✗ Ошибка при чтении файла конфигурации полей: ${error.message}`);
    }
  } else {
    log(`✗ Файл конфигурации полей не существует`);
  }
  
  // Проверка существующих файлов
  log('\nПроверка основных файлов приложения:');
  const filesToCheck = [
    'index.js',
    'amocrm-api.js',
    'google-sheets-api.js',
    'deal-mapper.js',
    'data-synchronizer.js'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      log(`✓ ${file} - файл существует`);
    } else {
      log(`✗ ${file} - файл ОТСУТСТВУЕТ`);
    }
  });
  
  // Вывод итогов
  log('\n=== Итоги диагностики ===');
  if (missingVars.length > 0) {
    log(`✗ Отсутствуют необходимые переменные окружения: ${missingVars.join(', ')}`);
  } else {
    log('✓ Все необходимые переменные окружения установлены');
  }
  
  log('=== Диагностика переменных окружения завершена ===');
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/environment-diagnostic.log', '');

// Запуск диагностики
checkEnvironmentVariables();
