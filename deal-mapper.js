const { COLUMN_STRUCTURE } = require('./column-structure');

/**
 * Преобразует данные сделки из amoCRM в строку для Google Sheets
 * @param {Object} deal - Данные сделки из amoCRM API
 * @param {Object} contacts - Контакты связанные со сделкой
 * @param {Object} companies - Компании связанные со сделкой
 * @param {Object} users - Пользователи amoCRM
 * @param {Object} pipelines - Воронки amoCRM
 * @returns {Array} Массив значений для строки в Google Sheets
 */
function mapDealToRow(deal, contacts = {}, companies = {}, users = {}, pipelines = {}) {
  const row = new Array(COLUMN_STRUCTURE.length).fill('');
  
  // Получаем значение кастомного поля
  const getCustomField = (fieldName) => {
    if (!deal.custom_fields_values) return '';
    const field = deal.custom_fields_values.find(f => f.field_name === fieldName);
    return field && field.values && field.values[0] ? field.values[0].value : '';
  };

  // Получаем контакт
  const mainContact = contacts[0] || {};
  const mainCompany = companies[0] || {};
  
  // Функция получения телефона по типу
  const getPhone = (contact, type) => {
    if (!contact.custom_fields_values) return '';
    const phoneField = contact.custom_fields_values.find(f => f.field_name === 'Телефон');
    if (!phoneField || !phoneField.values) return '';
    const phone = phoneField.values.find(v => v.enum_code === type);
    return phone ? phone.value : '';
  };

  // Функция получения email
  const getEmail = (contact, type = 'OTHER') => {
    if (!contact.custom_fields_values) return '';
    const emailField = contact.custom_fields_values.find(f => f.field_name === 'Email');
    if (!emailField || !emailField.values) return '';
    const email = emailField.values.find(v => v.enum_code === type);
    return email ? email.value : (emailField.values[0] ? emailField.values[0].value : '');
  };

  // Получаем имя пользователя
  const getUserName = (userId) => {
    return users[userId] ? users[userId].name : '';
  };

  // Получаем название воронки и этапа
  const getPipelineInfo = (pipelineId, statusId) => {
    const pipeline = pipelines[pipelineId];
    if (!pipeline) return { pipelineName: '', statusName: '' };
    
    const status = pipeline.statuses && pipeline.statuses[statusId];
    return {
      pipelineName: pipeline.name || '',
      statusName: status ? status.name : ''
    };
  };

  const { pipelineName, statusName } = getPipelineInfo(deal.pipeline_id, deal.status_id);

  // Форматирование даты
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ru-RU');
  };

  // Форматирование даты и времени
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU');
  };

  // Получение месяца и года
  const getMonthYear = (timestamp) => {
    if (!timestamp) return { month: '', year: '' };
    const date = new Date(timestamp * 1000);
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return {
      month: months[date.getMonth()],
      year: date.getFullYear().toString()
    };
  };

  const { month, year } = getMonthYear(deal.created_at);

  // Заполняем строку согласно структуре колонок
  const setColumn = (index, value) => {
    if (index >= 0 && index < row.length) {
      row[index] = value || '';
    }
  };

  // Блок 1. Даты и аналитика
  setColumn(0, formatDate(deal.created_at)); // Дата обращения (заявки)
  setColumn(1, month); // Месяц обращения
  setColumn(2, year); // Год обращения

  // Блок 2. Базовая информация по сделке
  setColumn(3, deal.id); // ID
  setColumn(4, deal.name); // Название сделки
  setColumn(5, mainCompany.name); // Компания
  setColumn(6, mainContact.name); // Основной контакт
  setColumn(7, mainContact.company ? mainContact.company.name : ''); // Компания контакта
  setColumn(8, getUserName(deal.responsible_user_id)); // Ответственный
  setColumn(9, pipelineName); // Воронка
  setColumn(10, statusName); // Этап сделки
  setColumn(11, deal.tags ? deal.tags.map(tag => tag.name).join(', ') : ''); // Теги сделки
  setColumn(12, getCustomField('Ближайшая задача')); // Ближайшая задача
  setColumn(13, formatDateTime(deal.created_at)); // Дата создания
  setColumn(14, getUserName(deal.created_by)); // Кем создана
  setColumn(15, formatDateTime(deal.updated_at)); // Дата изменения
  setColumn(16, getUserName(deal.updated_by)); // Кем изменена
  setColumn(17, formatDateTime(deal.closed_at)); // Дата закрытия

  // Блок 3. Финансы
  setColumn(18, deal.price); // Бюджет
  setColumn(19, getCustomField('ORDERID')); // ORDERID
  setColumn(20, getCustomField('PAYMENTID')); // PAYMENTID
  setColumn(21, getCustomField('TRANID')); // TRANID

  // Блок 4. Источник и аналитика
  setColumn(22, getCustomField('R.Источник сделки')); // R.Источник сделки
  setColumn(23, getCustomField('R.Тег города')); // R.Тег города
  setColumn(24, getCustomField('UTM_SOURCE')); // UTM_SOURCE
  setColumn(25, getCustomField('UTM_MEDIUM')); // UTM_MEDIUM
  setColumn(26, getCustomField('UTM_CAMPAIGN')); // UTM_CAMPAIGN
  setColumn(27, getCustomField('UTM_TERM')); // UTM_TERM
  setColumn(28, getCustomField('UTM_CONTENT')); // UTM_CONTENT
  setColumn(29, getCustomField('utm_referrer')); // utm_referrer
  setColumn(30, getCustomField('YM_CLIENT_ID')); // YM_CLIENT_ID
  setColumn(31, getCustomField('GA_CLIENT_ID')); // GA_CLIENT_ID
  setColumn(32, getCustomField('gclid')); // gclid
  setColumn(33, getCustomField('yclid')); // yclid
  setColumn(34, getCustomField('REFERER')); // REFERER

  // Блок 5. Канал заявки / форма
  setColumn(35, getCustomField('FORMNAME')); // FORMNAME
  setColumn(36, getCustomField('FORMID')); // FORMID
  setColumn(37, getCustomField('BUTTON_TEXT')); // BUTTON_TEXT
  setColumn(38, getCustomField('COMMENTS')); // COMMENTS

  // Блок 6. Бронирование и мероприятие
  setColumn(39, getCustomField('Бар (deal)')); // Бар (deal)
  setColumn(40, getCustomField('Адрес бара (если есть)')); // Адрес бара
  setColumn(41, getCustomField('Дата брони')); // Дата брони
  setColumn(42, getCustomField('Время прихода')); // Время прихода
  setColumn(43, getCustomField('Кол-во гостей')); // Кол-во гостей
  setColumn(44, getCustomField('QUANTITY')); // QUANTITY
  setColumn(45, getCustomField('_Зал')); // _Зал
  setColumn(46, getCustomField('Комментарий МОБ')); // Комментарий МОБ
  setColumn(47, getCustomField('Тип лида (целевой/нецелевой)')); // Тип лида
  setColumn(48, getCustomField('R.Статусы гостей')); // R.Статусы гостей
  setColumn(49, getCustomField('Сарафан гости')); // Сарафан гости
  setColumn(50, getCustomField('Причина отказа (ОБ)')); // Причина отказа

  // Блок 7. Контактные данные
  setColumn(51, getPhone(mainContact, 'WORK')); // Рабочий телефон (контакт)
  setColumn(52, getPhone(mainContact, 'MOB')); // Мобильный телефон (контакт)
  setColumn(53, getEmail(mainContact, 'OTHER')); // Другой email (контакт)
  setColumn(54, getCustomField('Номер линии MANGO OFFICE – основной')); // Номер линии MANGO OFFICE – основной
  setColumn(55, getCustomField('Номер линии MANGO OFFICE (контакт)')); // Номер линии MANGO OFFICE (контакт)

  // Блок 8. Примечания и дополнительные поля
  setColumn(56, getCustomField('Примечание 1')); // Примечание 1
  setColumn(57, getCustomField('Примечание 2')); // Примечание 2
  setColumn(58, getCustomField('Примечание 3')); // Примечание 3
  setColumn(59, getCustomField('Примечание 4')); // Примечание 4
  setColumn(60, getCustomField('Примечание 5')); // Примечание 5

  // Блок 9. Технические поля
  setColumn(61, getCustomField('DATE')); // DATE
  setColumn(62, getCustomField('TIME')); // TIME
  setColumn(63, getCustomField('_ym_uid')); // _ym_uid

  return row;
}

module.exports = {
  mapDealToRow
};
