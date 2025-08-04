#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Запуск полной диагностики AmoCRM webhook интеграции ===${NC}"

# Создаем директорию для логов, если она не существует
mkdir -p ./diagnostic-logs

# Функция для запуска скрипта диагностики
run_diagnostic() {
  script_name=$1
  script_path="./diagnostic-scripts/$script_name"
  
  echo -e "\n${YELLOW}Запуск диагностики: ${script_name}${NC}"
  
  if [ -f "$script_path" ]; then
    node "$script_path"
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Диагностика $script_name завершена${NC}"
    else
      echo -e "${RED}✗ Диагностика $script_name завершена с ошибками${NC}"
    fi
  else
    echo -e "${RED}✗ Скрипт диагностики не найден: $script_path${NC}"
  fi
}

# Запускаем диагностику среды
echo -e "\n${YELLOW}1. Диагностика переменных окружения${NC}"
run_diagnostic "environment-diagnostic.js"

# Запускаем проверку учетных данных Google
echo -e "\n${YELLOW}2. Проверка учетных данных Google${NC}"
run_diagnostic "credentials-test.js"

# Запускаем диагностику подключения к Google Sheets
echo -e "\n${YELLOW}3. Диагностика подключения к Google Sheets${NC}"
run_diagnostic "google-sheets-diagnostic.js"

# Запускаем проверку подключения к AmoCRM
echo -e "\n${YELLOW}4. Проверка подключения к AmoCRM${NC}"
run_diagnostic "amoCRM-api-test.js"

# Запускаем диагностику обработчика вебхуков
echo -e "\n${YELLOW}5. Диагностика обработчика вебхуков${NC}"
run_diagnostic "webhook-listener-diagnostic.js"

# Запускаем симуляцию вебхука (если сервер запущен)
echo -e "\n${YELLOW}6. Симуляция вебхука AmoCRM${NC}"
run_diagnostic "webhook-simulator.js"

# Вывод результатов
echo -e "\n${GREEN}=== Диагностика завершена ===${NC}"
echo -e "${YELLOW}Результаты диагностики сохранены в директории ./diagnostic-logs/${NC}"
echo -e "Для анализа результатов проверьте файлы логов:"
echo -e "  - ./diagnostic-logs/environment-diagnostic.log"
echo -e "  - ./diagnostic-logs/google-sheets-diagnostic.log"
echo -e "  - ./diagnostic-logs/webhook-listener-diagnostic.log"
echo -e "  - ./diagnostic-logs/webhook-simulator.log"
