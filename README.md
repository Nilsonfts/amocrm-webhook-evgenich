# Проект интеграции AmoCRM webhook с Google Sheets

Этот проект обеспечивает автоматическую синхронизацию данных из AmoCRM в Google Sheets при изменении статуса сделок через механизм вебхуков.

## Основные файлы проекта

- `index.js` - основной файл приложения, запускает сервер и обрабатывает вебхуки
- `amocrm-api.js` - модуль для работы с API AmoCRM
- `google-sheets-api.js` - модуль для работы с Google Sheets API
- `data-synchronizer.js` - логика синхронизации данных между AmoCRM и Google Sheets
- `deal-mapper.js` - преобразование данных из формата AmoCRM в формат для Google Sheets
- `config/fields.json` - настройки полей и их маппинга

## Диагностические утилиты

- `check-new-credentials.js` - скрипт для проверки учетных данных Google Sheets API
- `simulate-webhook-with-field.js` - скрипт для симуляции вебхука AmoCRM
- `prepare-env-variables.sh` - скрипт для подготовки переменных окружения

## Настройка

1. Убедитесь, что установлены все зависимости:
   ```
   npm install
   ```

2. Настройте переменные окружения:
   ```
   # Можно использовать скрипт для создания файла .env
   ./prepare-env-variables.sh
   ```

3. Проверьте подключение к Google Sheets:
   ```
   node check-new-credentials.js
   ```

## Запуск

```bash
# Запуск в режиме разработки
npm run dev

# Запуск в production режиме
npm start
```

## Тестирование

Для симуляции вебхука от AmoCRM:

```bash
node simulate-webhook-with-field.js
```

## Развертывание на Railway

1. Убедитесь, что в вашем проекте настроены переменные окружения согласно `.env.production`
2. Обратите особое внимание на переменную `GOOGLE_CREDENTIALS`, она должна содержать корректный JSON

## Решение проблем

См. файл `updated-diagnostic-results.md` для подробного анализа проблем и их решений.
