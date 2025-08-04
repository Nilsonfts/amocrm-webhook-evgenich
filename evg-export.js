console.log('🚀 Экспорт данных ЕВГ СПБ с 1 января 2024');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

// Дата с 1 января 2024 (timestamp)
const START_DATE = new Date('2024-01-01T00:00:00Z').getTime() / 1000;

async function exportData() {
    try {
        console.log(`📅 Фильтр по дате: с ${new Date(START_DATE * 1000).toLocaleDateString('ru-RU')}`);
        
        let page = 1;
        let totalFound = 0;
        let evgSpbCount = 0;
        
        while (true) {
            console.log(`📄 Страница ${page}...`);
            
            const url = `https://${AMO_DOMAIN}/api/v4/leads`;
            const params = {
                'with': 'custom_fields_values,contacts',
                'limit': 250,
                'page': page,
                'filter[created_at][from]': START_DATE
            };
            
            console.log(`   🔗 URL: ${url}`);
            console.log(`   📋 Параметры:`, params);
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${AMO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: params,
                timeout: 15000
            });
            
            console.log(`   ✅ Ответ получен, статус: ${response.status}`);
            
            const deals = response.data._embedded?.leads || [];
            if (deals.length === 0) {
                console.log('📭 Больше сделок нет');
                break;
            }
            
            totalFound += deals.length;
            console.log(`   Получено ${deals.length} сделок (всего: ${totalFound})`);
            
            // Фильтруем по ЕВГ СПБ
            for (const deal of deals) {
                if (deal.custom_fields_values) {
                    const barField = deal.custom_fields_values.find(f => 
                        f.field_name === 'Бар (deal)'
                    );
                    
                    if (barField && barField.values && barField.values[0]) {
                        const barValue = barField.values[0].value;
                        
                        if (barValue && barValue.includes('ЕВГ СПБ')) {
                            evgSpbCount++;
                            console.log(`   ✅ ЕВГ СПБ: ${deal.name} (ID: ${deal.id})`);
                            console.log(`      Бар: ${barValue}`);
                            
                            // Показываем все поля для первой найденной сделки
                            if (evgSpbCount === 1) {
                                console.log('   📋 Поля сделки:');
                                deal.custom_fields_values.forEach(field => {
                                    if (field.values && field.values[0]) {
                                        console.log(`      ${field.field_name}: ${field.values[0].value}`);
                                    }
                                });
                            }
                        }
                    }
                }
            }
            
            page++;
            
            // Ограничение для тестирования
            if (page > 5) {
                console.log('⚠️  Ограничение: обработано только 5 страниц для тестирования');
                break;
            }
        }
        
        console.log('\n📊 РЕЗУЛЬТАТ:');
        console.log(`Всего сделок с ${new Date(START_DATE * 1000).toLocaleDateString('ru-RU')}: ${totalFound}`);
        console.log(`Сделок ЕВГ СПБ: ${evgSpbCount}`);
        
    } catch (error) {
        console.error('❌ Ошибка экспорта:', error.message);
        if (error.response) {
            console.error(`Статус: ${error.response.status}`);
            console.error('Данные:', error.response.data);
        }
    }
}

exportData();
