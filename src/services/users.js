import { api } from '../api';

/**
 * Получение списка пользователей
 * @param {number} skip - сколько пропустить
 * @param {number} limit - сколько получить
 * @returns {Promise} результат запроса
 */
export const getUsers = async (skip = 0, limit = 100) => {
    try {
        const response = await api.get(`/users?skip=${skip}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        throw error;
    }
};

/**
 * Получение данных пользователя по ID
 * @param {string} userId - ID пользователя
 * @returns {Promise} результат запроса
 */
export const getUserById = async (userId) => {
    try {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Ошибка получения пользователя с ID ${userId}:`, error);
        throw error;
    }
};

/**
 * Получение текущего пользователя (требует токен)
 * @returns {Promise} результат запроса
 */
export const getCurrentUser = async () => {
    try {
        // Получаем ID из токена (предполагается, что бэкенд возвращает такой эндпоинт)
        // В FastAPI коде этого эндпоинта нет, возможно придется его добавить на бэкенде
        const response = await api.get('/users/me');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения текущего пользователя:', error);
        throw error;
    }
}; 