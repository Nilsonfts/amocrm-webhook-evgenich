const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Подключаем наши модули
const AmoCRMAPI = require('./amocrm-api');
const GoogleSheetsAPI = require('./google-sheets-api');
const DataSynchronizer = require('./data-synchronizer');
const { COLUMN_STRUCTURE } = require('./column-structure');

// Загружаем переменные окружения
require('dotenv').config();

// Переменные окружения
const AMO_DOMAIN = process.env.AMO_DOMAIN || 'nebar.amocrm.ru';
const AMO_CLIENT_ID = process.env.AMO_CLIENT_ID;
const AMO_CLIENT_SECRET = process.env.AMO_CLIENT_SECRET;
const AMO_REDIRECT_URI = process.env.AMO_REDIRECT_URI || 'https://spb.evgenich.bar';
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE';
const GOOGLE_SHEET_GID = parseInt(process.env.GOOGLE_SHEET_GID || '0');

console.log('🔧 Конфигурация системы автоматической выгрузки amoCRM → Google Sheets:');
console.log(`   AMO_DOMAIN: ${AMO_DOMAIN}`);
console.log(`   GOOGLE_SHEET_ID: ${GOOGLE_SHEET_ID}`);
console.log(`   AMO_CLIENT_ID: ${AMO_CLIENT_ID ? '✅ установлен' : '❌ не установлен'}`);
console.log(`   AMO_CLIENT_SECRET: ${AMO_CLIENT_SECRET ? '✅ установлен' : '❌ не установлен'}`);
console.log(`   Структура данных: ${Object.keys(COLUMN_STRUCTURE).length} колонок`);

// Глобальная статистика
const statistics = {
  webhooksReceived: 0,
  dealsProcessed: 0,
  syncCompleted: 0,
  lastWebhook: null,
  lastSync: null,
  lastFullSync: null,
  startTime: new Date(),
  errors: 0
};

// Google Credentials
let creds;
if (process.env.GOOGLE_CREDENTIALS) {
  try {
    // Убираем лишние экранирования и парсим JSON
    const credentialsString = process.env.GOOGLE_CREDENTIALS.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    creds = JSON.parse(credentialsString);
  } catch (error) {
    console.error('Ошибка парсинга GOOGLE_CREDENTIALS:', error.message);
    console.log('Пробуем альтернативный способ парсинга...');
    // Альтернативный способ - убираем все экранирования
    const cleanString = process.env.GOOGLE_CREDENTIALS.replace(/\\/g, '');
    creds = JSON.parse(cleanString);
  }
} else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  try {
    creds = require('./google-credentials.json');
  } catch (e) {
    console.error('❌ Google credentials не найдены');
  }
}

// Глобальные экземпляры классов
let amoCRM;
let googleSheets;
let synchronizer;

// Инициализация всех компонентов
async function initializeServices() {
  try {
    console.log('🚀 Инициализация сервисов...');

    if (!creds) {
      throw new Error('Google credentials не настроены');
    }

    if (!AMO_CLIENT_ID || !AMO_CLIENT_SECRET) {
      throw new Error('AmoCRM credentials не настроены');
    }

    // Инициализация AmoCRM API
    amoCRM = new AmoCRMAPI(AMO_DOMAIN, AMO_CLIENT_ID, AMO_CLIENT_SECRET, AMO_REDIRECT_URI);
    amoCRM.setTokens(process.env.AMO_TOKEN, process.env.AMO_REFRESH_TOKEN);

    // Инициализация Google Sheets API
    googleSheets = new GoogleSheetsAPI(GOOGLE_SHEET_ID, creds);
    await googleSheets.initialize();

    // Инициализация синхронизатора
    synchronizer = new DataSynchronizer(amoCRM, googleSheets);
    await synchronizer.initialize();

    console.log('✅ Все сервисы успешно инициализированы');
    return true;

  } catch (error) {
    console.error('❌ Ошибка инициализации сервисов:', error.message);
    return false;
  }
}

// Создание Express приложения
const app = express();
app.use(bodyParser.json());

