const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/diagnostics.log', formattedMessage + '\n');
}

async function runDiagnostics() {
  log('=== Начало диагностики ===');

  try {
    // Проверка наличия необходимых переменных окружения
    const requiredEnvVars = [
      'GOOGLE_CREDENTIALS', 
      'GOOGLE_SHEET_ID', 
      'GOOGLE_SHEET_GID'
    ];

    log('Проверяем переменные окружения:');
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        log(`ОШИБКА: Переменная ${envVar} не установлена`);
      } else {
        log(`OK: ${envVar} установлена`);
        
        // Для GOOGLE_CREDENTIALS проверим, можем ли мы распарсить JSON
        if (envVar === 'GOOGLE_CREDENTIALS') {
          try {
            const parsedCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            log(`OK: GOOGLE_CREDENTIALS содержит валидный JSON`);
            log(`Сервисный аккаунт: ${parsedCredentials.client_email}`);
          } catch (e) {
            log(`ОШИБКА: GOOGLE_CREDENTIALS содержит невалидный JSON: ${e.message}`);
          }
        }
      }
    }

    // Проверка подключения к Google Sheets
    log('Тестируем подключение к Google Sheets...');
    
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();
    
    log(`OK: Успешное подключение к таблице "${doc.title}"`);

    // Запись тестовой строки
    log('Попытка записи тестовых данных...');
    
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells('A1:B2');
    
    // Читаем текущее значение A1
    const a1Value = sheet.getCellByA1('A1').value;
    log(`Текущее значение A1: ${a1Value}`);
    
    // Записываем тестовое значение
    const testValue = `Тест диагностики ${new Date().toISOString()}`;
    sheet.getCellByA1('B2').value = testValue;
    await sheet.saveUpdatedCells();
    
    log(`OK: Тестовое значение "${testValue}" записано в B2`);

    log('=== Диагностика успешно завершена ===');
  } catch (error) {
    log(`ОШИБКА: ${error.message}`);
    if (error.stack) {
      log(`Стек ошибки: ${error.stack}`);
    }
    log('=== Диагностика завершена с ошибками ===');
  }
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/diagnostics.log', '');

// Загрузим переменные из .env.test, если нет в окружении
if (!process.env.GOOGLE_CREDENTIALS) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: './.env.test' });
    log('Загружены переменные окружения из .env.test');
  } catch (e) {
    log(`Не удалось загрузить переменные из .env.test: ${e.message}`);
  }
}

// Запустим диагностику
runDiagnostics();
