#!/bin/bash

# Ваш список полей (разделённые табуляцией в одну строку)
YOUR_FIELDS="ID	Название сделки	Основной контакт	Ответственный	Этап сделки	Бюджет	Дата создания	Кем создана	Теги сделки	Дата закрытия	YM_CLIENT_ID	GA_CLIENT_ID	BUTTON_TEXT	DATE	TIME	R.Источник сделки	R.Тег города	ПО	Бар (deal)	Дата брони	Кол-во гостей	Время прихода	Комментарий МОБ	Источник	Тип лида	Причина отказа (ОБ)	R.Статусы гостей	Сарафан гости	UTM_MEDIUM	FORMNAME	REFERER	FORMID	Номер линии MANGO OFFICE	UTM_SOURCE	UTM_TERM	UTM_CAMPAIGN	UTM_CONTENT	utm_referrer	_ym_uid	Рабочий телефон (контакт)	Номер линии MANGO OFFICE (контакт)	Примечание 1"

echo "🔍 Проверка соответствия полей AmoCRM → Google Sheets"
echo "=================================================="

# Получаем конфигурацию с сервера
CONFIG=$(curl -s http://localhost:3000/config/fields)

echo "📊 Общая статистика:"
TOTAL_FIELDS=$(echo "$CONFIG" | jq '. | length')
echo "   Всего полей в системе: $TOTAL_FIELDS"

YOUR_FIELDS_COUNT=$(echo "$YOUR_FIELDS" | tr '\t' '\n' | wc -l)
echo "   Полей в вашем списке: $YOUR_FIELDS_COUNT" 

echo ""
echo "✅ Проверка каждого поля из вашего списка:"
echo ""

MISSING_FIELDS=0
FOUND_FIELDS=0

# Преобразуем ваш список в массив и проверяем каждое поле
IFS=$'\t' read -ra FIELDS_ARRAY <<< "$YOUR_FIELDS"
for field in "${FIELDS_ARRAY[@]}"; do
    # Проверяем, есть ли поле в конфигурации
    if echo "$CONFIG" | jq -e --arg field "$field" 'has($field)' > /dev/null; then
        echo "✅ $field"
        ((FOUND_FIELDS++))
    else
        echo "❌ $field - ОТСУТСТВУЕТ"
        ((MISSING_FIELDS++))
    fi
done

echo ""
echo "📋 Результат проверки:"
echo "   ✅ Найдено полей: $FOUND_FIELDS"
echo "   ❌ Отсутствует полей: $MISSING_FIELDS"

if [ $MISSING_FIELDS -eq 0 ]; then
    echo ""
    echo "🎉 ОТЛИЧНО! Все поля из вашего списка присутствуют в системе!"
    echo "   Система готова для выгрузки всех 42 полей в Google Sheets."
else
    echo ""
    echo "⚠️  Обнаружены отсутствующие поля. Требуется дополнительная настройка."
fi
