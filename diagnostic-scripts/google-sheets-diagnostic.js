const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/google-sheets-diagnostic.log', formattedMessage + '\n');
}

async function testGoogleSheetsConnection() {
  log('=== Начало диагностики подключения к Google Sheets ===');

  try {
    // Проверка переменных окружения
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      log('ОШИБКА: Не найдена переменная окружения GOOGLE_SHEET_ID');
      return;
    }
    log(`Используется ID таблицы: ${spreadsheetId}`);

    // Проверка наличия файла с учетными данными Google
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json';
    if (!fs.existsSync(credentialsPath)) {
      log(`ОШИБКА: Файл с учетными данными Google не найден по пути ${credentialsPath}`);
      return;
    }
    log(`Файл с учетными данными Google найден: ${credentialsPath}`);

    // Чтение и проверка формата учетных данных
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      log('Учетные данные Google прочитаны успешно');
      
      // Проверка обязательных полей в credentials
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      
      if (missingFields.length > 0) {
        log(`ОШИБКА: В файле учетных данных отсутствуют обязательные поля: ${missingFields.join(', ')}`);
      } else {
        log('Формат файла учетных данных Google корректный');
      }
    } catch (error) {
      log(`ОШИБКА при чтении файла учетных данных: ${error.message}`);
      return;
    }

    // Подключение к Google Sheets
    log('Попытка подключения к Google Sheets...');
    const doc = new GoogleSpreadsheet(spreadsheetId);
    
    // Загрузка учетных данных
    await doc.useServiceAccountAuth(require(credentialsPath));
    
    // Загрузка информации о документе
    await doc.loadInfo();
    log(`Успешное подключение к таблице "${doc.title}"`);
    
    // Получение доступных листов
    log(`Доступные листы в таблице:`);
    doc.sheetsByIndex.forEach((sheet, index) => {
      log(`  ${index + 1}. ${sheet.title} (ID: ${sheet.sheetId}, Строк: ${sheet.rowCount}, Столбцов: ${sheet.columnCount})`);
    });
    
    // Тестовая запись и чтение данных
    const testSheetTitle = 'Тест_Диагностики';
    
    log(`Создание тестового листа "${testSheetTitle}"...`);
    let testSheet;
    
    try {
      // Проверим существование листа перед созданием
      testSheet = doc.sheetsByTitle[testSheetTitle];
      
      if (!testSheet) {
        testSheet = await doc.addSheet({ title: testSheetTitle });
        log(`Тестовый лист "${testSheetTitle}" успешно создан`);
      } else {
        log(`Тестовый лист "${testSheetTitle}" уже существует, используем его`);
      }
      
      // Запись тестовых данных
      const timestamp = new Date().toISOString();
      await testSheet.setHeaderRow(['Timestamp', 'Test Message']);
      await testSheet.addRow({ 'Timestamp': timestamp, 'Test Message': 'Тестовая диагностическая запись' });
      log('Тестовые данные успешно записаны в таблицу');
      
      // Чтение тестовых данных
      const rows = await testSheet.getRows();
      log(`Прочитано ${rows.length} строк из тестового листа`);
      
      if (rows.length > 0) {
        log(`Последняя строка: Timestamp=${rows[rows.length-1]['Timestamp']}, Message=${rows[rows.length-1]['Test Message']}`);
      }
    } catch (error) {
      log(`ОШИБКА при работе с тестовым листом: ${error.message}`);
    }
    
    log('=== Диагностика подключения к Google Sheets завершена успешно ===');
  } catch (error) {
    log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
    log('=== Диагностика подключения к Google Sheets завершена с ошибкой ===');
  }
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/google-sheets-diagnostic.log', '');

// Запуск диагностики
testGoogleSheetsConnection();
