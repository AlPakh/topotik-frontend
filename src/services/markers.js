import { api } from '../api';

/**
 * Получение списка маркеров для карты
 * @param {string} mapId - ID карты
 * @param {number} skip - сколько пропустить
 * @param {number} limit - сколько получить
 * @returns {Promise} результат запроса
 */
export const getMarkersByMap = async (mapId, skip = 0, limit = 100) => {
    try {
        console.log(`Запрос маркеров для карты ${mapId}`);
        const response = await api.get(`/markers?map_id=${mapId}&skip=${skip}&limit=${limit}`);
        console.log(`Получено ${response.data.length} маркеров для карты ${mapId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения маркеров для карты ${mapId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Получение маркера по ID
 * @param {string} markerId - ID маркера
 * @returns {Promise} результат запроса
 */
export const getMarkerById = async (markerId) => {
    try {
        console.log(`Запрос маркера по ID ${markerId}`);
        const response = await api.get(`/markers/${markerId}`);
        console.log(`Получен маркер: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения маркера с ID ${markerId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Создание нового маркера
 * @param {Object} markerData - данные маркера
 * @returns {Promise} результат запроса
 */
export const createMarker = async (markerData) => {
    try {
        console.log(`Создание маркера с данными: ${JSON.stringify(markerData)}`);

        // Проверка обязательных полей
        if (!markerData.latitude || !markerData.longitude) {
            console.error('Ошибка: отсутствуют обязательные поля (широта/долгота)');
            throw new Error('Отсутствуют обязательные поля координат');
        }

        if (!markerData.map_id) {
            console.warn('Предупреждение: отсутствует map_id для маркера');
        }

        // Форматирование данных перед отправкой
        const formattedData = {
            latitude: parseFloat(markerData.latitude),
            longitude: parseFloat(markerData.longitude),
            title: markerData.title || null,
            description: markerData.description || null,
            map_id: markerData.map_id || null
        };

        console.log(`Отформатированные данные для отправки: ${JSON.stringify(formattedData)}`);

        const response = await api.post('/markers/', formattedData);
        console.log(`Маркер успешно создан: ${JSON.stringify(response.data)}`);

        // Проверка, что в ответе есть ID маркера
        if (!response.data.marker_id) {
            console.warn('В ответе сервера отсутствует ID маркера');
        }

        return response.data;
    } catch (error) {
        console.error('Ошибка создания маркера:', error);
        if (error.response) {
            console.error('Статус ошибки:', error.response.status);
            console.error('Детали ошибки:', error.response.data);
            console.error('Заголовки ответа:', error.response.headers);
        } else if (error.request) {
            console.error('Запрос был отправлен, но ответ не получен', error.request);
        } else {
            console.error('Ошибка при настройке запроса:', error.message);
        }
        throw error;
    }
};

/**
 * Тестовая функция для создания маркера с минимальными данными
 * @param {string} mapId - ID карты для маркера 
 * @returns {Promise} результат запроса
 */
export const createTestMarker = async (mapId) => {
    try {
        console.log(`Создание тестового маркера для карты ${mapId}`);

        // Генерация случайных координат около центра Москвы
        const latitude = 55.7558 + (Math.random() - 0.5) * 0.1;
        const longitude = 37.6173 + (Math.random() - 0.5) * 0.1;

        const testMarkerData = {
            latitude: latitude,
            longitude: longitude,
            title: `Тестовый маркер ${new Date().toISOString()}`,
            description: `Создан автоматически для тестирования в ${new Date().toLocaleString()}`,
            map_id: mapId
        };

        console.log(`Данные тестового маркера: ${JSON.stringify(testMarkerData)}`);
        return await createMarker(testMarkerData);
    } catch (error) {
        console.error('Ошибка при создании тестового маркера:', error);
        throw error;
    }
};

/**
 * Обновление маркера
 * @param {string} markerId - ID маркера
 * @param {Object} markerData - новые данные маркера
 * @returns {Promise} результат запроса
 */
export const updateMarker = async (markerId, markerData) => {
    try {
        console.log(`Обновление маркера ${markerId} с данными: ${JSON.stringify(markerData)}`);
        const response = await api.put(`/markers/${markerId}`, markerData);
        console.log(`Маркер обновлен: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка обновления маркера с ID ${markerId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Удаление маркера
 * @param {string} markerId - ID маркера
 * @returns {Promise} результат запроса
 */
export const deleteMarker = async (markerId) => {
    try {
        console.log(`Удаление маркера ${markerId}`);
        const response = await api.delete(`/markers/${markerId}`);
        console.log(`Маркер удален: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка удаления маркера с ID ${markerId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
}; 