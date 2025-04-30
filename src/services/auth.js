import { api, setAuthToken } from '../api';

/**
 * Регистрация нового пользователя
 * @param {Object} userData - данные пользователя
 * @returns {Promise} результат запроса
 */
export const register = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw error;
    }
};

/**
 * Вход пользователя в систему
 * @param {string} email - email пользователя
 * @param {string} password - пароль пользователя
 * @returns {Promise} результат запроса с токеном
 */
export const login = async (email, password) => {
    try {
        const formData = new FormData();
        formData.append('username', email); // API ожидает username, но использует email
        formData.append('password', password);

        const response = await api.post('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, token_type } = response.data;

        // Сохраняем токен в localStorage
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token_type', token_type);

        // Устанавливаем токен для всех запросов
        setAuthToken(access_token);

        return response.data;
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw error;
    }
};

/**
 * Выход пользователя из системы
 */
export const logout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');

    // Удаляем токен из заголовков запросов
    setAuthToken(null);
};

/**
 * Проверка, авторизован ли пользователь
 * @returns {boolean} результат проверки
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
}; 