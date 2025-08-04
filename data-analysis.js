console.log('📋 АНАЛИЗ ДАННЫХ AmoCRM');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

async function analyzeData() {
    try {
        console.log('📡 Анализируем данные AmoCRM...\n');
        
        // Получаем статистику сделок
        const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
            headers: {
                'Authorization': `Bearer ${AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'with': 'custom_fields_values',
                'limit': 250,
                'page': 1
            }
        });
        
        const deals = response.data._embedded?.leads || [];
        console.log(`📊 Всего сделок на первой странице: ${deals.length}`);
        
        // Анализируем поля "Бар (deal)"
        const barValues = new Map();
        let dealsWithBar = 0;
        let dealsWithoutBar = 0;
        
        for (const deal of deals) {
            let hasBar = false;
            
            if (deal.custom_fields_values) {
                const barField = deal.custom_fields_values.find(f => 
                    f.field_name === 'Бар (deal)'
                );
                
                if (barField && barField.values && barField.values[0]) {
                    const barValue = barField.values[0].value;
                    if (barValue) {
                        hasBar = true;
                        dealsWithBar++;
                        
                        const count = barValues.get(barValue) || 0;
                        barValues.set(barValue, count + 1);
                    }
                }
            }
            
            if (!hasBar) {
                dealsWithoutBar++;
            }
        }
        
        console.log(`📊 Сделок с полем "Бар (deal)": ${dealsWithBar}`);
        console.log(`📊 Сделок без поля "Бар (deal)": ${dealsWithoutBar}`);
        
        console.log('\n🏪 Значения поля "Бар (deal)" (из первых 250 сделок):');
        Array.from(barValues.entries())
            .sort((a, b) => b[1] - a[1]) // Сортируем по количеству
            .forEach(([value, count]) => {
                console.log(`   ${value} (${count} сделок)`);
            });
        
        // Проверяем наличие "ЕВГ СПБ"
        const evgSpbFound = Array.from(barValues.keys()).find(value => 
            value.includes('ЕВГ') && value.includes('СПБ')
        );
        
        console.log('\n🎯 РЕЗУЛЬТАТ ПОИСКА "ЕВГ СПБ":');
        if (evgSpbFound) {
            console.log(`✅ Найдено: "${evgSpbFound}" (${barValues.get(evgSpbFound)} сделок)`);
        } else {
            console.log('❌ Значение "ЕВГ СПБ" не найдено в поле "Бар (deal)"');
            
            // Ищем похожие значения
            const evgValues = Array.from(barValues.keys()).filter(value => 
                value.includes('ЕВГ') || value.includes('СПБ')
            );
            
            if (evgValues.length > 0) {
                console.log('\n🔍 Похожие значения:');
                evgValues.forEach(value => {
                    console.log(`   "${value}" (${barValues.get(value)} сделок)`);
                });
            } else {
                // Показываем все СПБ значения
                const spbValues = Array.from(barValues.keys()).filter(value => 
                    value.includes('СПБ')
                );
                if (spbValues.length > 0) {
                    console.log('\n🔍 Значения с "СПБ":');
                    spbValues.forEach(value => {
                        console.log(`   "${value}" (${barValues.get(value)} сделок)`);
                    });
                }
            }
        }
        
        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        console.log('1. Проверьте, существует ли бар "ЕВГ СПБ" в AmoCRM');
        console.log('2. Возможно, используется другое название бара');
        console.log('3. Или нужно создать тестовые сделки с этим значением');
        
        // Показываем топ-3 бара для референса
        const topBars = Array.from(barValues.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
            
        console.log('\n📈 ТОП-3 популярных бара:');
        topBars.forEach(([value, count], index) => {
            console.log(`   ${index + 1}. "${value}" - ${count} сделок`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка анализа данных:', error.message);
    }
}

analyzeData();
