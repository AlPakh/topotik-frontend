import { api, setAuthToken } from '../api';
import Cookies from 'js-cookie';

/**
 * Регистрация нового пользователя
 * @param {Object} userData - данные пользователя
 * @returns {Promise} результат запроса
 */
export const register = async (userData) => {
    try {
        console.log('Отправляем запрос на регистрацию:', userData);
        const response = await api.post('/auth/register', userData);
        console.log('Получен ответ с сервера после регистрации:', response.data);
        const { access_token, token_type, username } = response.data;

        console.log('Извлеченные данные из ответа:', {
            access_token: access_token ? `${access_token.substring(0, 10)}...` : 'отсутствует',
            token_type,
            username
        });

        // Сохраняем данные в cookies
        Cookies.set('access_token', access_token, { expires: 15 }); // 15 дней
        Cookies.set('token_type', token_type, { expires: 15 });
        Cookies.set('username', username, { expires: 15 });
        Cookies.set('email', userData.email, { expires: 15 });

        console.log('Токен сохранен в cookies:', {
            cookie_token: Cookies.get('access_token') ? `${Cookies.get('access_token').substring(0, 10)}...` : 'отсутствует',
            cookie_type: Cookies.get('token_type')
        });

        // Устанавливаем токен для всех запросов
        setAuthToken(access_token);
        console.log('Заголовок Authorization установлен:',
            api.defaults.headers.common['Authorization'] ?
                `${api.defaults.headers.common['Authorization'].substring(0, 20)}...` :
                'отсутствует'
        );

        // Небольшая задержка для применения токена
        await new Promise(resolve => setTimeout(resolve, 100));

        return response.data;
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw error;
    }
};

/**
 * Автоматический вход после регистрации
 * Гарантирует, что токен применится для всех запросов
 * @returns {Promise} результат проверки и применения токена
 */
export const autoLoginAfterRegister = async () => {
    const token = Cookies.get('access_token');
    console.log('autoLoginAfterRegister - токен из cookie:', token ? `${token.substring(0, 10)}...` : 'отсутствует');

    if (token) {
        // Текущее состояние заголовка до обновления
        console.log('autoLoginAfterRegister - текущий заголовок:',
            api.defaults.headers.common['Authorization'] ?
                `${api.defaults.headers.common['Authorization'].substring(0, 20)}...` :
                'отсутствует'
        );

        // Повторно применяем токен для всех запросов
        setAuthToken(token);

        // Проверяем, что токен применен
        if (api.defaults.headers.common['Authorization'] !== `Bearer ${token}`) {
            console.log('autoLoginAfterRegister - заголовок отличается от ожидаемого, принудительно устанавливаем');
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        // Выводим итоговое значение заголовка
        console.log('autoLoginAfterRegister - итоговый заголовок:',
            api.defaults.headers.common['Authorization'] ?
                `${api.defaults.headers.common['Authorization'].substring(0, 20)}...` :
                'отсутствует'
        );

        return true;
    }
    console.warn('autoLoginAfterRegister - токен не найден в cookie');
    return false;
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