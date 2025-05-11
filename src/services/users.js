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
 * Получение данных текущего пользователя
 * @returns {Promise} результат запроса с данными пользователя
 */
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/users/me');
        return response.data;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        throw error;
    }
};

/**
 * Обновление данных пользователя
 * @param {Object} userData - данные для обновления (username, email, password)
 * @returns {Promise} результат запроса с обновленными данными
 */
export const updateUser = async (userData) => {
    try {
        const response = await api.put(`/users/me`, userData);
        return response.data;
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        throw error;
    }
};

/**
 * Проверка доступности email и username
 * @param {string} email - email для проверки
 * @param {string} username - имя пользователя для проверки
 * @returns {Promise} результат запроса с флагами существования
 */
export const checkAvailability = async (email, username) => {
    try {
        const response = await api.post('/users/check-availability', {
            email,
            username
        });
        return response.data;
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        throw error;
    }
}; 