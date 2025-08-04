const axios = require('axios');
require('dotenv').config();

// Убираем зависимость от date-fns для простоты

// --- Ваши данные из файла .env ---
const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;
// ------------------------------------

// --- Настройки выгрузки ---
// За все время (все этапы)
console.log('📅 ФИЛЬТРЫ:');
console.log('   📍 Бар (deal): ЕВГ СПБ');
console.log('   📊 Этапы: ВСЕ ЭТАПЫ');
console.log('   ⏰ Период: ЗА ВСЕ ВРЕМЯ');
// --------------------------

// Хранилище для названий воронок и статусов
const pipelinesData = {};

/**
 * Функция для получения названий всех воронок и статусов
 */
async function fetchPipelines() {
    console.log('Загружаю информацию о воронках и статусах...');
    try {
        const response = await axios.get(`https://${AMO_DOMAIN}/api/v4/leads/pipelines`, {
            headers: { 'Authorization': `Bearer ${AMO_TOKEN}` }
        });

        response.data._embedded.pipelines.forEach(pipeline => {
            pipelinesData[pipeline.id] = {
                name: pipeline.name,
                statuses: {}
            };
            pipeline._embedded.statuses.forEach(status => {
                pipelinesData[pipeline.id].statuses[status.id] = status.name;
            });
        });
        console.log('Информация о воронках успешно загружена.');
    } catch (error) {
        console.error('Не удалось загрузить информацию о воронках:', error.message);
        throw error;
    }
}


/**
 * Основная функция для выгрузки и записи сделок
 */
async function exportAndSaveDeals() {
    try {
        await fetchPipelines(); // Сначала получаем данные о воронках

        let allDeals = [];
        let page = 1;
        // Убираем фильтр по дате - берем ВСЕ сделки за все время
        let apiUrl = `https://${AMO_DOMAIN}/api/v4/leads?with=custom_fields_values,contacts&limit=250`;
        
        console.log('\n🚀 Начинаю выгрузку ВСЕХ сделок из amoCRM...');
        console.log('🎯 Ищем сделки с "Бар (deal)" = "ЕВГ СПБ" во ВСЕХ этапах');
        

        while (apiUrl) {
            console.log(`- Запрашиваю страницу №${page}...`);
            const response = await axios.get(apiUrl, {
                headers: { 'Authorization': `Bearer ${AMO_TOKEN}` }
            });

            if (response.data && response.data._embedded && response.data._embedded.leads) {
                const deals = response.data._embedded.leads;
                allDeals.push(...deals);
                console.log(`  ...получено ${deals.length} сделок.`);
            }

            apiUrl = response.data._links && response.data._links.next ? response.data._links.next.href : null;
            page++;
        }

        console.log('\n--- ВЫГРУЗКА ИЗ AMO ЗАВЕРШЕНА ---');
        console.log(`Всего найдено сделок: ${allDeals.length}`);

        if (allDeals.length === 0) {
            console.log('Новых сделок для записи нет.');
            return;
        }

        console.log('\nНачинаю запись данных в консоль для проверки...');
        
        let evgDealsCount = 0;
        let totalDealsChecked = 0;
        
        // Преобразуем каждую сделку в строку для таблицы
        for (const deal of allDeals) {
            totalDealsChecked++;
            
            // Проверяем, есть ли у сделки поле "Бар (deal)" с значением "ЕВГ СПБ"
            let isEvgDeal = false;
            let barValue = '';
            
            if (deal.custom_fields_values) {
                const barField = deal.custom_fields_values.find(field => 
                    field.field_name === 'Бар (deal)'
                );
                
                if (barField && barField.values && barField.values[0]) {
                    barValue = barField.values[0].value;
                    // ТОЧНОЕ совпадение с "ЕВГ СПБ"
                    if (barValue === 'ЕВГ СПБ') {
                        isEvgDeal = true;
                        evgDealsCount++;
                    }
                }
            }
            
            if (isEvgDeal) {
                const contact = deal._embedded && deal._embedded.contacts && deal._embedded.contacts[0];
                const pipelineInfo = pipelinesData[deal.pipeline_id] || { name: 'Неизвестно', statuses: {} };
                const statusName = pipelineInfo.statuses[deal.status_id] || 'Неизвестно';
                
                const rowData = {
                    // ВАЖНО: Эти названия должны ТОЧНО совпадать с заголовками в вашей таблице!
                    'Дата создания': new Date(deal.created_at * 1000).toLocaleString('ru-RU'),
                    'Название сделки': deal.name,
                    'Бюджет': deal.price,
                    'Воронка': pipelineInfo.name,
                    'Статус сделки': statusName,
                    // Поля ниже пока не заполняются, так как требуют более сложных запросов
                    'Ответственный': '', 
                    'Имя контакта': contact ? contact.name : '',
                    'Телефон': '', 
                    'Email': '',
                };
                
                // Временно выводим в консоль вместо записи в Google Sheets
                console.log(`✅ НАЙДЕНА ЕВГ СПБ! Сделка ${deal.id}: "${deal.name}"`);
                console.log(`   📍 Бар: ${barValue}`);
                console.log(`   📅 Создано: ${rowData['Дата создания']}`);
                console.log(`   💰 Бюджет: ${rowData['Бюджет']} ₽`);
                console.log(`   🏢 Воронка: ${rowData['Воронка']}`);
                console.log(`   📊 Этап: ${rowData['Статус сделки']}`);
                console.log('');
                
                // Когда Google Sheets API будет исправлен, раскомментируйте эту строку:
                // await appendRow(rowData);
            }
        }

        console.log('\n🎯 РЕЗУЛЬТАТ ПОИСКА ЕВГ СПБ:');
        console.log(`📊 Всего сделок проверено: ${totalDealsChecked}`);
        console.log(`✅ Найдено сделок "ЕВГ СПБ": ${evgDealsCount}`);
        console.log(`📈 Процент ЕВГ СПБ: ${Math.round((evgDealsCount/totalDealsChecked)*100)}%`);
        console.log('\n🔍 НАСТРОЙКИ ФИЛЬТРА:');
        console.log('   📍 Поле: "Бар (deal)" = "ЕВГ СПБ"');
        console.log('   📊 Этапы: ВСЕ ЭТАПЫ воронки');
        console.log('   ⏰ Период: ЗА ВСЕ ВРЕМЯ');

    } catch (error) {
        if (error.response) {
            console.error('\nОШИБКА! Не удалось получить данные. Ответ от сервера:');
            console.error(`Статус: ${error.response.status}`);
            console.error('Данные: ', error.response.data);
            if (error.response.status === 401) {
                console.error('\nВероятная причина: Ваш токен AMO_TOKEN устарел. Его нужно обновить.');
            }
        } else {
            console.error('Произошла критическая ошибка:', error.message);
        }
    }
}

// Запускаем главную функцию
exportAndSaveDeals();