// API маршруты (должны быть до статических файлов)

// Обработка webhook от amoCRM
app.post('/webhook', async (req, res) => {
  console.log('📨 Получен webhook от amoCRM');
  
  // ВСЕГДА отвечаем 200 OK сразу, чтобы amoCRM не отключил webhook
  res.status(200).send('OK');
  
  try {
    statistics.webhooksReceived++;
    statistics.lastWebhook = new Date();

    const data = req.body;
    
    // Проверяем, что синхронизатор инициализирован
    if (!synchronizer) {
      console.error('❌ Синхронизатор не инициализирован, пропускаем webhook');
      statistics.errors++;
      return;
    }
    
    // Получаем выбранные поля
    let selectedFields = [];
    let customFieldsMeta = [];
    try {
      const config = JSON.parse(fs.readFileSync(fieldsConfigPath, 'utf-8'));
      selectedFields = config.selectedFields || [];
      // Для ускорения поиска field_id кастомных полей
      const meta = await amoCRM.getFieldsMetadata();
      customFieldsMeta = meta.custom;
    } catch {}

    // Логируем структуру webhook'а для отладки
    console.log('📝 Структура webhook:', JSON.stringify(data, null, 2));
    
    // Проверяем разные типы webhook'ов и собираем все сделки
    let dealsToProcess = [];
    
    // Новые сделки
    if (data.leads && data.leads.add) {
      console.log(`🆕 Новые сделки: ${data.leads.add.length}`);
      dealsToProcess = dealsToProcess.concat(data.leads.add);
    }
    
    // Обновленные сделки
    if (data.leads && data.leads.update) {
      console.log(`🔄 Обновленные сделки: ${data.leads.update.length}`);
      dealsToProcess = dealsToProcess.concat(data.leads.update);
    }
    
    // Изменения статуса сделок
    if (data.leads && data.leads.status) {
      console.log(`📊 Изменения статуса: ${data.leads.status.length}`);
      dealsToProcess = dealsToProcess.concat(data.leads.status);
    }
    
    // Обрабатываем все найденные сделки
    if (dealsToProcess.length > 0) {
      console.log(`🔄 Обрабатываем ${dealsToProcess.length} сделок...`);
      
      for (const lead of dealsToProcess) {
        const leadId = lead.id || lead.lead_id;
        console.log(`� Обрабатываем сделку ${leadId}...`);
        
        // Фильтруем поля сделки
        const filteredLead = selectedFields.length ? filterDealFields(lead, selectedFields, customFieldsMeta) : lead;
        
        try {
          await synchronizer.processDeal(leadId, filteredLead);
          console.log(`✅ Сделка ${leadId} успешно обработана`);
          statistics.dealsProcessed++;
        } catch (dealError) {
          console.error(`❌ Ошибка обработки сделки ${leadId}:`, dealError.message);
          statistics.errors++;
        }
      }
    } else {
      console.log('⚠️ Webhook не содержит сделок для обработки');
    }

    statistics.syncCompleted++;
    statistics.lastSync = new Date();
    console.log('✅ Webhook успешно обработан');

  } catch (error) {
    console.error('❌ Критическая ошибка обработки webhook:', error.message);
    statistics.errors++;
  }
});

// Эндпоинт для запуска полной синхронизации
app.post('/sync/full', async (req, res) => {
  console.log('🔄 Запуск полной синхронизации через API...');
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Полная синхронизация запущена в фоновом режиме'
  });
  
  try {
    if (!synchronizer) {
      console.error('❌ Синхронизатор не инициализирован');
      statistics.errors++;
      return;
    }

    console.log('🚀 Начинаем полную синхронизацию...');
    const result = await synchronizer.fullSync();
    statistics.lastFullSync = new Date();
    
    console.log('✅ Полная синхронизация завершена:', result);

  } catch (error) {
    console.error('❌ Ошибка полной синхронизации:', error.message);
    statistics.errors++;
  }
});

