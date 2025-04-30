import { api } from '../api';

/**
 * Получение списка коллекций
 * @param {number} skip - сколько пропустить
 * @param {number} limit - сколько получить
 * @returns {Promise} результат запроса
 */
export const getCollections = async (skip = 0, limit = 100) => {
    try {
        const response = await api.get(`/collections?skip=${skip}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения коллекций:', error);
        throw error;
    }
};

/**
 * Получение коллекции по ID
 * @param {string} collectionId - ID коллекции
 * @returns {Promise} результат запроса
 */
export const getCollectionById = async (collectionId) => {
    try {
        const response = await api.get(`/collections/${collectionId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения коллекции с ID ${collectionId}:`, error);
        throw error;
    }
};

/**
 * Создание новой коллекции
 * @param {Object} collectionData - данные коллекции
 * @returns {Promise} результат запроса
 */
export const createCollection = async (collectionData) => {
    try {
        const response = await api.post('/collections', collectionData);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания коллекции:', error);
        throw error;
    }
};

/**
 * Обновление коллекции
 * @param {string} collectionId - ID коллекции
 * @param {Object} collectionData - новые данные коллекции
 * @returns {Promise} результат запроса
 */
export const updateCollection = async (collectionId, collectionData) => {
    try {
        const response = await api.put(`/collections/${collectionId}`, collectionData);
        return response.data;
    } catch (error) {
        console.error(`Ошибка обновления коллекции с ID ${collectionId}:`, error);
        throw error;
    }
};

/**
 * Удаление коллекции
 * @param {string} collectionId - ID коллекции
 * @returns {Promise} результат запроса
 */
export const deleteCollection = async (collectionId) => {
    try {
        const response = await api.delete(`/collections/${collectionId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка удаления коллекции с ID ${collectionId}:`, error);
        throw error;
    }
}; 