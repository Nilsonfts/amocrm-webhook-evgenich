const fs = require('fs');
const axios = require('axios');

// Функция для логирования в консоль и файл
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  fs.appendFileSync('./diagnostic-logs/amoCRM-api-test.log', formattedMessage + '\n');
}

// Функция для тестирования подключения к AmoCRM API
async function testAmoCRMConnection() {
  log('=== Проверка подключения к AmoCRM API ===');

  try {
    // Проверка наличия необходимых переменных окружения
    const requiredVars = [
      'AMO_DOMAIN',
      'AMO_ACCESS_TOKEN'
    ];

    let missingVars = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      log(`ОШИБКА: Отсутствуют необходимые переменные окружения: ${missingVars.join(', ')}`);
      return;
    }

    const domain = process.env.AMO_DOMAIN;
    const accessToken = process.env.AMO_ACCESS_TOKEN;
    
    log(`Использую домен: ${domain}`);
    log('Проверка валидности токена доступа...');

    // Запрос к API AmoCRM для проверки токена
    try {
      const response = await axios.get(`https://${domain}/api/v4/account`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      log('✓ Токен доступа валиден');
      log(`✓ Успешное подключение к аккаунту: ${response.data.name}`);
      
      // Получение информации о пользователе
      log('Получение информации о текущем пользователе...');
      
      const userResponse = await axios.get(`https://${domain}/api/v4/users/self`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      log(`✓ Текущий пользователь: ${userResponse.data.name}`);
      
      // Запрос списка воронок
      log('Получение списка воронок...');
      
      const pipelinesResponse = await axios.get(`https://${domain}/api/v4/leads/pipelines`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (pipelinesResponse.data._embedded && pipelinesResponse.data._embedded.pipelines) {
        const pipelines = pipelinesResponse.data._embedded.pipelines;
        log(`✓ Найдено воронок: ${pipelines.length}`);
        
        // Выводим информацию о каждой воронке и её статусах
        for (const pipeline of pipelines) {
          log(`  - Воронка: ${pipeline.name} (ID: ${pipeline.id})`);
          
          if (pipeline._embedded && pipeline._embedded.statuses) {
            log(`    Статусы воронки:`);
            for (const status of pipeline._embedded.statuses) {
              log(`      * ${status.name} (ID: ${status.id})`);
            }
          }
        }
      }

      // Проверка конфигурации полей
      log('Получение информации о пользовательских полях...');
      
      const fieldsResponse = await axios.get(`https://${domain}/api/v4/leads/custom_fields`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (fieldsResponse.data._embedded && fieldsResponse.data._embedded.custom_fields) {
        const customFields = fieldsResponse.data._embedded.custom_fields;
        log(`✓ Найдено пользовательских полей: ${customFields.length}`);
        
        // Ищем поле "Бар (deal)"
        const barField = customFields.find(field => field.name.includes('Бар') || field.name.includes('Bar'));
        if (barField) {
          log(`✓ Найдено поле "Бар": ${barField.name} (ID: ${barField.id})`);
          
          // Вывод значений поля
          if (barField.enums) {
            log('  Доступные значения:');
            Object.entries(barField.enums).forEach(([id, value]) => {
              log(`    * ${value.value} (ID: ${id})`);
            });
          }
        } else {
          log('✗ Поле "Бар (deal)" не найдено');
        }
      }
      
      log('=== Проверка подключения к AmoCRM завершена успешно ===');
    } catch (apiError) {
      log(`ОШИБКА при запросе к API: ${apiError.message}`);
      
      if (apiError.response) {
        log(`Код ошибки: ${apiError.response.status}`);
        log(`Ответ сервера: ${JSON.stringify(apiError.response.data)}`);
        
        if (apiError.response.status === 401) {
          log('Токен доступа недействителен или истек срок его действия');
          log('Необходимо обновить токен доступа');
          
          // Пробуем обновить токен, если есть refresh_token
          if (process.env.AMO_REFRESH_TOKEN && process.env.AMO_CLIENT_ID && process.env.AMO_CLIENT_SECRET) {
            log('Пробуем обновить токен доступа...');
            
            try {
              const refreshResponse = await axios.post(`https://${domain}/oauth2/access_token`, {
                client_id: process.env.AMO_CLIENT_ID,
                client_secret: process.env.AMO_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: process.env.AMO_REFRESH_TOKEN,
                redirect_uri: process.env.AMO_REDIRECT_URI
              });
              
              log('✓ Токен успешно обновлен');
              log(`Новый access_token: ${refreshResponse.data.access_token.substring(0, 10)}...`);
              log(`Новый refresh_token: ${refreshResponse.data.refresh_token.substring(0, 10)}...`);
              log('Обновите переменные окружения с новыми токенами');
            } catch (refreshError) {
              log(`ОШИБКА при обновлении токена: ${refreshError.message}`);
              if (refreshError.response) {
                log(`Ответ сервера: ${JSON.stringify(refreshError.response.data)}`);
              }
            }
          }
        }
      }
      
      log('=== Проверка подключения к AmoCRM завершена с ошибкой ===');
    }
  } catch (error) {
    log(`КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
    log('=== Проверка подключения к AmoCRM завершена с ошибкой ===');
  }
}

// Создадим директорию для логов, если её нет
if (!fs.existsSync('./diagnostic-logs')) {
  fs.mkdirSync('./diagnostic-logs');
}

// Очистим файл логов перед запуском
fs.writeFileSync('./diagnostic-logs/amoCRM-api-test.log', '');

// Запускаем проверку
testAmoCRMConnection();
