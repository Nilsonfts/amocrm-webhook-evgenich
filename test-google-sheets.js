const { google } = require('googleapis');
const fs = require('fs');

console.log('🧪 Тестирование подключения к Google Sheets...');

try {
    // Читаем credentials
    const credentials = JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    console.log('✅ Credentials загружены');

    // Исправляем переносы строк в private_key
    const fixedCredentials = {
        ...credentials,
        private_key: credentials.private_key.replace(/\\n/g, '\n')
    };

    console.log('🔑 Тестируем новый подход с полным объектом credentials');

    // Создаем JWT аутентификацию используя весь объект credentials
    const auth = google.auth.fromJSON(fixedCredentials);
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    
    console.log('✅ Auth создан');
    
    // Авторизуемся
    auth.authorize((err, tokens) => {
        if (err) {
            console.error('❌ Ошибка авторизации:', err.message);
            return;
        }
        
        console.log('✅ Авторизация успешна');
        
        // Создаем объект Sheets API
        const sheets = google.sheets({ version: 'v4', auth: auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE';
        
        console.log('📊 Spreadsheet ID:', spreadsheetId);
        
        // Пробуем добавить тестовую строку
        const testData = ['TEST-' + Date.now(), 'Тестовая сделка', 'Тестовый контакт', 'Тестовый менеджер'];
        
        sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'A:AZ',
            valueInputOption: 'RAW',
            resource: {
                values: [testData]
            }
        }, (err, result) => {
            if (err) {
                console.error('❌ Ошибка добавления данных:', err.message);
                if (err.code === 403) {
                    console.error('🔐 Возможная проблема с правами доступа к таблице');
                }
                return;
            }
            
            console.log('✅ Тестовая строка добавлена!');
            console.log('📊 Результат:', result.data);
        });
    });
    
} catch (error) {
    console.error('❌ Ошибка:', error.message);
}
