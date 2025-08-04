console.log('🚀 Запуск простого экспорта AmoCRM');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

console.log(`🌐 Подключение к: ${AMO_DOMAIN}`);
console.log(`🔑 Токен: ${AMO_TOKEN ? 'установлен' : 'отсутствует'}`);

async function testExport() {
    try {
        console.log('📡 Тестируем подключение к AmoCRM...');
        
        const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
            headers: {
                'Authorization': `Bearer ${AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'with': 'custom_fields_values',
                'limit': 5
            }
        });

        console.log(`✅ Подключение успешно! Получено ${response.data._embedded.leads.length} сделок`);
        
        // Проверим первую сделку
        const deals = response.data._embedded.leads;
        for (const deal of deals) {
            console.log(`📦 Сделка ${deal.id}: "${deal.name}"`);
            
            if (deal.custom_fields_values) {
                const barField = deal.custom_fields_values.find(f => 
                    f.field_name && f.field_name.includes('Бар')
                );
                
                if (barField && barField.values && barField.values[0]) {
                    const value = barField.values[0].value;
                    console.log(`   🏪 Бар: ${value}`);
                    
                    if (value && value.includes('ЕВГ СПБ')) {
                        console.log(`   ✅ НАЙДЕНА ЕВГ СПБ СДЕЛКА!`);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.status, error.response?.data || error.message);
    }
}

testExport();
