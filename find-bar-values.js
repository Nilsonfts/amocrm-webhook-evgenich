console.log('🔍 Поиск всех значений поля "Бар (deal)"');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

async function findBarValues() {
    try {
        console.log('📡 Получаем сделки...');
        
        const barValues = new Set();
        let page = 1;
        let totalProcessed = 0;
        
        while (page <= 10) { // Ограничиваем 10 страницами
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
                if (deal.custom_fields_values) {
                    const barField = deal.custom_fields_values.find(f => 
                        f.field_name === 'Бар (deal)'
                    );
                    
                    if (barField && barField.values && barField.values[0]) {
                        const barValue = barField.values[0].value;
                        if (barValue) {
                            barValues.add(barValue);
                        }
                    }
                }
            }
            
            page++;
        }
        
        console.log(`\n📊 Обработано сделок: ${totalProcessed}`);
        console.log(`📊 Найдено уникальных значений "Бар (deal)": ${barValues.size}`);
        
        console.log('\n🏪 Все значения поля "Бар (deal)":');
        Array.from(barValues).sort().forEach(value => {
            console.log(`   • ${value}`);
            if (value.includes('ЕВГ') || value.includes('евг')) {
                console.log(`     ⭐ СОДЕРЖИТ ЕВГ!`);
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

findBarValues();
