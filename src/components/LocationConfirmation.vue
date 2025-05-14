<template>
  <div class="login-container">
    <div class="login-form">
      <div class="logo-container">
        <svg-logo />
      </div>
      <h2 class="app-title">Местоположение</h2>
      
      <div v-if="loading" class="loading-wrapper">
        <div class="loading-spinner"></div>
        <p>Определяем ваше местоположение...</p>
      </div>
      
      <div v-else>
        <div v-if="!showSearch" class="confirmation-wrapper">
          <p class="city-question">Это ваш город?</p>
          <p class="city-name">{{ cityName }}</p>
          <p class="city-info">Это местоположение будет использоваться для центрирования карт OSM</p>
          
          <div class="button-group">
            <button class="login-button" @click="confirmCity">Да, это мой город</button>
            <button class="login-button secondary" @click="showSearch = true">Нет, выбрать другой</button>
          </div>
        </div>
        
        <div v-else class="search-wrapper">
          <p class="search-title">Введите название вашего города</p>
          
          <div class="search-input-wrapper">
            <input 
              type="text" 
              class="login-input" 
              v-model="searchQuery" 
              placeholder="Введите название города" 
              @input="handleSearchInput"
            />
            <button class="search-button" @click="searchCity" :disabled="searchQuery.length < 2">
              Поиск
            </button>
          </div>
          
          <div v-if="searchResults.length > 0" class="search-results">
            <div 
              v-for="(result, index) in searchResults" 
              :key="index" 
              class="search-result-item"
              @click="selectCity(result)"
            >
              {{ result.display_name }}
            </div>
          </div>
          
          <div v-if="searchError" class="error-message">
            {{ searchError }}
          </div>
          
          <div class="button-group">
            <button class="login-button" @click="searchCity" :disabled="searchQuery.length < 2">Найти город</button>
            <button class="login-button secondary" @click="showSearch = false">Вернуться</button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SvgLogo from './SvgLogo.vue';
import { settingsService } from '@/services/settings';
import { autoLoginAfterRegister } from '@/services/auth';
import { setAuthToken } from '@/api';
import Cookies from 'js-cookie';
import { api } from '@/api';

