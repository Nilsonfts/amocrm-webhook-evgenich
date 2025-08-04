const axios = require('axios');
require('dotenv').config();

// Подключаем ваш модуль для работы с Google Таблицами
// Убедитесь, что файл `google-sheets-api.js` находится в той же папке
const { appendRow } = require('./google-sheets-api'); 
const { format } = require('date-fns');

// --- Ваши данные из файла .env ---
const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;
// ------------------------------------

// --- Настройки выгрузки ---
// С 1 апреля 2025 года (обновленные требования)
const startDate = new Date('2025-04-01'); // С 1 апреля 2025
startDate.setHours(0, 0, 0, 0);
const startTimestamp = Math.floor(startDate.getTime() / 1000);
console.log(`📅 Выгрузка С 1 АПРЕЛЯ 2025 с ${startDate.toLocaleDateString('ru-RU')}`);
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
        let apiUrl = `https://${AMO_DOMAIN}/api/v4/leads?filter[created_at][from]=${startTimestamp}&with=contacts&limit=250`;
        
        console.log('\nНачинаю выгрузку сделок из amoCRM...');

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

        console.log('\nНачинаю запись данных в Google Таблицу (это может занять несколько минут)...');
        
        // Преобразуем каждую сделку в строку для таблицы
        for (const deal of allDeals) {
            const contact = deal._embedded && deal._embedded.contacts && deal._embedded.contacts[0];
            const pipelineInfo = pipelinesData[deal.pipeline_id] || { name: 'Неизвестно', statuses: {} };
            const statusName = pipelineInfo.statuses[deal.status_id] || 'Неизвестно';
            
            const rowData = {
                // ВАЖНО: Эти названия должны ТОЧНО совпадать с заголовками в вашей таблице!
                'Дата создания': format(new Date(deal.created_at * 1000), 'dd.MM.yyyy HH:mm:ss'),
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
            
            await appendRow(rowData);
            console.log(`- Записана сделка ID: ${deal.id}`);
        }

        console.log('\n--- ЗАПИСЬ В GOOGLE ТАБЛИЦУ УСПЕШНО ЗАВЕРШЕНА ---');

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
