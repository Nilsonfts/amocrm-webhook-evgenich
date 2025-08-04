console.log('🚀 Тестируем AmoCRM API');

require('dotenv').config();

const AMO_DOMAIN = process.env.AMO_DOMAIN;
const AMO_TOKEN = process.env.AMO_TOKEN;

console.log(`Домен: ${AMO_DOMAIN}`);
console.log(`Токен: ${AMO_TOKEN ? AMO_TOKEN.substring(0, 10) + '...' : 'отсутствует'}`);

const axios = require('axios');

async function test() {
    try {
        const url = `https://${AMO_DOMAIN}/api/v4/leads?limit=1`;
        console.log(`Запрос к: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${AMO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Ответ получен!');
        console.log(`Статус: ${response.status}`);
        console.log(`Количество сделок: ${response.data._embedded?.leads?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Ошибка запроса:');
        if (error.response) {
            console.error(`Статус: ${error.response.status}`);
            console.error(`Данные:`, error.response.data);
        } else if (error.request) {
            console.error('Нет ответа от сервера');
        } else {
            console.error('Ошибка настройки:', error.message);
        }
    }
}

test();
