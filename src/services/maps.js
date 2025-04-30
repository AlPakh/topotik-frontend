import { api } from '../api';

/**
 * Получение списка карт
 * @param {number} skip - сколько пропустить
 * @param {number} limit - сколько получить
 * @returns {Promise} результат запроса
 */
export const getMaps = async (skip = 0, limit = 100) => {
    try {
        const response = await api.get(`/maps?skip=${skip}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения карт:', error);
        throw error;
    }
};

/**
 * Получение карты по ID
 * @param {string} mapId - ID карты
 * @returns {Promise} результат запроса
 */
export const getMapById = async (mapId) => {
    try {
        const response = await api.get(`/maps/${mapId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения карты с ID ${mapId}:`, error);
        throw error;
    }
};

/**
 * Создание новой карты
 * @param {Object} mapData - данные карты
 * @returns {Promise} результат запроса
 */
export const createMap = async (mapData) => {
    try {
        const response = await api.post('/maps', mapData);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания карты:', error);
        throw error;
    }
};

/**
 * Обновление карты
 * @param {string} mapId - ID карты
 * @param {Object} mapData - новые данные карты
 * @returns {Promise} результат запроса
 */
export const updateMap = async (mapId, mapData) => {
    try {
        const response = await api.put(`/maps/${mapId}`, mapData);
        return response.data;
    } catch (error) {
        console.error(`Ошибка обновления карты с ID ${mapId}:`, error);
        throw error;
    }
};

/**
 * Удаление карты
 * @param {string} mapId - ID карты
 * @returns {Promise} результат запроса
 */
export const deleteMap = async (mapId) => {
    try {
        const response = await api.delete(`/maps/${mapId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка удаления карты с ID ${mapId}:`, error);
        throw error;
    }
}; 