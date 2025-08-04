const fs = require('fs');
const path = require('path');

// Функция для сбора всех результатов диагностики и создания единого отчета
function generateDiagnosticReport() {
  const logDir = './diagnostic-logs';
  const reportPath = './diagnostic-results.md';
  
  // Проверяем наличие директории с логами
  if (!fs.existsSync(logDir)) {
    console.error('Директория с логами диагностики не найдена. Сначала запустите скрипты диагностики.');
    return;
  }
  
  // Начинаем формировать отчет
  let report = `# Отчет о диагностике интеграции AmoCRM webhook с Google Sheets\n\n`;
  report += `*Дата создания отчета: ${new Date().toLocaleString()}*\n\n`;
  
  // Функция для чтения и форматирования логов диагностики
  function readDiagnosticLog(logFile) {
    const logPath = path.join(logDir, logFile);
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      
      // Преобразуем логи в более читаемый формат для Markdown
      return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          // Удаляем временную метку в начале строки для чистоты
          const cleanLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z - /, '');
          
          // Форматируем результаты
          if (cleanLine.startsWith('✓')) {
            return `- ✅ ${cleanLine.substring(1).trim()}`;
          } else if (cleanLine.startsWith('✗')) {
            return `- ❌ ${cleanLine.substring(1).trim()}`;
          } else if (cleanLine.startsWith('===')) {
            // Заголовки разделов
            return `\n**${cleanLine.replace(/===/g, '').trim()}**\n`;
          } else if (cleanLine.startsWith('-')) {
            return `- ℹ️ ${cleanLine.substring(1).trim()}`;
          } else {
            return `- ${cleanLine}`;
          }
        })
        .join('\n');
    }
    return '*Файл журнала не найден*';
  }
  
  // Добавляем результаты диагностики переменных окружения
  report += `## 1. Диагностика переменных окружения\n\n`;
  report += readDiagnosticLog('environment-diagnostic.log');
  report += '\n\n';
  
  // Добавляем результаты диагностики подключения к Google Sheets
  report += `## 2. Диагностика подключения к Google Sheets\n\n`;
  report += readDiagnosticLog('google-sheets-diagnostic.log');
  report += '\n\n';
  
  // Добавляем результаты диагностики обработчика вебхуков
  report += `## 3. Диагностика обработчика вебхуков\n\n`;
  report += readDiagnosticLog('webhook-listener-diagnostic.log');
  report += '\n\n';
  
  // Добавляем результаты симуляции вебхуков
  report += `## 4. Симуляция вебхука AmoCRM\n\n`;
  report += readDiagnosticLog('webhook-simulator.log');
  report += '\n\n';
  
  // Добавляем итоговые рекомендации на основе результатов
  report += `## Рекомендации по исправлению проблем\n\n`;
  
  // Проверяем наличие файлов логов для определения проблем
  let hasEnvironmentIssues = false;
  let hasGoogleSheetsIssues = false;
  let hasWebhookHandlerIssues = false;
  let hasWebhookSimulationIssues = false;
  
  // Проверка логов на наличие ошибок
  const envLogPath = path.join(logDir, 'environment-diagnostic.log');
  if (fs.existsSync(envLogPath)) {
    const envLogContent = fs.readFileSync(envLogPath, 'utf8');
    hasEnvironmentIssues = envLogContent.includes('ОТСУТСТВУЕТ') || envLogContent.includes('ОШИБКА');
  }
  
  const sheetsLogPath = path.join(logDir, 'google-sheets-diagnostic.log');
  if (fs.existsSync(sheetsLogPath)) {
    const sheetsLogContent = fs.readFileSync(sheetsLogPath, 'utf8');
    hasGoogleSheetsIssues = sheetsLogContent.includes('ОШИБКА');
  }
  
  const webhookLogPath = path.join(logDir, 'webhook-listener-diagnostic.log');
  if (fs.existsSync(webhookLogPath)) {
    const webhookLogContent = fs.readFileSync(webhookLogPath, 'utf8');
    hasWebhookHandlerIssues = webhookLogContent.includes('✗') || webhookLogContent.includes('ОШИБКА');
  }
  
  const simulationLogPath = path.join(logDir, 'webhook-simulator.log');
  if (fs.existsSync(simulationLogPath)) {
    const simulationLogContent = fs.readFileSync(simulationLogPath, 'utf8');
    hasWebhookSimulationIssues = simulationLogContent.includes('ОШИБКА');
  }
  
  // Формирование рекомендаций на основе найденных проблем
  if (hasEnvironmentIssues) {
    report += `### Проблемы с переменными окружения\n\n`;
    report += `1. Убедитесь, что все необходимые переменные окружения установлены.\n`;
    report += `2. Проверьте формат и корректность файла учетных данных Google.\n`;
    report += `3. Рекомендуется создать файл .env с правильными настройками.\n\n`;
  }
  
  if (hasGoogleSheetsIssues) {
    report += `### Проблемы подключения к Google Sheets\n\n`;
    report += `1. Убедитесь, что сервисный аккаунт Google имеет доступ к таблице.\n`;
    report += `2. Проверьте, что ID Google таблицы указан правильно.\n`;
    report += `3. Проверьте, что формат учетных данных Google соответствует требованиям API.\n\n`;
  }
  
  if (hasWebhookHandlerIssues) {
    report += `### Проблемы с обработчиком вебхуков\n\n`;
    report += `1. Проверьте, запущен ли сервер на правильном порту.\n`;
    report += `2. Убедитесь, что маршрут для вебхуков настроен правильно (/webhook).\n`;
    report += `3. Проверьте код обработки вебхуков на наличие ошибок.\n\n`;
  }
  
  if (hasWebhookSimulationIssues) {
    report += `### Проблемы при симуляции вебхуков\n\n`;
    report += `1. Убедитесь, что сервер запущен и обрабатывает POST запросы.\n`;
    report += `2. Проверьте, что формат данных вебхука соответствует ожидаемому формату AmoCRM.\n`;
    report += `3. Проверьте наличие необходимой обработки для событий изменения статуса сделок.\n\n`;
  }
  
  // Если проблем не обнаружено
  if (!hasEnvironmentIssues && !hasGoogleSheetsIssues && !hasWebhookHandlerIssues && !hasWebhookSimulationIssues) {
    report += `🎉 Диагностика не выявила серьезных проблем. Если интеграция все еще не работает корректно, проверьте следующее:\n\n`;
    report += `1. Проверьте настройки вебхуков в AmoCRM.\n`;
    report += `2. Убедитесь, что ваш сервер доступен из интернета (через ngrok или публичный URL).\n`;
    report += `3. Проверьте журналы сервера при получении реальных вебхуков от AmoCRM.\n`;
  }
  
  // Сохраняем отчет в файл
  fs.writeFileSync(reportPath, report);
  
  console.log(`Отчет о диагностике успешно создан: ${reportPath}`);
}

// Запускаем генерацию отчета
generateDiagnosticReport();