// Эндпоинт для обработки конкретной сделки
app.post('/sync/deal/:id', async (req, res) => {
  const dealId = req.params.id;
  console.log(`🔍 Синхронизация сделки ${dealId}...`);
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    dealId: dealId,
    message: 'Синхронизация сделки запущена'
  });
  
  try {
    if (!synchronizer) {
      console.error('❌ Синхронизатор не инициализирован');
      statistics.errors++;
      return;
    }

    const success = await synchronizer.processDeal(dealId);
    
    if (success) {
      statistics.dealsProcessed++;
      console.log(`✅ Сделка ${dealId} успешно синхронизирована`);
    } else {
      console.log(`❌ Ошибка синхронизации сделки ${dealId}`);
      statistics.errors++;
    }

  } catch (error) {
    console.error(`❌ Ошибка синхронизации сделки ${dealId}:`, error.message);
    statistics.errors++;
  }
});

// НОВЫЙ ЭНДПОИНТ: Диагностика полей AmoCRM
app.post('/diagnose/fields', async (req, res) => {
  console.log('🔍 Запуск диагностики полей AmoCRM...');
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Диагностика полей запущена, проверьте логи'
  });
  
  try {
    if (!synchronizer) {
      console.error('❌ Синхронизатор не инициализирован');
      statistics.errors++;
      return;
    }

    const result = await synchronizer.diagnoseFields();
    console.log('✅ Диагностика полей завершена:', result);

  } catch (error) {
    console.error('❌ Ошибка диагностики полей:', error.message);
    statistics.errors++;
  }
});

// НОВЫЙ ЭНДПОИНТ: Принудительная выгрузка с подробными логами
app.post('/sync/force', async (req, res) => {
  console.log('💪 Запуск ПРИНУДИТЕЛЬНОЙ полной синхронизации с детальными логами...');
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Принудительная синхронизация запущена с максимальными логами'
  });
  
  try {
    if (!synchronizer) {
      console.error('❌ Синхронизатор не инициализирован');
      statistics.errors++;
      return;
    }

    // Сначала диагностика
    await synchronizer.diagnoseFields();
    
    // Затем полная синхронизация
    const result = await synchronizer.fullSync();
    statistics.lastFullSync = new Date();
    
    console.log('💪 Принудительная синхронизация завершена:', result);

  } catch (error) {
    console.error('❌ Ошибка принудительной синхронизации:', error.message);
    statistics.errors++;
  }
});

// НОВЫЙ ЭНДПОИНТ: Очистка таблицы от сделок не ЕВГ СПБ
app.post('/clear-non-evg-deals', async (req, res) => {
  console.log('🧹 Запуск очистки таблицы от сделок не ЕВГ СПБ...');
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Очистка таблицы запущена'
  });
  
  try {
    if (!googleSheetsAPI) {
      console.error('❌ Google Sheets API не инициализирован');
      statistics.errors++;
      return;
    }

    console.log('📊 Получение данных из таблицы...');
    const response = await googleSheetsAPI.sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetsAPI.spreadsheetId,
      range: 'A:AZ'
    });
    
    const rows = response.data.values || [];
    console.log(`📋 Найдено строк: ${rows.length}`);
    
    if (rows.length <= 1) {
      console.log('✅ Таблица уже пуста или содержит только заголовки');
      return;
    }
    
    const headers = rows[0];
    const barColumnIndex = headers.findIndex(header => 
      header && header.toLowerCase().includes('бар')
    );
    
    console.log(`📍 Колонка "Бар (deal)" найдена на позиции: ${barColumnIndex + 1} (${String.fromCharCode(65 + barColumnIndex)})`);
    
    if (barColumnIndex === -1) {
      console.log('❌ Колонка "Бар (deal)" не найдена');
      return;
    }
    
    // Фильтруем строки - оставляем только заголовки и ЕВГ СПБ
    const filteredRows = [headers]; // Заголовки
    let removedCount = 0;
    let keptCount = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const barValue = row[barColumnIndex];
      
      if (barValue && barValue.includes('ЕВГ СПБ')) {
        filteredRows.push(row);
        keptCount++;
        console.log(`✅ Оставляем строку ${i + 1}: ${barValue}`);
      } else {
        removedCount++;
        console.log(`🗑️  Удаляем строку ${i + 1}: ${barValue || 'пустое значение'}`);
      }
    }
    
    console.log(`\n📊 Статистика:`);
    console.log(`   Удалено строк: ${removedCount}`);
    console.log(`   Оставлено строк: ${keptCount}`);
    console.log(`   Итого строк после очистки: ${filteredRows.length}`);
    
    // Очищаем всю таблицу
    console.log('\n🧹 Очистка таблицы...');
    await googleSheetsAPI.sheets.spreadsheets.values.clear({
      spreadsheetId: googleSheetsAPI.spreadsheetId,
      range: 'A:AZ'
    });
    
    // Записываем отфильтрованные данные
    if (filteredRows.length > 0) {
      console.log('📝 Записываем отфильтрованные данные...');
      await googleSheetsAPI.sheets.spreadsheets.values.update({
        spreadsheetId: googleSheetsAPI.spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: {
          values: filteredRows
        }
      });
    }
    
    console.log('✅ Очистка завершена успешно!');
    console.log(`📊 В таблице осталось только ${keptCount} записей с "ЕВГ СПБ"`);
    
  } catch (error) {
    console.error('❌ Ошибка при очистке таблицы:', error.message);
    statistics.errors++;
  }
});

