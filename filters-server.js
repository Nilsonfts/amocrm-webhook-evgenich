const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Переменные окружения
const AMO_DOMAIN = process.env.AMO_DOMAIN || 'nebar.amocrm.ru';
const AMO_TOKEN = process.env.AMO_TOKEN;

console.log('🎯 Сервер фильтров AmoCRM запущен');
console.log(`   AMO_DOMAIN: ${AMO_DOMAIN}`);
console.log(`   AMO_TOKEN: ${AMO_TOKEN ? '✅ установлен' : '❌ не установлен'}`);

// API для получения всех доступных полей и значений для фильтрации
app.get('/api/filter-options', async (req, res) => {
  try {
    console.log('🔍 Запрос опций фильтрации...');
    
    const axios = require('axios');
    
    if (!AMO_TOKEN) {
      throw new Error('AMO_TOKEN не установлен');
    }
    
    // Получаем воронки и этапы
    const pipelinesResponse = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads/pipelines`, {
      headers: { 'Authorization': `Bearer ${AMO_TOKEN}` }
    });
    
    const pipelines = pipelinesResponse.data._embedded?.pipelines || [];
    
    // Получаем примеры сделок для анализа полей
    const dealsResponse = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
      headers: { 'Authorization': `Bearer ${AMO_TOKEN}` },
      params: { 'with': 'custom_fields_values', 'limit': 100 }
    });
    
    const deals = dealsResponse.data._embedded?.leads || [];
    
    // Собираем все пользовательские поля и их значения
    const fieldsMap = new Map();
    
    for (const deal of deals) {
      if (deal.custom_fields_values) {
        deal.custom_fields_values.forEach(field => {
          if (!fieldsMap.has(field.field_name)) {
            fieldsMap.set(field.field_name, {
              field_id: field.field_id,
              field_name: field.field_name,
              values: new Set()
            });
          }
          
          if (field.values && field.values[0]) {
            const fieldData = fieldsMap.get(field.field_name);
            fieldData.values.add(field.values[0].value);
          }
        });
      }
    }
    
    // Преобразуем в удобный для фронта формат
    const customFields = {};
    fieldsMap.forEach((fieldData, fieldName) => {
      customFields[fieldName] = {
        field_id: fieldData.field_id,
        values: Array.from(fieldData.values)
      };
    });
    
    console.log('✅ Опции фильтрации собраны успешно');
    
    res.json({
      success: true,
      data: {
        pipelines: pipelines.map(pipeline => ({
          id: pipeline.id,
          name: pipeline.name,
          statuses: pipeline._embedded?.statuses?.map(status => ({
            id: status.id,
            name: status.name
          })) || []
        })),
        customFields,
        totalDeals: deals.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения опций фильтрации:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// НОВЫЙ ЭНДПОИНТ: Динамический экспорт с пользовательскими фильтрами
app.post('/export/custom', async (req, res) => {
  console.log('🎯 Запуск динамического экспорта с пользовательскими фильтрами...');
  
  const { filters } = req.body;
  console.log('📋 Полученные фильтры:', JSON.stringify(filters, null, 2));
  
  // Быстро отвечаем клиенту
  res.status(200).json({
    status: 'started',
    message: 'Динамический экспорт запущен с пользовательскими фильтрами',
    filters: filters
  });
  
  try {
    const axios = require('axios');
    
    if (!AMO_TOKEN) {
      console.error('❌ AMO_TOKEN не установлен');
      return;
    }

    console.log('🔍 ПРИМЕНЯЕМЫЕ ФИЛЬТРЫ:');
    if (filters.customFields) {
      Object.entries(filters.customFields).forEach(([fieldName, values]) => {
        if (values && values.length > 0) {
          console.log(`   📍 ${fieldName}: ${values.join(', ')}`);
        }
      });
    }
    if (filters.pipelines && filters.pipelines.length > 0) {
      console.log(`   🔀 Воронки: ${filters.pipelines.join(', ')}`);
    }
    if (filters.statuses && filters.statuses.length > 0) {
      console.log(`   📊 Этапы: ${filters.statuses.join(', ')}`);
    }
    
    let totalProcessed = 0;
    let matchedDeals = 0;
    let page = 1;
    
    while (page <= 20) { // Ограничиваем 20 страницами для демонстрации
      console.log(`📄 Обрабатываю страницу ${page}...`);
      
      const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
        headers: { 'Authorization': `Bearer ${AMO_TOKEN}` },
        params: {
          'with': 'custom_fields_values,contacts',
          'limit': 250,
          'page': page
        }
      });
      
      const deals = response.data._embedded?.leads || [];
      if (deals.length === 0) {
        console.log('📭 Больше сделок нет');
        break;
      }
      
      totalProcessed += deals.length;
      let pageMatched = 0;
      
      for (const deal of deals) {
        let dealMatches = true;
        
        // Проверяем фильтры по пользовательским полям
        if (filters.customFields && deal.custom_fields_values) {
          for (const [fieldName, expectedValues] of Object.entries(filters.customFields)) {
            if (!expectedValues || expectedValues.length === 0) continue;
            
            const field = deal.custom_fields_values.find(f => f.field_name === fieldName);
            if (!field || !field.values || !field.values[0]) {
              dealMatches = false;
              break;
            }
            
            const dealValue = field.values[0].value;
            if (!expectedValues.includes(dealValue)) {
              dealMatches = false;
              break;
            }
          }
        }
        
        // Проверяем фильтры по воронкам
        if (dealMatches && filters.pipelines && filters.pipelines.length > 0) {
          if (!filters.pipelines.includes(deal.pipeline_id.toString())) {
            dealMatches = false;
          }
        }
        
        // Проверяем фильтры по этапам
        if (dealMatches && filters.statuses && filters.statuses.length > 0) {
          if (!filters.statuses.includes(deal.status_id.toString())) {
            dealMatches = false;
          }
        }
        
        if (dealMatches) {
          pageMatched++;
          matchedDeals++;
          
          // Выводим информацию о найденной сделке
          console.log(`   ✅ НАЙДЕНА: ${deal.name} (ID: ${deal.id})`);
          console.log(`      💰 Бюджет: ${deal.price || 0} ₽`);
          console.log(`      📅 Создано: ${new Date(deal.created_at * 1000).toLocaleDateString('ru-RU')}`);
          
          // Показываем значения полей
          if (deal.custom_fields_values) {
            deal.custom_fields_values.forEach(field => {
              if (filters.customFields && filters.customFields[field.field_name]) {
                console.log(`      📍 ${field.field_name}: ${field.values?.[0]?.value || 'N/A'}`);
              }
            });
          }
          console.log('');
        }
      }
      
      console.log(`   📊 На странице: всего=${deals.length}, подходящих=${pageMatched}, итого найдено=${matchedDeals}`);
      page++;
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ ДИНАМИЧЕСКОГО ЭКСПОРТА:');
    console.log(`   📊 Всего сделок проверено: ${totalProcessed}`);
    console.log(`   ✅ Найдено подходящих: ${matchedDeals}`);
    console.log(`   📈 Процент совпадений: ${Math.round((matchedDeals/totalProcessed)*100)}%`);
    
  } catch (error) {
    console.error('❌ Ошибка динамического экспорта:', error.message);
  }
});

// Базовые маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/filters', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'filters.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Откройте http://localhost:${PORT} для основного интерфейса`);
  console.log(`🎯 Откройте http://localhost:${PORT}/filters для настройки фильтров`);
});

module.exports = app;
