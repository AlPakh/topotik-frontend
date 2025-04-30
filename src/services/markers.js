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
        const response = await api.get(`/markers?map_id=${mapId}&skip=${skip}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения маркеров для карты ${mapId}:`, error);
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
        const response = await api.get(`/markers/${markerId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения маркера с ID ${markerId}:`, error);
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
        const response = await api.post('/markers', markerData);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания маркера:', error);
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
        const response = await api.put(`/markers/${markerId}`, markerData);
        return response.data;
    } catch (error) {
        console.error(`Ошибка обновления маркера с ID ${markerId}:`, error);
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
        const response = await api.delete(`/markers/${markerId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка удаления маркера с ID ${markerId}:`, error);
        throw error;
    }
}; 