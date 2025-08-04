const AmoCRMAPI = require('./amocrm-api');
const GoogleSheetsAPI = require('./google-sheets-api');
const { mapDealToRow } = require('./deal-mapper');

/**
 * DataSynchronizer - синхронизация данных между AmoCRM и Google Sheets
 * 
 * 🎯 ТЕКУЩИЕ НАСТРОЙКИ ФИЛЬТРАЦИИ:
 * 1. Поле "Бар (deal)" = "ЕВГ СПБ"
 * 2. ВСЕ ЭТАПЫ включены (как галочки на интерфейсе AmoCRM)
 * 
 * Для изменения списка этапов см. метод isTargetDeal()
 */
class DataSynchronizer {
  constructor(amoCRM, googleSheets) {
    this.amoCRM = amoCRM;
    this.googleSheets = googleSheets;
    this.users = {};
    this.pipelines = {};
  }

  async initialize() {
    console.log('🔄 Инициализация синхронизатора данных...');
    
    // Загружаем справочные данные
    await this.loadReferenceData();
    
    console.log('✅ Синхронизатор готов к работе');
  }

  async loadReferenceData() {
    try {
      console.log('📋 Загружаем справочные данные...');
      
      // Загружаем пользователей
      const usersResponse = await this.amoCRM.getUsers();
      if (usersResponse._embedded && usersResponse._embedded.users) {
        usersResponse._embedded.users.forEach(user => {
          this.users[user.id] = user;
        });
        console.log(`👥 Загружено пользователей: ${Object.keys(this.users).length}`);
      }

      // Загружаем воронки
      const pipelinesResponse = await this.amoCRM.getPipelines();
      if (pipelinesResponse._embedded && pipelinesResponse._embedded.pipelines) {
        pipelinesResponse._embedded.pipelines.forEach(pipeline => {
          this.pipelines[pipeline.id] = pipeline;
        });
        console.log(`🔄 Загружено воронок: ${Object.keys(this.pipelines).length}`);
      }

    } catch (error) {
      console.error('❌ Ошибка загрузки справочных данных:', error.message);
    }
  }

