console.log('🚀 Экспорт данных ВСЕХ СПБ баров с 1 января 2024');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

// Дата с 1 января 2024 (timestamp)
const START_DATE = new Date('2024-01-01T00:00:00Z').getTime() / 1000;

async function exportSpbDeals() {
    try {
        console.log(`📅 Фильтр по дате: с ${new Date(START_DATE * 1000).toLocaleDateString('ru-RU')}`);
        console.log('🏪 Фильтр по барам: РВБ СПБ Г28, РВБ СПБ ПАП');
        
        let page = 1;
        let totalFound = 0;
        let spbCount = 0;
        let spbDeals = [];
        
        while (page <= 10) { // Ограничиваем 10 страницами
            console.log(`📄 Страница ${page}...`);
            
            const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
                headers: {
                    'Authorization': `Bearer ${AMO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    'with': 'custom_fields_values,contacts',
                    'limit': 250,
                    'page': page,
                    'filter[created_at][from]': START_DATE
                },
                timeout: 15000
            });
            
            const deals = response.data._embedded?.leads || [];
            if (deals.length === 0) {
                console.log('📭 Больше сделок нет');
                break;
            }
            
            totalFound += deals.length;
            console.log(`   Получено ${deals.length} сделок (всего: ${totalFound})`);
            
            // Фильтруем по СПБ барам
            for (const deal of deals) {
                if (deal.custom_fields_values) {
                    const barField = deal.custom_fields_values.find(f => 
                        f.field_name === 'Бар (deal)'
                    );
                    
                    if (barField && barField.values && barField.values[0]) {
                        const barValue = barField.values[0].value;
                        
                        if (barValue && (barValue.includes('РВБ СПБ Г28') || barValue.includes('РВБ СПБ ПАП'))) {
                            spbCount++;
                            
                            // Собираем данные сделки
                            const dealData = {
                                id: deal.id,
                                name: deal.name,
                                bar: barValue,
                                budget: deal.price || 0,
                                created_date: new Date(deal.created_at * 1000).toLocaleString('ru-RU'),
                                responsible: deal.responsible_user_id,
                                pipeline: deal.pipeline_id,
                                stage: deal.status_id
                            };
                            
                            // Добавляем дополнительные поля
                            if (deal.custom_fields_values) {
                                deal.custom_fields_values.forEach(field => {
                                    if (field.values && field.values[0]) {
                                        switch(field.field_name) {
                                            case 'Дата брони':
                                                dealData.booking_date = field.values[0].value;
                                                break;
                                            case 'Кол-во гостей':
                                                dealData.guests = field.values[0].value;
                                                break;
                                            case 'Время прихода':
                                                dealData.arrival_time = field.values[0].value;
                                                break;
                                            case 'Комментарий МОБ':
                                                dealData.comment = field.values[0].value;
                                                break;
                                        }
                                    }
                                });
                            }
                            
                            spbDeals.push(dealData);
                            console.log(`   ✅ СПБ: ${deal.name} | ${barValue} | ${dealData.budget} ₽`);
                        }
                    }
                }
            }
            
            page++;
        }
        
        console.log('\n📊 РЕЗУЛЬТАТ ЭКСПОРТА:');
        console.log(`Всего сделок с ${new Date(START_DATE * 1000).toLocaleDateString('ru-RU')}: ${totalFound}`);
        console.log(`Сделок СПБ баров: ${spbCount}`);
        
        if (spbDeals.length > 0) {
            console.log('\n📋 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ПО СПБ СДЕЛКАМ:');
            spbDeals.forEach((deal, index) => {
                console.log(`\n${index + 1}. ID: ${deal.id} | ${deal.name}`);
                console.log(`   🏪 Бар: ${deal.bar}`);
                console.log(`   💰 Бюджет: ${deal.budget} ₽`);
                console.log(`   📅 Создано: ${deal.created_date}`);
                if (deal.booking_date) console.log(`   📆 Дата брони: ${deal.booking_date}`);
                if (deal.guests) console.log(`   👥 Гостей: ${deal.guests}`);
                if (deal.arrival_time) console.log(`   ⏰ Время: ${deal.arrival_time}`);
                if (deal.comment) console.log(`   💬 Комментарий: ${deal.comment.substring(0, 100)}${deal.comment.length > 100 ? '...' : ''}`);
            });
            
            // Статистика по барам
            const barStats = {};
            spbDeals.forEach(deal => {
                barStats[deal.bar] = (barStats[deal.bar] || 0) + 1;
            });
            
            console.log('\n📈 СТАТИСТИКА ПО БАРАМ:');
            Object.entries(barStats).forEach(([bar, count]) => {
                console.log(`   ${bar}: ${count} сделок`);
            });
            
            // Общий бюджет
            const totalBudget = spbDeals.reduce((sum, deal) => sum + deal.budget, 0);
            console.log(`\n💰 ОБЩИЙ БЮДЖЕТ СПБ: ${totalBudget.toLocaleString('ru-RU')} ₽`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка экспорта:', error.message);
        if (error.response) {
            console.error(`Статус: ${error.response.status}`);
            console.error('Данные:', error.response.data);
        }
    }
}

exportSpbDeals();
