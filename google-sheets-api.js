const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { COLUMN_STRUCTURE } = require('./column-structure');

class GoogleSheetsAPI {
  constructor(sheetId, credentials) {
    this.sheetId = sheetId;
    this.credentials = credentials;
    this.doc = null;
    this.sheet = null;
  }

  async initialize() {
    try {
      const serviceAccountAuth = new JWT({
        email: this.credentials.client_email,
        key: this.credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.doc = new GoogleSpreadsheet(this.sheetId, serviceAccountAuth);
      await this.doc.loadInfo();
      
      console.log(`📊 Подключились к Google Таблице: ${this.doc.title}`);
      
      // Используем первый лист или создаём новый
      if (this.doc.sheetCount > 0) {
        this.sheet = this.doc.sheetsByIndex[0];
      } else {
        this.sheet = await this.doc.addSheet({ 
          title: 'Сделки amoCRM',
          headerValues: COLUMN_STRUCTURE
        });
        console.log('📝 Создан новый лист с заголовками');
        return;
      }

      // Проверяем и устанавливаем заголовки
      await this.ensureHeaders();
      
    } catch (error) {
      console.error('❌ Ошибка инициализации Google Sheets:', error.message);
      throw error;
    }
  }

  async ensureHeaders() {
    try {
      // Увеличиваем размер листа, если нужно
      if (this.sheet.columnCount < COLUMN_STRUCTURE.length) {
        console.log(`📏 Увеличиваем размер листа до ${COLUMN_STRUCTURE.length} колонок...`);
        await this.sheet.resize({
          rowCount: Math.max(this.sheet.rowCount, 1000),
          columnCount: COLUMN_STRUCTURE.length
        });
      }

      // Пытаемся загрузить заголовки
      try {
        await this.sheet.loadHeaderRow();
      } catch (error) {
        // Если заголовков нет, устанавливаем их
        console.log('📝 Заголовки отсутствуют, устанавливаем...');
        await this.sheet.setHeaderRow(COLUMN_STRUCTURE);
        await this.sheet.loadHeaderRow();
        console.log('✅ Заголовки установлены');
        return;
      }
      
      // Если заголовки есть, проверяем их корректность
      if (this.sheet.headerValues.length === 0) {
        console.log('📝 Заголовки пустые, устанавливаем...');
        await this.sheet.setHeaderRow(COLUMN_STRUCTURE);
        console.log('✅ Заголовки установлены');
      } else if (!this.arraysEqual(this.sheet.headerValues, COLUMN_STRUCTURE)) {
        console.log('📝 Заголовки не совпадают с требуемой структурой, обновляем...');
        await this.sheet.clear();
        await this.sheet.setHeaderRow(COLUMN_STRUCTURE);
        console.log('✅ Заголовки обновлены');
      } else {
        console.log('✅ Заголовки корректные');
      }
    } catch (error) {
      console.error('❌ Ошибка установки заголовков:', error.message);
      throw error;
    }
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  async findDealRow(dealId) {
    try {
      await this.sheet.loadCells('D:D'); // Колонка ID (4-я колонка)
      
      for (let i = 1; i < this.sheet.rowCount; i++) {
        const cell = this.sheet.getCell(i, 3); // 3 = колонка D (0-indexed)
        if (cell.value && cell.value.toString() === dealId.toString()) {
          return i + 1; // Возвращаем номер строки (1-indexed)
        }
      }
      
      return null; // Сделка не найдена
    } catch (error) {
      console.error('❌ Ошибка поиска сделки:', error.message);
      return null;
    }
  }

  async addOrUpdateDeal(dealData) {
    try {
      const dealId = dealData[3]; // ID сделки в 4-й колонке
      const existingRow = await this.findDealRow(dealId);
      
      if (existingRow) {
        // Обновляем существующую строку
        console.log(`🔄 Обновляем сделку ${dealId} в строке ${existingRow}`);
        await this.updateRow(existingRow, dealData);
      } else {
        // Добавляем новую строку
        console.log(`➕ Добавляем новую сделку ${dealId}`);
        await this.addRow(dealData);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка добавления/обновления сделки:', error.message);
      return false;
    }
  }

  async addRow(data) {
    try {
      const rowData = {};
      COLUMN_STRUCTURE.forEach((header, index) => {
        rowData[header] = data[index] || '';
      });
      
      await this.sheet.addRow(rowData);
      console.log('✅ Строка добавлена');
    } catch (error) {
      console.error('❌ Ошибка добавления строки:', error.message);
      throw error;
    }
  }

  async updateRow(rowNumber, data) {
    try {
      // Загружаем ячейки для нужной строки
      const range = `A${rowNumber}:${this.getColumnLetter(COLUMN_STRUCTURE.length)}${rowNumber}`;
      await this.sheet.loadCells(range);
      
      // Обновляем каждую ячейку
      for (let i = 0; i < data.length && i < COLUMN_STRUCTURE.length; i++) {
        const cell = this.sheet.getCell(rowNumber - 1, i);
        cell.value = data[i] || '';
      }
      
      await this.sheet.saveUpdatedCells();
      console.log('✅ Строка обновлена');
    } catch (error) {
      console.error('❌ Ошибка обновления строки:', error.message);
      throw error;
    }
  }

  getColumnLetter(columnNumber) {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  async getAllDealIds() {
    try {
      await this.sheet.loadCells('D:D'); // Колонка ID
      const dealIds = [];
      
      for (let i = 1; i < this.sheet.rowCount; i++) {
        const cell = this.sheet.getCell(i, 3);
        if (cell.value) {
          dealIds.push(cell.value.toString());
        }
      }
      
      return dealIds;
    } catch (error) {
      console.error('❌ Ошибка получения ID сделок:', error.message);
      return [];
    }
  }

  async clearAllData() {
    try {
      await this.sheet.clear();
      await this.sheet.setHeaderRow(COLUMN_STRUCTURE);
      console.log('🗑️ Данные очищены, заголовки восстановлены');
    } catch (error) {
      console.error('❌ Ошибка очистки данных:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleSheetsAPI;