// НОВЫЙ ЭНДПОИНТ: Диагностика поиска ЕВГ СПБ сделок
app.post('/diagnose/evg-deals', async (req, res) => {
  console.log('🔍 Запуск диагностики поиска ЕВГ СПБ сделок...');
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Диагностика поиска ЕВГ СПБ сделок запущена'
  });
  
  try {
    if (!amoCRM) {
      console.error('❌ AmoCRM API не инициализирован');
      return;
    }

    // Получаем кастомные поля
    console.log('📋 Получаем кастомные поля...');
    const fieldsResponse = await amoCRM.getCustomFields();
    
    let barFieldId = null;
    if (fieldsResponse._embedded && fieldsResponse._embedded.custom_fields) {
      const barField = fieldsResponse._embedded.custom_fields.find(field => 
        field.name && (
          field.name.includes('Бар') || 
          field.name.includes('бар') ||
          field.name.toLowerCase().includes('bar')
        )
      );
      
      if (barField) {
        barFieldId = barField.id;
        console.log(`🎯 Найдено поле: ID=${barField.id}, Name="${barField.name}"`);
        
        if (barField.enums) {
          console.log('📝 Возможные значения поля:');
          barField.enums.forEach(enumValue => {
            console.log(`   - ID=${enumValue.id}, Value="${enumValue.value}"`);
          });
        }
      } else {
        console.log('❌ Поле "Бар" не найдено');
        console.log('📋 Все доступные поля:');
        fieldsResponse._embedded.custom_fields.slice(0, 10).forEach(field => {
          console.log(`   - ID=${field.id}, Name="${field.name}"`);
        });
      }
    }
    
    // Проверяем первые несколько страниц сделок
    console.log('\n🔍 Проверяем сделки...');
    let totalChecked = 0;
    let evgFound = 0;
    const maxPages = 10;
    
    for (let page = 1; page <= maxPages; page++) {
      console.log(`📄 Страница ${page}...`);
      
      try {
        const dealsResponse = await amoCRM.getAllDeals(page, 250);
        
        if (!dealsResponse._embedded || !dealsResponse._embedded.leads) {
          console.log('📭 Больше сделок нет');
          break;
        }
        
        const deals = dealsResponse._embedded.leads;
        totalChecked += deals.length;
        
        let pageEvgCount = 0;
        
        for (const deal of deals) {
          if (deal.custom_fields_values) {
            // Ищем поле по ID и по названию
            let barField = null;
            if (barFieldId) {
              barField = deal.custom_fields_values.find(f => f.field_id === barFieldId);
            }
            
            if (!barField) {
              barField = deal.custom_fields_values.find(f => 
                f.field_name && (
                  f.field_name.includes('Бар') || 
                  f.field_name.includes('бар')
                )
              );
            }
            
            if (barField && barField.values && barField.values[0]) {
              const value = barField.values[0].value;
              
              if (value && value.includes('ЕВГ СПБ')) {
                evgFound++;
                pageEvgCount++;
                console.log(`   ✅ ЕВГ СПБ: ${deal.id} "${deal.name}" = "${value}"`);
              }
            }
          }
        }
        
        console.log(`   📊 На странице: всего=${deals.length}, ЕВГ СПБ=${pageEvgCount}`);
        
        if (deals.length < 250) break;
      } catch (error) {
        console.error(`❌ Ошибка на странице ${page}:`, error.message);
        break;
      }
    }
    
    console.log(`\n📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:`);
    console.log(`   Проверено страниц: ${Math.min(maxPages, 10)}`);
    console.log(`   Всего сделок: ${totalChecked}`);
    console.log(`   Найдено ЕВГ СПБ: ${evgFound}`);
    console.log(`   Ожидается: 1445 сделок`);
    
    if (evgFound < 100) {
      console.log(`\n⚠️ ПРОБЛЕМА: API возвращает мало ЕВГ СПБ сделок`);
      console.log(`   Рекомендации:`);
      console.log(`   1. Проверить правильность названия поля`);
      console.log(`   2. Проверить фильтры в API запросах`);
      console.log(`   3. Возможно есть ограничения в API`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
  }
});

