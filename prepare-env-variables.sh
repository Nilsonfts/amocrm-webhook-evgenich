#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Проверка формата и установка переменных окружения для сервера ===${NC}"

# Создаем временный файл для переменных
ENV_FILE="./.env.production"

echo "# Переменные окружения для AmoCRM webhook интеграции с Google Sheets" > $ENV_FILE
echo "# Сгенерировано: $(date)" >> $ENV_FILE
echo "" >> $ENV_FILE

# Добавляем переменные AmoCRM
echo "# AmoCRM учетные данные" >> $ENV_FILE
echo "AMO_ACCESS_TOKEN=\"eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjYzZjgyNWY2YWIwZDUyYjAyMmNmNzc5MTQ1ZTI4M2E3M2Q5MzFlMDdkMTcyMDhhZWIxNTNhZjA4OTA0MmZlODUzMzJiZDY3OTI3ZDhkNjQ0In0.eyJhdWQiOiJhZmE5YmMwNy0zOTA2LTQ2YTgtYjkyZC0zMmM5MDk0MDM4YjgiLCJqdGkiOiI2M2Y4MjVmNmFiMGQ1MmIwMjJjZjc3OTE0NWUyODNhNzNkOTMxZTA3ZDE3MjA4YWViMTUzYWYwODkwNDJmZTg1MzMyYmQ2NzkyN2Q4ZDY0NCIsImlhdCI6MTc1NDI1ODA5NywibmJmIjoxNzU0MjU4MDk3LCJleHAiOjE4MjQyNDk2MDAsInN1YiI6IjgwNTExMTAiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MTU2OTkzNDksImJhc2VfZG9tYWluIjoiYW1vY3JtLnJ1IiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJ1c2VyX2ZsYWdzIjowLCJoYXNoX3V1aWQiOiI0NDUwMWNjZC1mM2I3LTRiZmMtYTFmNC1iOWFiOTVkNzZkNDciLCJhcGlfZG9tYWluIjoiYXBpLWIuYW1vY3JtLnJ1In0.XDF7qGpq6tt8kXQR-tY-pEQ7Fd1kIInlS2CueW60Z3QaLDkZkWTHWNj7P18TpWpUpIqA58fZg4Hp633A62uCfErRpBZ_3mMi93GKQfmsEo5ka-Sv83TYFV9bnB-qIiP4vMceKKxFOR7-qwFgFnSamo2Dbd7SGsR2tkr9N_iZAhnT1wtddUOAr3b5zWuWdOwynBTPajsAzcC6JGthIkryateyJ_Z7UPHWuS_X-wvMrtjVQpTFNzbL0fypw-3S2Z_Bs5z6TW92RHdsPGSOKEXH_lwcIdQa7qTPYgd4UgKX-KBmd6_sQlqHTMl-LzCKjwOs4qlrVLi4tDFIB-269uGTOg\"" >> $ENV_FILE
echo "AMO_CLIENT_ID=\"afa9bc07-3906-46a8-b92d-32c9094038b8\"" >> $ENV_FILE
echo "AMO_CLIENT_SECRET=\"u18Vd3at1vdM8qP9ZqwrgZqTSsq9djV0WOpyG1BzjjleqpjU3bo6THGgb4v1GDJp\"" >> $ENV_FILE
echo "AMO_DOMAIN=\"nebar.amocrm.ru\"" >> $ENV_FILE
echo "AMO_REDIRECT_URI=\"https://spb.evgenich.bar\"" >> $ENV_FILE
echo "AMO_REFRESH_TOKEN=\"nW2782RFUnzSWxFM0Oiaxf2movu6UArY17q690CpGhj9P7yzNMpqzuMkWOQTRrDW\"" >> $ENV_FILE
echo "AMO_TOKEN=\"eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjYzZjgyNWY2YWIwZDUyYjAyMmNmNzc5MTQ1ZTI4M2E3M2Q5MzFlMDdkMTcyMDhhZWIxNTNhZjA4OTA0MmZlODUzMzJiZDY3OTI3ZDhkNjQ0In0.eyJhdWQiOiJhZmE5YmMwNy0zOTA2LTQ2YTgtYjkyZC0zMmM5MDk0MDM4YjgiLCJqdGkiOiI2M2Y4MjVmNmFiMGQ1MmIwMjJjZjc3OTE0NWUyODNhNzNkOTMxZTA3ZDE3MjA4YWViMTUzYWYwODkwNDJmZTg1MzMyYmQ2NzkyN2Q4ZDY0NCIsImlhdCI6MTc1NDI1ODA5NywibmJmIjoxNzU0MjU4MDk3LCJleHAiOjE4MjQyNDk2MDAsInN1YiI6IjgwNTExMTAiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MTU2OTkzNDksImJhc2VfZG9tYWluIjoiYW1vY3JtLnJ1IiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJ1c2VyX2ZsYWdzIjowLCJoYXNoX3V1aWQiOiI0NDUwMWNjZC1mM2I3LTRiZmMtYTFmNC1iOWFiOTVkNzZkNDciLCJhcGlfZG9tYWluIjoiYXBpLWIuYW1vY3JtLnJ1In0.XDF7qGpq6tt8kXQR-tY-pEQ7Fd1kIInlS2CueW60Z3QaLDkZkWTHWNj7P18TpWpUpIqA58fZg4Hp633A62uCfErRpBZ_3mMi93GKQfmsEo5ka-Sv83TYFV9bnB-qIiP4vMceKKxFOR7-qwFgFnSamo2Dbd7SGsR2tkr9N_iZAhnT1wtddUOAr3b5zWuWdOwynBTPajsAzcC6JGthIkryateyJ_Z7UPHWuS_X-wvMrtjVQpTFNzbL0fypw-3S2Z_Bs5z6TW92RHdsPGSOKEXH_lwcIdQa7qTPYgd4UgKX-KBmd6_sQlqHTMl-LzCKjwOs4qlrVLi4tDFIB-269uGTOg\"" >> $ENV_FILE
echo "" >> $ENV_FILE

