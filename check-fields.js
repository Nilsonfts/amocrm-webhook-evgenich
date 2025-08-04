console.log('🔍 ПОЛНЫЙ АНАЛИЗ ПОЛЕЙ AmoCRM');

require('dotenv').config();
const axios = require('axios');

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

async function analyzeAmoFields() {
    try {
        console.log('📡 Подключаюсь к AmoCRM...');
        console.log(`🌐 Домен: ${AMO_DOMAIN}`);
        console.log(`🔑 Токен: ${AMO_TOKEN ? 'установлен' : 'отсутствует'}`);
        
        // Получаем сделки с полными данными
        console.log('\n📦 Получаю сделки с полными данными...');
        const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads`, {
            headers: {
                'Authorization': `Bearer ${AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'with': 'custom_fields_values,contacts,companies',
                'limit': 10 // Берем только 10 сделок для анализа
            }
        });
        
        const deals = response.data._embedded?.leads || [];
        console.log(`✅ Получено ${deals.length} сделок для анализа`);
        
        if (deals.length === 0) {
            console.log('❌ Сделки не найдены');
            return;
        }
        
        // Анализируем структуру сделок
        console.log('\n📋 СТРУКТУРА СДЕЛКИ (основные поля):');
        const firstDeal = deals[0];
        console.log(`Пример сделки: "${firstDeal.name}" (ID: ${firstDeal.id})`);
        
        // Основные поля сделки
        const basicFields = {
            'ID': firstDeal.id,
            'Название': firstDeal.name,
            'Бюджет': firstDeal.price || 0,
            'Дата создания': new Date(firstDeal.created_at * 1000).toLocaleString('ru-RU'),
            'Дата обновления': new Date(firstDeal.updated_at * 1000).toLocaleString('ru-RU'),
            'Ответственный ID': firstDeal.responsible_user_id,
            'Воронка ID': firstDeal.pipeline_id,
            'Этап ID': firstDeal.status_id,
        };
        
        console.log('\n🏗️ ОСНОВНЫЕ ПОЛЯ:');
        Object.entries(basicFields).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        // Собираем все пользовательские поля из всех сделок
        console.log('\n🎨 ПОЛЬЗОВАТЕЛЬСКИЕ ПОЛЯ:');
        const allCustomFields = new Map();
        
        for (const deal of deals) {
            if (deal.custom_fields_values) {
                deal.custom_fields_values.forEach(field => {
                    if (!allCustomFields.has(field.field_name)) {
                        allCustomFields.set(field.field_name, {
                            field_id: field.field_id,
                            field_name: field.field_name,
                            field_code: field.field_code,
                            values: []
                        });
                    }
                    
                    // Добавляем примеры значений
                    if (field.values && field.values[0]) {
                        const existingField = allCustomFields.get(field.field_name);
                        const value = field.values[0].value;
                        if (existingField.values.length < 3 && !existingField.values.includes(value)) {
                            existingField.values.push(value);
                        }
                    }
                });
            }
        }
        
        // Выводим все найденные пользовательские поля
        const sortedFields = Array.from(allCustomFields.values()).sort((a, b) => 
            a.field_name.localeCompare(b.field_name)
        );
        
        console.log(`Найдено ${sortedFields.length} пользовательских полей:\n`);
        
        sortedFields.forEach((field, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. "${field.field_name}"`);
            console.log(`    ID: ${field.field_id}`);
            if (field.field_code) {
                console.log(`    Код: ${field.field_code}`);
            }
            if (field.values.length > 0) {
                console.log(`    Примеры значений: ${field.values.join(', ')}`);
            }
            console.log('');
        });
        
        // Анализируем контакты
        console.log('👥 КОНТАКТЫ:');
        let hasContacts = false;
        for (const deal of deals) {
            if (deal._embedded && deal._embedded.contacts) {
                hasContacts = true;
                const contact = deal._embedded.contacts[0];
                console.log(`   Пример контакта: "${contact.name}" (ID: ${contact.id})`);
                if (contact.custom_fields_values) {
                    console.log('   Поля контакта:');
                    contact.custom_fields_values.slice(0, 3).forEach(field => {
                        if (field.values && field.values[0]) {
                            console.log(`     ${field.field_name}: ${field.values[0].value}`);
                        }
                    });
                }
                break;
            }
        }
        if (!hasContacts) {
            console.log('   Контакты не найдены в сделках');
        }
        
        // Получаем информацию о воронках
        console.log('\n🔀 ВОРОНКИ И ЭТАПЫ:');
        try {
            const pipelinesResponse = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads/pipelines`, {
                headers: { 'Authorization': `Bearer ${AMO_TOKEN}` }
            });
            
            const pipelines = pipelinesResponse.data._embedded?.pipelines || [];
            console.log(`Найдено ${pipelines.length} воронок:`);
            
            pipelines.forEach((pipeline, index) => {
                console.log(`\n${index + 1}. Воронка: "${pipeline.name}" (ID: ${pipeline.id})`);
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    console.log('   Этапы:');
                    pipeline._embedded.statuses.forEach(status => {
                        console.log(`     • ${status.name} (ID: ${status.id})`);
                    });
                }
            });
        } catch (error) {
            console.log('   ❌ Не удалось получить информацию о воронках');
        }
        
        // Итоговая сводка
        console.log('\n📊 ИТОГОВАЯ СВОДКА:');
        console.log(`✅ Основных полей сделки: ~10`);
        console.log(`✅ Пользовательских полей: ${sortedFields.length}`);
        console.log(`✅ Сделок проанализировано: ${deals.length}`);
        console.log(`✅ Подключение к AmoCRM: успешно`);
        
        console.log('\n💡 ГОТОВ К НАСТРОЙКЕ ФИЛЬТРАЦИИ!');
        console.log('Теперь вы можете указать, по каким полям делать фильтрацию.');
        
    } catch (error) {
        console.error('❌ Ошибка анализа полей:', error.message);
        if (error.response) {
            console.error(`Статус: ${error.response.status}`);
            console.error('Данные:', error.response.data);
        }
    }
}

analyzeAmoFields();