// Эндпоинт статистики
app.get('/api/stats', (req, res) => {
  const uptime = Math.round((Date.now() - statistics.startTime.getTime()) / 1000);
  
  res.json({
    ...statistics,
    uptime: uptime,
    services: {
      amoCRM: !!amoCRM,
      googleSheets: !!googleSheets,
      synchronizer: !!synchronizer
    },
    columnStructure: {
      total: Object.keys(COLUMN_STRUCTURE).length,
      columns: COLUMN_STRUCTURE
    },
    // Дополнительная информация для отладки
    timestamps: {
      startTime: statistics.startTime,
      lastWebhook: statistics.lastWebhook,
      lastSync: statistics.lastSync,
      lastFullSync: statistics.lastFullSync
    },
    successRate: statistics.webhooksReceived > 0 ? 
      Math.round((statistics.dealsProcessed / statistics.webhooksReceived) * 100) : 0
  });
});

// API информация о системе
app.get('/api/info', (req, res) => {
  const uptime = Math.round((Date.now() - statistics.startTime.getTime()) / 1000);
  
  res.json({
    name: 'AmoCRM → Google Sheets Автоматическая выгрузка',
    version: '2.0.0',
    status: synchronizer ? 'running' : 'initializing',
    uptime: uptime,
    statistics: statistics,
    fieldConfigurator: {
      enabled: true,
      configPath: fieldsConfigPath,
      uiPath: '/src/field-configurator.html'
    },
    endpoints: {
      webhook: 'POST /webhook - Обработка webhook от amoCRM',
      syncFull: 'POST /sync/full - Полная синхронизация всех сделок',
      syncDeal: 'POST /sync/deal/:id - Синхронизация конкретной сделки',
      stats: 'GET /api/stats - Статистика работы',
      info: 'GET /api/info - Информация о системе'
    },
    structure: {
      columns: Object.keys(COLUMN_STRUCTURE).length,
      description: 'Автоматическая выгрузка сделок amoCRM в Google Sheets с полной структурой данных'
    }
  });
});

// Health check эндпоинт для проверки доступности сервера
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Простой ping эндпоинт
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'pong', 
    timestamp: new Date().toISOString() 
  });
});

// Путь к JSON-файлу с конфигурацией полей
// Определяем путь к конфигурации, учитывая Railway
const getConfigPath = () => {
  // В Railway конфигурация может храниться в подключенном томе по пути /app/config
  if (process.env.RAILWAY_SERVICE_ID && fs.existsSync('/app/config')) {
    return path.join('/app/config', 'fields.json');
  }
  // В локальном окружении используем локальную директорию
  return path.join(__dirname, 'config', 'fields.json');
};

