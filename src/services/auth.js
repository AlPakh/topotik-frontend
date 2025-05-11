import { api, setAuthToken } from '../api';
import Cookies from 'js-cookie';

/**
 * Регистрация нового пользователя
 * @param {Object} userData - данные пользователя
 * @returns {Promise} результат запроса
 */
export const register = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        const { access_token, token_type, username } = response.data;

        // Сохраняем данные в cookies
        Cookies.set('access_token', access_token, { expires: 15 }); // 15 дней
        Cookies.set('token_type', token_type, { expires: 15 });
        Cookies.set('username', username, { expires: 15 });
        Cookies.set('email', userData.email, { expires: 15 });

        // Устанавливаем токен для всех запросов
        setAuthToken(access_token);

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
        const response = await api.post('/auth/login', {
            username: email,
            password: password
        });

        const { access_token, token_type, username, email: userEmail } = response.data;

        // Сохраняем данные в cookies
        Cookies.set('access_token', access_token, { expires: 15 }); // 15 дней
        Cookies.set('token_type', token_type, { expires: 15 });
        Cookies.set('username', username, { expires: 15 });
        Cookies.set('email', userEmail, { expires: 15 });

        // Устанавливаем токен для всех запросов
        setAuthToken(access_token);

        return response.data;
    } catch (error) {
        console.error('Ошибка входа:', error);
        console.error('Детали ошибки:', error.response?.data);

        if (error.response) {
            if (error.response.status === 401) {
                throw new Error('Неверный email или пароль');
            } else if (error.response.status === 500) {
                throw new Error('Ошибка сервера. Пожалуйста, попробуйте позже.');
            } else {
                throw new Error(error.response.data?.detail || 'Ошибка при входе');
            }
        }
        throw error;
    }
};

/**
 * Выход пользователя из системы
 */
export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    } finally {
        // Удаляем все cookies
        Cookies.remove('access_token');
        Cookies.remove('token_type');
        Cookies.remove('username');
        Cookies.remove('email');

        // Удаляем токен из заголовков запросов
        setAuthToken(null);
    }
};

/**
 * Проверка, авторизован ли пользователь
 * @returns {boolean} результат проверки
 */
export const isAuthenticated = () => {
    return !!Cookies.get('access_token');
};

/**
 * Получение имени пользователя
 * @returns {string} имя пользователя или 'Гость'
 */
export const getUsername = () => {
    return Cookies.get('username') || 'Гость';
};

/**
 * Получение email пользователя
 * @returns {string} email пользователя или пустая строка
 */
export const getUserEmail = () => {
    return Cookies.get('email') || '';
}; 