  async processDeal(dealId, dealData = null) {
    try {
      console.log(`🔍 Обрабатываем сделку ${dealId}...`);

      // Используем данные из webhook если есть, иначе запрашиваем из API
      let deal;
      if (dealData) {
        console.log(`📦 Используем данные из webhook для сделки ${dealId}`);
        deal = dealData;
      } else {
        console.log(`🔍 Запрашиваем данные сделки ${dealId} из AmoCRM API`);
        const dealResponse = await this.amoCRM.getDeal(dealId);
        deal = dealResponse;
      }

      // Проверяем фильтр по полю "Бар (deal)" = "ЕВГ СПБ" и логируем этапы
      if (!this.isTargetDeal(deal)) {
        // Детальная информация уже выведена в isTargetDeal()
        return false;
      }

      // Получаем связанные данные
      const { contacts, companies } = await this.getRelatedData(deal);

      // Преобразуем в формат строки
      const rowData = mapDealToRow(deal, contacts, companies, this.users, this.pipelines);

      // Сохраняем в Google Sheets
      const success = await this.googleSheets.addOrUpdateDeal(rowData);

      if (success) {
        console.log(`✅ Сделка ${dealId} успешно обработана`);
        return true;
      } else {
        console.log(`❌ Ошибка обработки сделки ${dealId}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки сделки ${dealId}:`, error.message);
      return false;
    }
  }

  // Проверка соответствия сделки фильтру
  isTargetDeal(deal) {
    console.log(`🔍 DEBUG isTargetDeal: сделка ${deal?.id}`);
    console.log(`🔍 DEBUG deal object:`, JSON.stringify(deal, null, 2));
    
    // ОТЛАДОЧНЫЙ РЕЖИМ: пропускаем фильтрацию если установлена переменная
    if (process.env.DEBUG_SKIP_FILTER === 'true') {
      console.log(`🚨 ОТЛАДОЧНЫЙ РЕЖИМ: Обрабатываем сделку ${deal.id} БЕЗ фильтрации по полю "Бар"`);
      return true;
    }
    
    // Загружаем конфигурацию поля "Бар (deal)"
    let barFieldConfig;
    try {
      barFieldConfig = require('./bar-field-config.json');
    } catch (e) {
      console.log('⚠️ Конфигурация поля "Бар (deal)" не найдена. Используем поиск по названию.');
    }
    
    if (!deal.custom_fields_values) {
      console.log(`⏭️ Сделка ${deal.id}: нет кастомных полей`);
      return false;
    }

    // Ищем поле "Бар (deal)"
    const barField = deal.custom_fields_values.find(f => {
      if (barFieldConfig && f.field_id === barFieldConfig.barFieldId) {
        return true;
      }
      // Fallback на поиск по названию
      return f.field_name === 'Бар (deal)' || 
             f.field_name === 'Бар' ||
             (f.field_name && f.field_name.toLowerCase().includes('бар'));
    });
    
    if (!barField || !barField.values || !barField.values[0]) {
      console.log(`⏭️ Сделка ${deal.id} "${deal.name}": поле "Бар (deal)" не найдено или пустое`);
      return false;
    }
    
    // Проверяем значение поля - может быть как текст, так и ID
    const barValue = barField.values[0].value;
    const barEnumId = barField.values[0].enum_id;
    
    console.log(`🔍 Сделка ${deal.id} "${deal.name}": ${barField.field_name} = "${barValue}" (enum_id: ${barEnumId})`);
    
    // Проверяем по тексту И по ID (из конфигурации)
    const isEvgSpb = barValue === 'ЕВГ СПБ' || 
                     (barFieldConfig && barEnumId === barFieldConfig.evgOptionId) ||
                     barEnumId === 1039939; // Жестко прописанный ID для надежности
    
    if (!isEvgSpb) {
      console.log(`⏭️ Пропускаем: значение "${barValue}" (ID: ${barEnumId}) ≠ "ЕВГ СПБ"`);
      return false;
    }

    // Получаем информацию об этапе для логирования
    const pipelineInfo = this.pipelines[deal.pipeline_id];
    const pipelineName = pipelineInfo ? pipelineInfo.name : 'Неизвестная воронка';
    
    let stageName = 'Неизвестный этап';
    let stageInfo = null;
    if (pipelineInfo && pipelineInfo.statuses) {
      stageInfo = Object.values(pipelineInfo.statuses).find(s => s.id === deal.status_id);
      stageName = stageInfo ? stageInfo.name : 'Неизвестный этап';
    }

    // НАСТРОЙКА ЭТАПОВ: Включаем ВСЕ этапы (как на картинке с галочками)
    // Если нужно ограничить этапы, раскомментируйте блок ниже:
    
    /*
    // Список разрешенных этапов (как на вашей картинке):
    const allowedStages = [
      'первичка (все)',       // ✓
      'What\'s App_TG',       // ✓
      'E-mail',               // ✓
      'Пропущенный точкой звонок', // ✓
      'Пропущенный Об звонок',     // ✓
      'Заявки сайт',          // ✓
      'Заявки VK',            // ✓
      'Чат-Бот',              // ✓
      'Задачи от супервайзера', // ✓
      'НДЗ',                  // ✓
      'Авторасределение',     // ✓
      'Взяли в работу',       // ✓ (выделенный на картинке)
    ];
    
    if (!allowedStages.includes(stageName)) {
      console.log(`⏭️ Сделка ${deal.id}: этап "${stageName}" не в списке разрешенных`);
      return false;
    }
    */

    console.log(`✅ Сделка ${deal.id}: Бар = "ЕВГ СПБ", Воронка = "${pipelineName}", Этап = "${stageName}" - ОБРАБАТЫВАЕМ`);
    
    // ТЕКУЩАЯ НАСТРОЙКА: ВСЕ ЭТАПЫ (как галочки на скриншоте AmoCRM)
    // Включены все этапы из воронки без ограничений
    console.log(`🎯 ФИЛЬТР: ЕВГ СПБ + ВСЕ ЭТАПЫ + ЗА ВСЕ ВРЕМЯ`);
    return true;
  }

  async getRelatedData(deal) {
    const contacts = [];
    const companies = [];

    try {
      // Получаем контакты
      if (deal._embedded && deal._embedded.contacts) {
        const contactIds = deal._embedded.contacts.map(c => c.id);
        if (contactIds.length > 0) {
          const contactsResponse = await this.amoCRM.getContacts(contactIds);
          if (contactsResponse._embedded && contactsResponse._embedded.contacts) {
            contacts.push(...contactsResponse._embedded.contacts);
          }
        }
      }

      // Получаем компании
      if (deal._embedded && deal._embedded.companies) {
        const companyIds = deal._embedded.companies.map(c => c.id);
        if (companyIds.length > 0) {
          const companiesResponse = await this.amoCRM.getCompanies(companyIds);
          if (companiesResponse._embedded && companiesResponse._embedded.companies) {
            companies.push(...companiesResponse._embedded.companies);
          }
        }
      }

    } catch (error) {
      console.error('❌ Ошибка получения связанных данных:', error.message);
    }

    return { contacts, companies };
  }

  async fullSync() {
    console.log('🔄 Запуск полной синхронизации (только сделки с "Бар (deal)" = "ЕВГ СПБ")...');
    const startTime = Date.now();
    let processed = 0;
    let filtered = 0;
    let errors = 0;
    let totalFound = 0;
    let evgDealsFound = 0;

    try {
      // Перезагружаем справочные данные
      await this.loadReferenceData();

      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`📄 Обрабатываем страницу ${page}...`);

        // Запрашиваем ВСЕ сделки (из всех воронок и ВСЕХ этапов, включая закрытые)
        // Фильтрация по "Бар (deal)" = "ЕВГ СПБ" происходит в isTargetDeal()
        const dealsResponse = await this.amoCRM.getAllDeals(page, 250);
        
        if (!dealsResponse._embedded || !dealsResponse._embedded.leads) {
          console.log('📭 Больше сделок нет');
          break;
        }

        const deals = dealsResponse._embedded.leads;
        totalFound += deals.length;
        console.log(`📋 Найдено сделок на странице: ${deals.length}, всего обработано страниц: ${totalFound}`);

        // Обрабатываем каждую сделку
        for (const deal of deals) {
          try {
            // ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА: проверяем все поля "Бар"
            if (deal.custom_fields_values) {
              const barFields = deal.custom_fields_values.filter(f => 
                f.field_name && f.field_name.toLowerCase().includes('бар')
              );
              
              if (barFields.length > 0) {
                console.log(`🔍 Сделка ${deal.id}: найдены поля с "бар":`, 
                  barFields.map(f => `${f.field_name} = ${f.values?.[0]?.value || 'пусто'}`).join(', '));
              }
            }

            // Проверяем фильтр
            if (!this.isTargetDeal(deal)) {
              filtered++;
              continue;
            }

            evgDealsFound++;
            const { contacts, companies } = await this.getRelatedData(deal);
            const rowData = mapDealToRow(deal, contacts, companies, this.users, this.pipelines);
            
            const success = await this.googleSheets.addOrUpdateDeal(rowData);
            if (success) {
              processed++;
            } else {
              errors++;
            }

            // Небольшая задержка чтобы не перегружать API
            if (processed % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }

          } catch (error) {
            console.error(`❌ Ошибка обработки сделки ${deal.id}:`, error.message);
            errors++;
          }
        }

        // Проверяем есть ли ещё страницы
        const totalPages = Math.ceil((dealsResponse._page_count || 0) / 250);
        hasMorePages = page < totalPages;
        page++;

        console.log(`📊 Страница ${page - 1} завершена. Найдено ЕВГ СПБ: ${evgDealsFound}, обработано: ${processed}, пропущено: ${filtered}, ошибок: ${errors}`);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ Полная синхронизация завершена за ${duration}с`);
      console.log(`📈 ИТОГОВАЯ СТАТИСТИКА:`);
      console.log(`   📊 Всего сделок просмотрено: ${totalFound}`);
      console.log(`   🎯 Найдено сделок ЕВГ СПБ: ${evgDealsFound}`);
      console.log(`   ✅ Успешно обработано: ${processed}`);
      console.log(`   ⏭️ Пропущено (не ЕВГ СПБ): ${filtered}`);
      console.log(`   ❌ Ошибок: ${errors}`);

      return { processed, filtered, errors, duration, totalFound, evgDealsFound };

    } catch (error) {
      console.error('❌ Критическая ошибка полной синхронизации:', error.message);
      return { processed, filtered, errors: errors + 1, duration: Math.round((Date.now() - startTime) / 1000), totalFound, evgDealsFound };
    }
  }

  // НОВЫЙ МЕТОД: Диагностика полей в AmoCRM
  async diagnoseFields() {
    console.log('🔍 ДИАГНОСТИКА: Анализ полей в AmoCRM...');
    
    try {
      // Получаем кастомные поля
      const customFields = await this.amoCRM.getCustomFields();
      console.log('📋 Найденные кастомные поля сделок:');
      
      if (customFields._embedded && customFields._embedded.custom_fields) {
        customFields._embedded.custom_fields.forEach(field => {
          console.log(`   ID: ${field.id}, Название: "${field.name}", Тип: ${field.type}`);
          
          // Ищем поля связанные с "бар"
          if (field.name.toLowerCase().includes('бар')) {
            console.log(`   ⭐ НАЙДЕНО ПОЛЕ С "БАР": ID ${field.id}, название "${field.name}"`);
            
            if (field.enums) {
              console.log(`   📝 Возможные значения:`);
              field.enums.forEach(enumItem => {
                console.log(`      - "${enumItem.value}" (ID: ${enumItem.id})`);
              });
            }
          }
        });
      }

      // Получаем несколько сделок для анализа
      console.log('\n🔍 ДИАГНОСТИКА: Анализ первых 50 сделок...');
      const dealsResponse = await this.amoCRM.getAllDeals(1, 50);
      
      if (dealsResponse._embedded && dealsResponse._embedded.leads) {
        let foundEvgDeals = 0;
        const barValues = new Set();
        
        dealsResponse._embedded.leads.forEach(deal => {
          if (deal.custom_fields_values) {
            // Ищем все поля с "бар" в названии
            const barFields = deal.custom_fields_values.filter(f => 
              f.field_name && f.field_name.toLowerCase().includes('бар')
            );
            
            barFields.forEach(field => {
              if (field.values && field.values[0]) {
                barValues.add(`${field.field_name}: "${field.values[0].value}"`);
                
                if (field.values[0].value === 'ЕВГ СПБ') {
                  foundEvgDeals++;
                  console.log(`✅ НАЙДЕНА СДЕЛКА ЕВГ СПБ: ID ${deal.id}, поле "${field.field_name}" = "${field.values[0].value}"`);
                }
              }
            });
          }
        });
        
        console.log(`\n📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:`);
        console.log(`   🎯 Найдено сделок ЕВГ СПБ в первых 50: ${foundEvgDeals}`);
        console.log(`   📝 Найденные значения полей "бар":`);
        barValues.forEach(value => console.log(`      - ${value}`));
      }
      
      return { success: true, message: 'Диагностика завершена, проверьте логи' };
      
    } catch (error) {
      console.error('❌ Ошибка диагностики:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DataSynchronizer;
