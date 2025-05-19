import { api } from '../api';
import { isAuthenticated } from './auth';
import Cookies from 'js-cookie';

/**
 * Сервис для работы с настройками пользователя
 */
export const settingsService = {
    /**
     * Получить настройки текущего пользователя
     * @returns {Promise<Object>} Настройки пользователя
     */
    async getUserSettings() {
        try {
            // Проверяем авторизацию перед запросом
            if (!isAuthenticated()) {
                console.warn('Пользователь не авторизован, используем локальные настройки');
                return this.getSettingsFromLocalStorage();
            }

            const response = await api.get('/users/me/settings');

            // Сохраняем в localStorage для резервного доступа
            localStorage.setItem('user_settings', JSON.stringify(response.data));

            return response.data;
        } catch (error) {
            console.error('Ошибка получения настроек пользователя:', error);
            return this.getSettingsFromLocalStorage();
        }
    },

    /**
     * Получить настройки из локального хранилища
     * @returns {Object} Настройки из localStorage или значения по умолчанию
     */
    getSettingsFromLocalStorage() {
        try {
            const localSettings = localStorage.getItem('user_settings');
            if (localSettings) {
                return JSON.parse(localSettings);
            }
        } catch (parseError) {
            console.error('Ошибка парсинга настроек из localStorage:', parseError);
        }
        return this.getDefaultSettings();
    },

    /**
     * Обновить настройки пользователя
     * @param {Object} settings - Новые настройки пользователя
     * @returns {Promise<Object>} Обновленные настройки
     */
    async updateUserSettings(settings) {
        console.log('updateUserSettings: Получены настройки для обновления:', settings);

        // Всегда сохраняем в localStorage для резервного доступа
        localStorage.setItem('user_settings', JSON.stringify(settings));
        console.log('updateUserSettings: Настройки сохранены в localStorage');

        try {
            // Проверяем авторизацию перед запросом
            if (!isAuthenticated()) {
                console.warn('updateUserSettings: Пользователь не авторизован, настройки сохранены только локально');
                return settings;
            }

            const token = Cookies.get('access_token');
            if (!token) {
                console.warn('updateUserSettings: Токен не найден, настройки сохранены только локально');
                return settings;
            }

            // Формируем запрос в формате, ожидаемом бэкендом
            // Бэкенд ожидает объект с полем 'settings', который содержит настройки
            const requestData = { settings: settings };

            console.log('updateUserSettings: Отправляем запрос к API с данными:', requestData);
            console.log('updateUserSettings: Заголовок Authorization:',
                api.defaults.headers.common['Authorization'] ?
                    api.defaults.headers.common['Authorization'].substring(0, 20) + '...' :
                    'отсутствует'
            );

            const response = await api.put('/users/me/settings', requestData);
            console.log('updateUserSettings: Ответ от сервера:', response.data);
            return response.data;
        } catch (error) {
            console.error('updateUserSettings: Ошибка обновления настроек пользователя:', error);
            console.log('updateUserSettings: Код ошибки:', error.code);
            console.log('updateUserSettings: Статус ошибки:', error.response?.status);
            console.log('updateUserSettings: Тело ответа:', error.response?.data);
            console.log('updateUserSettings: Конфигурация запроса:', {
                method: error.config?.method,
                url: error.config?.url,
                headers: error.config?.headers
            });
            // Возвращаем локальные настройки
            return settings;
        }
    },

    /**
     * Сбросить все настройки пользователя до значений по умолчанию
     * @returns {Promise<Object>} Настройки по умолчанию
     */
    async resetUserSettings() {
        const defaultSettings = this.getDefaultSettings();

        // Сохраняем локально
        localStorage.setItem('user_settings', JSON.stringify(defaultSettings));

        try {
            // Проверяем авторизацию перед запросом
            if (!isAuthenticated()) {
                console.warn('Пользователь не авторизован, настройки сброшены только локально');
                return defaultSettings;
            }

            const response = await api.post('/users/me/settings/reset');
            return response.data;
        } catch (error) {
            console.error('Ошибка сброса настроек пользователя:', error);
            return defaultSettings;
        }
    },

    /**
     * Обновить только часть настроек пользователя (конкретный раздел)
     * @param {String} section - Раздел настроек (map, ui, editor, privacy и т.д.)
     * @param {Object} values - Новые значения для раздела
     * @returns {Promise<Object>} Обновленные настройки
     */
    async updateSettingsSection(section, values) {
        try {
            // Сначала получаем текущие настройки
            const currentSettings = await this.getUserSettings();

            // Обновляем нужный раздел
            currentSettings[section] = {
                ...currentSettings[section],
                ...values
            };

            // Сохраняем обновленные настройки
            return await this.updateUserSettings(currentSettings);
        } catch (error) {
            console.error(`Ошибка обновления раздела ${section}:`, error);

            // Обновляем локальные настройки при ошибке
            try {
                const localSettings = this.getSettingsFromLocalStorage();
                localSettings[section] = {
                    ...localSettings[section],
                    ...values
                };
                localStorage.setItem('user_settings', JSON.stringify(localSettings));
                return localSettings;
            } catch (localError) {
                console.error('Ошибка обновления локальных настроек:', localError);
                return this.getDefaultSettings();
            }
        }
    },

    /**
     * Получить настройки по умолчанию
     * @returns {Object} Настройки по умолчанию
     */
    getDefaultSettings() {
        return {
            map: {
                units: "km",
                showGrid: false,
                defaultCity: "Saint Petersburg, Northwestern Federal District, Russia",
                defaultZoom: 13,
                defaultCoordinates: {
                    lat: 59.938784,
                    lng: 30.314997
                }
            },
            ui: {
                theme: 'light',
                fontSize: 'medium',
                language: 'ru'
            },
            editor: {
                defaultMarkerColor: '#FF5733',
                autoSave: 5 // автосохранение каждые 5 минут
            },
            privacy: {
                defaultMapPrivacy: 'private',
                defaultCollectionPrivacy: 'private'
            }
        };
    }
}; 