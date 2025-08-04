const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function testGoogleCredentials() {
  console.log('=== Проверка новых учетных данных Google Sheets API ===');

  try {
    // Проверка переменных окружения
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE';
    console.log(`Используется ID таблицы: ${spreadsheetId}`);
    
    // Проверка наличия файла с новыми учетными данными
    const credentialsPath = './google-credentials-new.json';
    if (!fs.existsSync(credentialsPath)) {
      console.error(`ОШИБКА: Файл с учетными данными не найден: ${credentialsPath}`);
      return;
    }
    console.log(`Файл с учетными данными найден: ${credentialsPath}`);
    
    // Чтение и проверка учетных данных
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`Учетные данные прочитаны, сервисный аккаунт: ${credentials.client_email}`);
    
    // Попытка подключения к Google Sheets
    console.log('Подключение к Google Sheets...');
    const doc = new GoogleSpreadsheet(spreadsheetId);
    await doc.useServiceAccountAuth(credentials);
    
    // Загрузка информации о документе
    await doc.loadInfo();
    console.log(`Успешное подключение к таблице: "${doc.title}"`);
    
    // Получение доступных листов
    console.log('Доступные листы:');
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.title} (Строк: ${sheet.rowCount}, Столбцов: ${sheet.columnCount})`);
    });
    
    // Тестовая запись в таблицу
    console.log('\nПроверка возможности записи в таблицу...');
    const testSheet = doc.sheetsByIndex[0];
    if (testSheet) {
      try {
        // Получить заголовки столбцов
        await testSheet.loadHeaderRow();
        console.log(`Заголовки столбцов: ${testSheet.headerValues.join(', ')}`);
        
        // Тестовая запись
        const timestamp = new Date().toISOString();
        console.log(`Добавляем тестовую запись с временной меткой: ${timestamp}`);
        
        const rowData = {};
        if (testSheet.headerValues && testSheet.headerValues.length > 0) {
          // Используем первый столбец для временной метки
          rowData[testSheet.headerValues[0]] = timestamp;
          // Используем второй столбец для тестового сообщения, если он есть
          if (testSheet.headerValues.length > 1) {
            rowData[testSheet.headerValues[1]] = 'Тестовая запись (проверка новых учетных данных)';
          }
          
          await testSheet.addRow(rowData);
          console.log('✓ Тестовая запись успешно добавлена!');
        } else {
          console.log('⚠️ Невозможно добавить запись: не найдены заголовки столбцов');
        }
      } catch (error) {
        console.error(`ОШИБКА при записи в таблицу: ${error.message}`);
      }
    } else {
      console.log('⚠️ Нет доступных листов для тестирования записи');
    }
    
    console.log('\n=== Проверка завершена успешно! ===');
    console.log('Новые учетные данные работают корректно и могут быть использованы в приложении.');
    console.log('Убедитесь, что такие же учетные данные установлены в переменной окружения GOOGLE_CREDENTIALS на сервере.');
  } catch (error) {
    console.error(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
    console.log('\n=== Проверка завершена с ошибкой! ===');
    console.log('Предоставленные учетные данные не работают. Пожалуйста, проверьте правильность файла и доступ сервисного аккаунта к таблице.');
  }
}

// Запуск проверки
testGoogleCredentials();