# Добавляем переменные Google Sheets
echo "# Google Sheets настройки" >> $ENV_FILE
echo "GOOGLE_SHEET_ID=\"1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE\"" >> $ENV_FILE
echo "GOOGLE_SHEET_GID=\"0\"" >> $ENV_FILE

# Добавляем корректно отформатированную JSON строку для учетных данных Google
echo -e "${YELLOW}Форматирование JSON учетных данных Google для Railway...${NC}"

# Читаем файл с учетными данными
CREDENTIALS=$(cat ./google-credentials-new.json)

# Экранируем кавычки для безопасной вставки в переменную окружения
ESCAPED_CREDENTIALS=$(echo $CREDENTIALS | sed 's/"/\\"/g')

# Добавляем переменную с учетными данными
echo "# JSON учетных данных Google сервисного аккаунта (экранированный)" >> $ENV_FILE
echo "GOOGLE_CREDENTIALS=\"$ESCAPED_CREDENTIALS\"" >> $ENV_FILE
echo "" >> $ENV_FILE

# Добавляем дополнительные переменные
echo "# Дополнительные настройки" >> $ENV_FILE
echo "PORT=\"3000\"" >> $ENV_FILE
echo "DEBUG_SKIP_FILTER=\"false\"" >> $ENV_FILE
echo "" >> $ENV_FILE

echo -e "${GREEN}✓ Файл .env.production создан${NC}"
echo -e "${YELLOW}Для установки переменных на сервере Railway выполните следующие шаги:${NC}"
echo -e "1. Откройте проект на Railway"
echo -e "2. Перейдите в раздел Variables"
echo -e "3. Скопируйте содержимое файла .env.production и импортируйте его в Railway"
echo -e ""
echo -e "${YELLOW}Особое внимание:${NC}"
echo -e "Убедитесь, что переменная GOOGLE_CREDENTIALS содержит корректный JSON (проверенный вами ранее)."
echo -e ""
echo -e "${YELLOW}Для загрузки переменных на сервер из файла (если у вас установлен railway CLI):${NC}"
echo -e "railway variables:from-file .env.production"

# Просмотр сгенерированного файла
echo -e ""
echo -e "${YELLOW}Просмотр сгенерированного файла (первые строки):${NC}"
head -n 10 $ENV_FILE
