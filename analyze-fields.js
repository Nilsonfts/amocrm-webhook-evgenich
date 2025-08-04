console.log('🔍 Анализ полей сделок');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

async function analyzeFields() {
    try {
        console.log('📡 Получаем первые 10 сделок...');
        
        const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
            headers: {
                'Authorization': `Bearer ${AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'with': 'custom_fields_values',
                'limit': 10
            }
        });
        
        const deals = response.data._embedded?.leads || [];
        console.log(`✅ Получено ${deals.length} сделок`);
        
        // Анализируем поля
        const allFields = new Set();
        
        for (let i = 0; i < Math.min(3, deals.length); i++) {
            const deal = deals[i];
            console.log(`\n📦 Сделка ${i + 1}: "${deal.name}" (ID: ${deal.id})`);
            
            if (deal.custom_fields_values) {
                console.log('   📋 Пользовательские поля:');
                deal.custom_fields_values.forEach(field => {
                    allFields.add(field.field_name);
                    if (field.values && field.values[0]) {
                        const value = field.values[0].value;
                        console.log(`      ${field.field_name}: ${value}`);
                        
                        // Ищем поля с "бар" или "евг"
                        if (field.field_name.toLowerCase().includes('бар') || 
                            field.field_name.toLowerCase().includes('евг') ||
                            (typeof value === 'string' && value.toLowerCase().includes('евг'))) {
                            console.log(`      ⭐ НАЙДЕНО РЕЛЕВАНТНОЕ ПОЛЕ!`);
                        }
                    }
                });
            } else {
                console.log('   ❌ Нет пользовательских полей');
            }
        }
        
        console.log('\n📊 Все найденные поля:');
        Array.from(allFields).sort().forEach(field => {
            console.log(`   • ${field}`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

analyzeFields();