const fieldsConfigPath = getConfigPath();

// Проверяем и создаём конфиг, если он не существует
if (!fs.existsSync(fieldsConfigPath)) {
  const configDir = path.dirname(fieldsConfigPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(fieldsConfigPath, JSON.stringify({ selectedFields: [] }, null, 2));
  console.log(`✅ Создан файл конфигурации полей: ${fieldsConfigPath}`);
}

// Функция фильтрации объекта по выбранным полям
function filterDealFields(deal, selectedFields, customFieldsMeta) {
  console.log(`🔍 DEBUG filterDealFields: selectedFields=`, selectedFields);
  
  // Если selectedFields пустой, возвращаем исходную сделку
  if (!selectedFields || selectedFields.length === 0) {
    console.log(`🔍 DEBUG: selectedFields пустой, возвращаем исходную сделку`);
    return deal;
  }
  
  const filtered = {
    // Копируем основные поля сделки
    id: deal.id,
    name: deal.name,
    price: deal.price,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    status_id: deal.status_id,
    pipeline_id: deal.pipeline_id,
    responsible_user_id: deal.responsible_user_id
  };
  
  // Обрабатываем selectedFields
  for (const field of selectedFields) {
    console.log(`🔍 DEBUG processing field:`, field);
    
    // Если это объект с полем id (новый формат)
    if (field && typeof field === 'object' && field.id) {
      const fieldId = field.id;
      if (deal.custom_fields_values) {
        const cf = deal.custom_fields_values.find(f => f.field_id === fieldId);
        if (cf) {
          if (!filtered.custom_fields_values) filtered.custom_fields_values = [];
          filtered.custom_fields_values.push(cf);
          console.log(`✅ DEBUG: Добавлено кастомное поле ${fieldId}`);
        }
      }
      continue;
    }
    
    // Старая логика для обратной совместимости
    // Стандартные поля
    if (typeof field === 'string') {
      if (deal[field] !== undefined) filtered[field] = deal[field];
    }
    // Кастомные поля (по field_id)
    if (typeof field === 'number' || /^[0-9]+$/.test(field)) {
      if (deal.custom_fields_values) {
        const cf = deal.custom_fields_values.find(f => String(f.field_id) === String(field));
        if (cf) {
          if (!filtered.custom_fields_values) filtered.custom_fields_values = [];
          filtered.custom_fields_values.push(cf);
        }
      }
    }
  }
  
  console.log(`🔍 DEBUG filtered result:`, JSON.stringify(filtered, null, 2));
  return filtered;
}

// Эндпоинт для проверки переменных окружения
app.get('/api/env-check', (req, res) => {
  const envInfo = {
    hasGoogleCredentials: !!process.env.GOOGLE_CREDENTIALS,
    hasGoogleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT,
    googleCredentialsLength: process.env.GOOGLE_CREDENTIALS ? process.env.GOOGLE_CREDENTIALS.length : 0,
    googleServiceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT ? process.env.GOOGLE_SERVICE_ACCOUNT.length : 0,
    hasAmoClientId: !!process.env.AMO_CLIENT_ID,
    hasAmoClientSecret: !!process.env.AMO_CLIENT_SECRET,
    hasAmoAccessToken: !!process.env.AMO_ACCESS_TOKEN,
    hasAmoRefreshToken: !!process.env.AMO_REFRESH_TOKEN,
    credsInitialized: !!creds,
    googleSheetsInitialized: !!googleSheets,
    synchronizerInitialized: !!synchronizer,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  };
  
  res.json(envInfo);
});

// Эндпоинт для получения конфигурации полей
app.get('/config/fields', async (req, res) => {
  try {
    // Читаем файл конфигурации
    const config = JSON.parse(fs.readFileSync(fieldsConfigPath, 'utf-8'));

    // Получаем метаданные полей из AmoCRM
    const metadata = await amoCRM.getFieldsMetadata();

    res.json({
      metadata,
      selectedFields: config.selectedFields
    });
  } catch (error) {
    console.error('Ошибка при получении конфигурации полей:', error.message);
    res.status(500).json({ error: 'Не удалось получить конфигурацию полей' });
  }
});

// Эндпоинт для сохранения конфигурации полей
app.post('/config/fields', (req, res) => {
  try {
    const { selectedFields } = req.body;

    // Сохраняем выбранные поля в JSON-файл
    fs.writeFileSync(fieldsConfigPath, JSON.stringify({ selectedFields }, null, 2));
    
    // Для Railway: сохраняем в переменной окружения, если это возможно
    if (process.env.RAILWAY_SERVICE_ID) {
      try {
        // Railway позволяет сохранять переменные окружения через Railway CLI
        // Но это требует наличия CLI и авторизации
        // В качестве альтернативы, можно использовать Railway API если есть токен
        console.log('✅ Конфигурация полей сохранена для Railway. Сохраните fieldsConfigPath как постоянный том.');
      } catch (railwayError) {
        console.warn('⚠️ Не удалось сохранить конфигурацию для Railway:', railwayError.message);
      }
    }

    res.status(200).json({ message: 'Конфигурация полей успешно сохранена' });
  } catch (error) {
    console.error('Ошибка при сохранении конфигурации полей:', error.message);
    res.status(500).json({ error: 'Не удалось сохранить конфигурацию полей' });
  }
});

// Маршрут для конфигуратора полей
app.get('/field-configurator', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'field-configurator.html'));
});

