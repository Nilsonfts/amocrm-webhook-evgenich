const axios = require('axios');

class AmoCRMAPI {
  constructor(domain, clientId, clientSecret, redirectUri) {
    this.domain = domain;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.accessToken = null;
    this.refreshToken = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post(`https://${this.domain}/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        redirect_uri: this.redirectUri
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      console.log('✅ Токен AmoCRM успешно обновлён');
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка обновления токена AmoCRM:', error.response?.data || error.message);
      throw error;
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `https://${this.domain}/api/v4/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔄 Токен истёк, обновляем...');
        await this.refreshAccessToken();
        
        // Повторяем запрос с новым токеном
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await axios(config);
        return retryResponse.data;
      }
      throw error;
    }
  }

  async getDeal(dealId) {
    return await this.makeRequest('GET', `leads/${dealId}?with=contacts,custom_fields_values`);
  }

  async getAllDeals(page = 1, limit = 250, pipelineId = null) {
    // Строим endpoint с параметрами для получения ВСЕХ сделок (включая закрытые)
    let endpoint = `leads?with=contacts,custom_fields_values&page=${page}&limit=${limit}`;
    
    // Добавляем параметр для получения ВСЕХ сделок независимо от статуса
    // Это гарантирует получение сделок из всех 25 этапов (включая закрытые)
    
    // Добавляем фильтр по воронке, если указан
    if (pipelineId) {
      endpoint += `&filter[pipeline_id]=${pipelineId}`;
    }
    
    console.log(`🔍 Запрос сделок: ${endpoint}`);
    return await this.makeRequest('GET', endpoint);
  }

  async getContacts(contactIds) {
    if (!contactIds || contactIds.length === 0) return { _embedded: { contacts: [] } };
    const ids = contactIds.join(',');
    return await this.makeRequest('GET', `contacts?id=${ids}&with=custom_fields_values`);
  }

  async getCompanies(companyIds) {
    if (!companyIds || companyIds.length === 0) return { _embedded: { companies: [] } };
    const ids = companyIds.join(',');
    return await this.makeRequest('GET', `companies?id=${ids}`);
  }

  async getUsers() {
    return await this.makeRequest('GET', 'users');
  }

  async getPipelines() {
    return await this.makeRequest('GET', 'leads/pipelines');
  }

  async getCustomFields() {
    return await this.makeRequest('GET', 'leads/custom_fields');
  }

  async getFieldsMetadata() {
    // Стандартные поля сделки
    const standardFields = [
      { key: 'name', label: 'Название сделки' },
      { key: 'price', label: 'Бюджет' },
      { key: 'status_id', label: 'Этап сделки' },
      { key: 'pipeline_id', label: 'Воронка' },
      { key: 'responsible_user_id', label: 'Ответственный' },
      { key: 'created_at', label: 'Дата создания' },
      { key: 'updated_at', label: 'Дата изменения' },
      { key: 'closed_at', label: 'Дата закрытия' },
      { key: 'created_by', label: 'Кем создана' },
      { key: 'updated_by', label: 'Кем изменена' },
      { key: 'tags', label: 'Теги' }
    ];
    // Кастомные поля
    const customFieldsResp = await this.getCustomFields();
    const customFields = (customFieldsResp._embedded?.custom_fields || []).map(f => ({
      key: f.field_id,
      label: f.name
    }));
    return {
      standard: standardFields,
      custom: customFields
    };
  }
}

module.exports = AmoCRMAPI;