export default {
  name: 'LocationConfirmation',
  components: {
    SvgLogo
  },
  data() {
    return {
      loading: true,
      error: null,
      cityName: '',
      cityCoordinates: null,
      showSearch: false,
      searchQuery: '',
      searchResults: [],
      searchError: null,
      searchTimeout: null,
      selectedCity: null,
      tokenResetAttempted: false
    };
  },
  async created() {
    // Выполняем автовход после регистрации
    try {
      await autoLoginAfterRegister();
      
      // Проверяем, есть ли токен в cookie
      const token = Cookies.get('access_token');
      if (!token) {
        console.warn('Токен не найден в cookie');
      } else {
        console.log('Токен успешно установлен');
        // Ждем 300мс, чтобы все процессы авторизации завершились
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Ошибка автовхода:', error);
    }
    
    // Пытаемся определить местоположение по IP
    this.detectLocationByIp();
  },
  methods: {
    // Сброс токена авторизации
    resetToken() {
      if (this.tokenResetAttempted) return;
      
      this.tokenResetAttempted = true;
      const token = Cookies.get('access_token');
      if (token) {
        console.log('Переприменяем токен авторизации');
        setAuthToken(token);
      }
    },
    
    // Самореализованная функция debounce
    debounce(fn, delay) {
      return (...args) => {
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
          fn(...args);
        }, delay);
      };
    },
    
    async detectLocationByIp() {
      this.loading = true;
      this.error = null;
      
      try {
        // Используем HTTPS вместо HTTP для IP API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (!data.error) {
          this.cityName = `${data.city || 'Неизвестный город'}, ${data.country_name || data.country || ''}`.trim();
          this.cityCoordinates = {
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude)
          };
          
          // Если не удалось определить город, устанавливаем Санкт-Петербург
          if (!data.city) {
            this.cityName = 'Санкт-Петербург, Россия';
            this.cityCoordinates = {
              lat: 59.9342,
              lng: 30.3351
            };
          }
        } else {
          throw new Error(data.reason || 'Не удалось определить местоположение');
        }
      } catch (err) {
        console.error('Ошибка определения местоположения:', err);
        this.error = 'Не удалось определить ваше местоположение. Используем город по умолчанию.';
        
        // Устанавливаем город по умолчанию
        this.cityName = 'Санкт-Петербург, Россия';
        this.cityCoordinates = {
          lat: 59.9342,
          lng: 30.3351
        };
      } finally {
        this.loading = false;
      }
    },
    
    handleSearchInput() {
      if (this.searchQuery.length >= 2) {
        this.debounce(this.fetchCitySuggestions, 500)();
      } else {
        this.searchResults = [];
      }
    },
    
    async fetchCitySuggestions() {
      if (this.searchQuery.length < 2) return;
      
      this.searchError = null;
      
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('q', this.searchQuery);
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '5');
        url.searchParams.set('accept-language', 'en');
        
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Topotik/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const results = await response.json();
        this.searchResults = results.filter(item => 
          item.type === 'city' || 
          item.type === 'administrative' || 
          item.class === 'place'
        );
        
        if (this.searchResults.length === 0) {
          this.searchError = 'Города не найдены. Попробуйте другой запрос.';
        }
      } catch (err) {
        console.error('Ошибка поиска городов:', err);
        this.searchError = 'Произошла ошибка при поиске городов. Пожалуйста, попробуйте позже.';
      }
    },
    
    async searchCity() {
      if (this.searchQuery.length < 2) return;
      
      this.searchError = null;
      this.searchResults = [];
      
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('q', this.searchQuery);
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '5');
        url.searchParams.set('accept-language', 'en');
        
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Topotik/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const results = await response.json();
        this.searchResults = results.filter(item => 
          item.type === 'city' || 
          item.type === 'administrative' || 
          item.class === 'place'
        );
        
        if (this.searchResults.length === 0) {
          this.searchError = 'Города не найдены. Попробуйте другой запрос.';
        }
      } catch (err) {
        console.error('Ошибка поиска городов:', err);
        this.searchError = 'Произошла ошибка при поиске городов. Пожалуйста, попробуйте позже.';
      }
    },
    
    selectCity(city) {
      this.selectedCity = city;
      this.cityName = city.display_name;
      this.cityCoordinates = {
        lat: parseFloat(city.lat),
        lng: parseFloat(city.lon)
      };
      this.showSearch = false;
    },
    
    async confirmCity() {
      try {
        // Пробуем сначала сбросить/переприменить токен 
        this.resetToken();
        
        // Ждем 100мс, чтобы токен применился
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Получаем настройки по умолчанию 
        const defaultSettings = settingsService.getDefaultSettings();
        console.log('Настройки по умолчанию:', defaultSettings);
        
        // Обновляем настройки карты с выбранным городом
        const settings = {
          ...defaultSettings,
          map: {
            ...defaultSettings.map,
            defaultCity: this.cityName,
            defaultCoordinates: {
              lat: this.cityCoordinates.lat,
              lng: this.cityCoordinates.lng
            }
          }
        };
        console.log('Подготовленные настройки для сохранения:', settings);
        
        // Всегда сохраняем настройки локально, на случай сбоя API
        localStorage.setItem('user_settings', JSON.stringify(settings));
        console.log('Настройки сохранены в localStorage');
        
        try {
          // Проверяем, есть ли токен, прежде чем делать запрос к API
          const token = Cookies.get('access_token');
          if (token) {
            console.log('Найден токен для запроса к API:', token.substring(0, 10) + '...');
            console.log('Текущее состояние Authorization заголовка:', 
              api.defaults.headers.common['Authorization'] ? 
              api.defaults.headers.common['Authorization'].substring(0, 20) + '...' : 
              'отсутствует'
            );
            
            // Пробуем сохранить настройки на сервере
            console.log('Отправляем запрос updateUserSettings с данными:', {settings});
            await settingsService.updateUserSettings(settings);
            console.log('Настройки успешно сохранены на сервере');
          } else {
            console.warn('Попытка сохранения настроек без токена авторизации');
          }
        } catch (apiError) {
          console.error('Не удалось сохранить настройки на сервере:', apiError);
          console.log('Ответ сервера при ошибке:', apiError.response?.data);
          console.log('Статус ошибки:', apiError.response?.status);
          console.log('Заголовки запроса:', apiError.config?.headers);
          // Настройки уже сохранены локально выше
        }
        
        // В любом случае перенаправляем на главную страницу
        console.log('Перенаправляем на главную страницу');
        this.$router.push('/');
      } catch (err) {
        console.error('Ошибка сохранения настроек:', err);
        // Сохраняем базовые настройки локально и перенаправляем
        const basicSettings = settingsService.getDefaultSettings();
        basicSettings.map.defaultCity = this.cityName;
        basicSettings.map.defaultCoordinates = {
          lat: this.cityCoordinates.lat,
          lng: this.cityCoordinates.lng
        };
        localStorage.setItem('user_settings', JSON.stringify(basicSettings));
        console.log('Сохранены базовые настройки в localStorage из-за ошибки');
        
        // Перенаправляем несмотря на ошибку
        this.$router.push('/');
      }
    }
  }
};
</script>

<style>
/* Импортируем стили из LoginPage.css */
@import '../assets/css/components/LoginPage.css';

.confirmation-wrapper, .search-wrapper {
  width: 100%;
  text-align: center;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #14ae5c;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.city-question {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.city-name {
  font-size: 24px;
  font-weight: bold;
  color: #14ae5c;
  margin-bottom: 15px;
}

.city-info {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.login-button.secondary {
  background-color: #ffffff;
  border: 1px solid #ddd;
}

.login-button.secondary:hover {
  background-color: #f7f7f7;
}

.search-input-wrapper {
  display: flex;
  margin-bottom: 15px;
}

.search-button {
  padding: 12px;
  background-color: #14ae5c;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.search-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.login-input {
  border-radius: 4px 0 0 4px;
  margin-bottom: 0;
}

.search-results {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 15px;
}

.search-result-item {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-title {
  font-size: 16px;
  margin-bottom: 15px;
}
</style> 