// Подключаем статические файлы ПОСЛЕ API маршрутов
app.use(express.static('public'));

// Настройка cron задачи для ежедневной полной синхронизации в 04:00
cron.schedule('0 4 * * *', async () => {
  console.log('⏰ Запуск ежедневной полной синхронизации в 04:00...');
  
  try {
    if (synchronizer) {
      const result = await synchronizer.fullSync();
      statistics.lastFullSync = new Date();
      console.log(`✅ Ежедневная синхронизация завершена: обработано ${result.processed} сделок`);
    } else {
      console.log('❌ Синхронизатор не инициализирован для ежедневной синхронизации');
    }
  } catch (error) {
    console.error('❌ Ошибка ежедневной синхронизации:', error.message);
    statistics.errors++;
  }
}, {
  timezone: "Europe/Moscow"
});

// Запуск сервера
async function startServer() {
  const port = process.env.PORT || 3000;
  
  console.log('🔧 Настройка сервера...');
  
  // Инициализируем сервисы
  const initialized = await initializeServices();
  
  if (!initialized) {
    console.error('❌ Не удалось инициализировать сервисы. Сервер запускается в ограниченном режиме.');
  }
  
  app.listen(port, () => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
    console.log(`📊 Структура данных: ${Object.keys(COLUMN_STRUCTURE).length} колонок`);
    console.log(`⏰ Ежедневная синхронизация настроена на 04:00 МСК`);
    console.log(`🌐 Доступные API эндпоинты:`);
    console.log(`   GET  /api/info - Информация о сервисе`);
    console.log(`   GET  /api/stats - Статистика работы`);
    console.log(`   POST /webhook - Webhook от amoCRM`);
    console.log(`   POST /sync/full - Полная синхронизация`);
    console.log(`   POST /sync/deal/:id - Синхронизация сделки`);
    console.log(`   GET  /config/fields - Получить конфигурацию полей`); 
    console.log(`   POST /config/fields - Сохранить конфигурацию полей`);
    console.log(`🌐 Веб-интерфейс доступен по адресу: http://localhost:${port}`);
    console.log(`🌐 Конфигуратор полей: http://localhost:${port}/src/field-configurator.html`);
    
    if (initialized) {
      console.log('✅ Система готова к автоматической выгрузке данных amoCRM в Google Sheets');
    }
  });
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанная ошибка Promise:', reason);
  statistics.errors++;
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  statistics.errors++;
});

// Запускаем сервер
startServer();
