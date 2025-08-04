console.log('🔍 Поиск "ЕВГ" во всех полях');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

async function findEvg() {
    try {
        console.log('📡 Получаем сделки...');
        
        let page = 1;
        let totalProcessed = 0;
        let foundEvg = [];
        
        while (page <= 20) { // Ограничиваем 20 страницами
            console.log(`📄 Страница ${page}...`);
            
            const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
                headers: {
                    'Authorization': `Bearer ${AMO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    'with': 'custom_fields_values',
                    'limit': 250,
                    'page': page
                }
            });
            
            const deals = response.data._embedded?.leads || [];
            if (deals.length === 0) break;
            
            totalProcessed += deals.length;
            
            for (const deal of deals) {
                let hasEvg = false;
                
                // Проверяем название сделки
                if (deal.name && deal.name.toLowerCase().includes('евг')) {
                    hasEvg = true;
                }
                
                // Проверяем все поля
                if (deal.custom_fields_values) {
                    for (const field of deal.custom_fields_values) {
                        if (field.values && field.values[0]) {
                            const value = field.values[0].value;
                            if (typeof value === 'string' && value.toLowerCase().includes('евг')) {
                                hasEvg = true;
                                foundEvg.push({
                                    dealId: deal.id,
                                    dealName: deal.name,
                                    fieldName: field.field_name,
                                    fieldValue: value
                                });
                            }
                        }
                    }
                }
                
                if (hasEvg && foundEvg.length < 10) { // Показываем только первые 10
                    console.log(`   ⭐ НАЙДЕНО ЕВГ в сделке: ${deal.name} (ID: ${deal.id})`);
                }
            }
            
            page++;
            
            if (foundEvg.length >= 10) {
                console.log('   ⚠️  Найдено достаточно примеров, останавливаемся');
                break;
            }
        }
        
        console.log(`\n📊 Обработано сделок: ${totalProcessed}`);
        console.log(`📊 Найдено сделок с "ЕВГ": ${foundEvg.length}`);
        
        if (foundEvg.length > 0) {
            console.log('\n🎯 Найденные поля с "ЕВГ":');
            foundEvg.forEach((item, index) => {
                console.log(`   ${index + 1}. Сделка: ${item.dealName} (ID: ${item.dealId})`);
                console.log(`      Поле: ${item.fieldName}`);
                console.log(`      Значение: ${item.fieldValue}`);
                console.log('');
            });
        } else {
            console.log('\n❌ Сделки с "ЕВГ" не найдены');
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

findEvg();
