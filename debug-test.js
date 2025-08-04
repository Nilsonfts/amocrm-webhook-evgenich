console.log('🔥 Тест запущен!');

try {
    require('dotenv').config();
    console.log('✅ dotenv загружен');
    
    console.log(`AMO_DOMAIN: ${process.env.AMO_DOMAIN || 'НЕ НАЙДЕН'}`);
    console.log(`AMO_TOKEN: ${process.env.AMO_TOKEN ? 'УСТАНОВЛЕН' : 'НЕ НАЙДЕН'}`);
    
} catch (error) {
    console.error('❌ Ошибка:', error.message);
}

console.log('🏁 Тест завершен!');
