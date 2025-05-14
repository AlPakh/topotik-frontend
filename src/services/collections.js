import { api } from '../api';

/**
 * Получение списка коллекций
 * @param {number|string} skipOrMapId - сколько пропустить или ID карты
 * @param {number} limit - сколько получить
 * @param {string|null} mapId - ID карты (если первый параметр - это skip)
 * @returns {Promise} результат запроса
 */
export const getCollections = async (skipOrMapId = 0, limit = 100, mapId = null) => {
    try {
        // Проверяем, является ли первый параметр UUID (для обратной совместимости)
        // UUID обычно имеет формат 8-4-4-4-12 символов и содержит дефисы
        const isMapId = typeof skipOrMapId === 'string' && skipOrMapId.includes('-');
        const skip = isMapId ? 0 : skipOrMapId;
        const actualMapId = isMapId ? skipOrMapId : mapId;

        const url = actualMapId ?
            `/collections/?map_id=${actualMapId}&skip=${skip}&limit=${limit}` :
            `/collections/?skip=${skip}&limit=${limit}`;

        console.log(`Запрос коллекций с URL: ${url}`);
        const response = await api.get(url);
        console.log(`Получены коллекции: ${response.data.length} шт.`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения коллекций:', error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
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
        console.log(`Запрос коллекции с ID: ${collectionId}`);
        const response = await api.get(`/collections/${collectionId}`);
        console.log(`Получена коллекция: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения коллекции с ID ${collectionId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
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
        console.log(`Создание коллекции с данными: ${JSON.stringify(collectionData)}`);
        const response = await api.post('/collections/', collectionData);
        console.log(`Создана коллекция: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка создания коллекции:', error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
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
        console.log(`Обновление коллекции ${collectionId} с данными: ${JSON.stringify(collectionData)}`);
        const response = await api.put(`/collections/${collectionId}`, collectionData);
        console.log(`Обновлена коллекция: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка обновления коллекции с ID ${collectionId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
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
        console.log(`Удаление коллекции ${collectionId}`);
        const response = await api.delete(`/collections/${collectionId}`);
        console.log(`Удалена коллекция: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка удаления коллекции с ID ${collectionId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Получение маркеров для коллекции
 * @param {string} collectionId - ID коллекции
 * @returns {Promise} результат запроса
 */
export const getCollectionMarkers = async (collectionId) => {
    try {
        console.log(`Запрос маркеров для коллекции ${collectionId}`);
        const response = await api.get(`/collections/${collectionId}/markers`);
        console.log(`Получены маркеры коллекции: ${response.data.length} шт.`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка при загрузке маркеров для коллекции ${collectionId}: ${error.response?.status}`);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Добавление маркера в коллекцию
 * @param {string} collectionId - ID коллекции
 * @param {string} markerId - ID маркера
 * @returns {Promise} результат запроса
 */
export const addMarkerToCollection = async (collectionId, markerId) => {
    try {
        console.log(`Добавление маркера ${markerId} в коллекцию ${collectionId}`);
        const response = await api.post(`/collections/${collectionId}/markers`, { marker_id: markerId });
        console.log(`Маркер добавлен в коллекцию: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка при добавлении маркера ${markerId} в коллекцию ${collectionId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Удаление маркера из коллекции
 * @param {string} collectionId - ID коллекции
 * @param {string} markerId - ID маркера
 * @returns {Promise} результат запроса
 */
export const removeMarkerFromCollection = async (collectionId, markerId) => {
    try {
        console.log(`Удаление маркера ${markerId} из коллекции ${collectionId}`);
        const response = await api.delete(`/collections/${collectionId}/markers/${markerId}`);
        console.log(`Маркер удален из коллекции: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка при удалении маркера ${markerId} из коллекции ${collectionId}:`, error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Сообщение ошибки:', error.response?.data);
        throw error;
    }
};

/**
 * Перемещение маркера между коллекциями в одной транзакции
 * 
 * @param {string} sourceCollectionId - ID исходной коллекции
 * @param {string} markerId - ID маркера
 * @param {string} targetCollectionId - ID целевой коллекции
 * @returns {Promise<Object>} - Результат операции
 */
export const moveMarkerBetweenCollections = async (sourceCollectionId, markerId, targetCollectionId) => {
    try {
        console.log(`Перемещение маркера ${markerId} из коллекции ${sourceCollectionId} в коллекцию ${targetCollectionId}`);
        const response = await api.post(`/collections/${sourceCollectionId}/move_marker/${markerId}/to/${targetCollectionId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка при перемещении маркера ${markerId} из коллекции ${sourceCollectionId} в коллекцию ${targetCollectionId}:`, error);
        throw error;
    }
}; 