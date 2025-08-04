const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/credentials-test.log', formattedMessage + '\n');
}

async function testGoogleCredentials() {
  log('=== Проверка учетных данных Google ===');

  // Создадим директорию для логов, если её нет
  if (!fs.existsSync('./diagnostic-logs')) {
    fs.mkdirSync('./diagnostic-logs');
  }

  try {
    // Получаем учетные данные из переменной окружения
    const credentialsEnvVar = process.env.GOOGLE_CREDENTIALS;
    
    if (!credentialsEnvVar) {
      log('ОШИБКА: Переменная GOOGLE_CREDENTIALS не найдена');
      return;
    }
    
    log(`Длина строки с учетными данными: ${credentialsEnvVar.length} символов`);
    
    // Пытаемся распарсить JSON из переменной окружения
    let credentialsObject;
    try {
      credentialsObject = JSON.parse(credentialsEnvVar);
      log('✓ JSON формат переменной GOOGLE_CREDENTIALS корректный');
    } catch (e) {
      log(`ОШИБКА: Некорректный формат JSON в GOOGLE_CREDENTIALS: ${e.message}`);
      
      // Пытаемся исправить типичные проблемы с экранированием
      log('Пытаемся исправить формат...');
      const fixedJson = credentialsEnvVar
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n');
        
      try {
        credentialsObject = JSON.parse(fixedJson);
        log('✓ Формат JSON успешно исправлен');
      } catch (e2) {
        log(`ОШИБКА: Не удалось исправить формат JSON: ${e2.message}`);
        return;
      }
    }
    
    // Проверяем необходимые поля
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !credentialsObject[field]);
    
    if (missingFields.length > 0) {
      log(`ОШИБКА: В учетных данных отсутствуют обязательные поля: ${missingFields.join(', ')}`);
      return;
    }
    
    log(`✓ Обязательные поля присутствуют`);
    log(`✓ client_email: ${credentialsObject.client_email}`);
    log(`✓ project_id: ${credentialsObject.project_id}`);
    
    // Создаем и сохраняем корректный файл учетных данных
    const outputFile = './google-credentials-test.json';
    fs.writeFileSync(outputFile, JSON.stringify(credentialsObject, null, 2));
    log(`✓ Файл с учетными данными создан: ${outputFile}`);

    // Получаем ID таблицы
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      log('ОШИБКА: Переменная GOOGLE_SHEET_ID не найдена');
      return;
    }
    log(`ID таблицы: ${spreadsheetId}`);
    
    // Тестируем подключение к таблице с использованием созданного файла
    log('Тестирование подключения к Google Sheets...');
    const doc = new GoogleSpreadsheet(spreadsheetId);
    
    try {
      // Используем сервисный аккаунт
      await doc.useServiceAccountAuth(credentialsObject);
      log('✓ Авторизация прошла успешно');
      
      // Загружаем информацию о документе
      await doc.loadInfo();
      log(`✓ Успешное подключение к таблице: ${doc.title}`);
      
      // Получаем список листов
      log('Доступные листы:');
      doc.sheetsByIndex.forEach((sheet, index) => {
        log(`  ${index + 1}. ${sheet.title} (${sheet.rowCount} строк, ${sheet.columnCount} столбцов)`);
      });
      
      // Тестовая запись
      log('Пробуем создать тестовый лист...');
      const testSheetTitle = 'Тест_' + new Date().toISOString().replace(/[:.]/g, '_');
      
      try {
        const testSheet = await doc.addSheet({ title: testSheetTitle });
        log(`✓ Тестовый лист "${testSheetTitle}" создан`);
        
        // Добавляем тестовые данные
        await testSheet.setHeaderRow(['Время', 'Сообщение']);
        await testSheet.addRow({ 'Время': new Date().toISOString(), 'Сообщение': 'Тест подключения успешен' });
        log('✓ Тестовые данные записаны');
      } catch (sheetError) {
        log(`ПРЕДУПРЕЖДЕНИЕ: Не удалось создать тестовый лист: ${sheetError.message}`);
        log('Проверьте права доступа сервисного аккаунта к таблице');
      }
      
      log('=== Проверка учетных данных завершена успешно ===');
    } catch (authError) {
      log(`ОШИБКА авторизации: ${authError.message}`);
      if (authError.message.includes('invalid_grant')) {
        log('Возможно, проблема с форматом private_key в учетных данных');
      }
      log('=== Проверка учетных данных завершена с ошибкой ===');
    }
  } catch (error) {
    log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
    log('=== Проверка учетных данных завершена с ошибкой ===');
  }
}

// Очистим файл логов перед запуском
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}
fs.writeFileSync('./diagnostic-logs/credentials-test.log', '');

// Запускаем проверку
testGoogleCredentials();
