const { COLUMN_STRUCTURE } = require('./column-structure');

console.log('🧪 Простой тест добавления тестовой строки...');

// Проверим структуру колонок
console.log('📊 Всего колонок в структуре:', Object.keys(COLUMN_STRUCTURE).length);
console.log('📝 Первые 5 колонок:', Object.keys(COLUMN_STRUCTURE).slice(0, 5));

// Создадим тестовые данные как в основном коде
const testData = [];
const headers = Object.keys(COLUMN_STRUCTURE);

console.log(`📊 Создаем тестовую строку с ${headers.length} колонками`);

headers.forEach((header, index) => {
  switch (header) {
    case 'ID':
      testData.push('TEST-12345');
      break;
    case 'Название сделки':
      testData.push('🧪 Тестовая сделка - ' + new Date().toLocaleString('ru-RU'));
      break;
    case 'Основной контакт':
      testData.push('Тестовый контакт');
      break;
    case 'Ответственный':
      testData.push('Тестовый менеджер');
      break;
    case 'Этап сделки':
      testData.push('Тестовый этап');
      break;
    case 'Бюджет':
      testData.push('50000');
      break;
    case 'Дата создания':
      testData.push(new Date().toLocaleDateString('ru-RU'));
      break;
    case 'Кем создана':
      testData.push('Система тестирования');
      break;
    case 'Бар (deal)':
      testData.push('РВБ СПБ Г28');
      break;
    case 'Дата брони':
      testData.push(new Date().toLocaleDateString('ru-RU'));
      break;
    case 'Кол-во гостей':
      testData.push('4');
      break;
    case 'Время прихода':
      testData.push('19:00');
      break;
    case 'Комментарий МОБ':
      testData.push('Тестовый комментарий для проверки системы');
      break;
    case 'Тип лида':
      testData.push('Целевой');
      break;
    case 'Рабочий телефон (контакт)':
      testData.push('+7 (999) 123-45-67');
      break;
    default:
      testData.push(`Тест ${index + 1}`);
      break;
  }
});

console.log('📝 Тестовые данные подготовлены:');
console.log('   Длина массива:', testData.length);
console.log('   Первые 10 значений:', testData.slice(0, 10));
console.log('   Последние 5 значений:', testData.slice(-5));

console.log('✅ Тест структуры завершен');
