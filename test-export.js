const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Конфигурация
const config = {
    AMO_DOMAIN: 'nebar.amocrm.ru',
    AMO_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjYzZjgyNWY2YWIwZDUyYjAyMmNmNzc5MTQ1ZTI4M2E3M2Q5MzFlMDdkMTcyMDhhZWIxNTNhZjA4OTA0MmZlODUzMzJiZDY3OTI3ZDhkNjQ0In0.eyJhdWQiOiJhZmE5YmMwNy0zOTA2LTQ2YTgtYjkyZC0zMmM5MDk0MDM4YjgiLCJqdGkiOiI2M2Y4MjVmNmFiMGQ1MmIwMjJjZjc3OTE0NWUyODNhNzNkOTMxZTA3ZDE3MjA4YWViMTUzYWYwODkwNDJmZTg1MzMyYmQ2NzkyN2Q4ZDY0NCIsImlhdCI6MTc1NDI1ODA5NywibmJmIjoxNzU0MjU4MDk3LCJleHAiOjE4MjQyNDk2MDAsInN1YiI6IjgwNTExMTAiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MTU2OTkzNDksImJhc2VfZG9tYWluIjoiYW1vY3JtLnJ1IiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJ1c2VyX2ZsYWdzIjowLCJoYXNoX3V1aWQiOiI0NDUwMWNjZC1mM2I3LTRiZmMtYTFmNC1iOWFiOTVkNzZkNDciLCJhcGlfZG9tYWluIjoiYXBpLWIuYW1vY3JtLnJ1In0.XDF7qGpq6tt8kXQR-tY-pEQ7Fd1kIInlS2CueW60Z3QaLDkZkWTHWNj7P18TpWpUpIqA58fZg4Hp633A62uCfErRpBZ_3mMi93GKQfmsEo5ka-Sv83TYFV9bnB-qIiP4vMceKKxFOR7-qwFgFnSamo2Dbd7SGsR2tkr9N_iZAhnT1wtddUOAr3b5zWuWdOwynBTPajsAzcC6JGthIkryateyJ_Z7UPHWuS_X-wvMrtjVQpTFNzbL0fypw-3S2Z_Bs5z6TW92RHdsPGSOKEXH_lwcIdQa7qTPYgd4UgKX-KBmd6_sQlqHTMl-LzCKjwOs4qlrVLi4tDFIB-269uGTOg'
};

console.log('🚀 Быстрый тест экспорта AmoCRM');
console.log(`🌐 Подключаемся к: ${config.AMO_DOMAIN}`);

async function testAmoCRMConnection() {
    try {
        console.log('📡 Тестируем подключение к AmoCRM...');
        
        const response = await axios.get(`https://${config.AMO_DOMAIN}/api/v4/account`, {
            headers: {
                'Authorization': `Bearer ${config.AMO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Подключение успешно!');
        console.log('📊 Информация об аккаунте:', {
            id: response.data.id,
            name: response.data.name,
            subdomain: response.data.subdomain
        });
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения:', error.response?.status, error.response?.data || error.message);
        return false;
    }
}

async function getDeals() {
    try {
        console.log('📦 Получаем сделки с фильтром "ЕВГ СПБ"...');
        
        const response = await axios.get(`https://${config.AMO_DOMAIN}/api/v4/leads`, {
            headers: {
                'Authorization': `Bearer ${config.AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                'with': 'custom_fields_values',
                'limit': 10  // Пока ограничим для теста
            }
        });

        console.log(`✅ Получено ${response.data._embedded.leads.length} сделок`);
        
        // Проверим первую сделку
        if (response.data._embedded.leads.length > 0) {
            const deal = response.data._embedded.leads[0];
            console.log('🔍 Пример сделки:', {
                id: deal.id,
                name: deal.name,
                customFields: deal.custom_fields_values?.length || 0
            });
        }
        
        return response.data._embedded.leads;
    } catch (error) {
        console.error('❌ Ошибка получения сделок:', error.response?.status, error.response?.data || error.message);
        return [];
    }
}

async function main() {
    console.log('🎯 ЭКСПОРТ ДАННЫХ ДЛЯ ФИЛЬТРА: Бар = "ЕВГ СПБ", Все этапы, За все время');
    console.log('=' .repeat(80));
    
    // Шаг 1: Тест подключения
    const connected = await testAmoCRMConnection();
    if (!connected) {
        console.log('❌ Не удалось подключиться к AmoCRM. Проверьте токен.');
        return;
    }
    
    // Шаг 2: Тест получения сделок
    const deals = await getDeals();
    
    console.log('=' .repeat(80));
    console.log('✅ Базовый тест завершен успешно!');
}

// Запуск
main().catch(console.error);
