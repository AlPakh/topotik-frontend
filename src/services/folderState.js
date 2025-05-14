/**
 * Сервис для управления состоянием папок
 * Сохраняет состояние папок в cookies и предоставляет методы для работы с этим состоянием
 */

const COOKIE_EXPANDED_FOLDERS = 'topotik_expandedFolders';
const COOKIE_LAST_FOLDER = 'topotik_lastFolder';
const COOKIE_EXPIRATION_DAYS = 1; // Срок жизни cookie - 1 день

/**
 * Сохраняет массив в cookie
 * @param {string} name - Имя cookie
 * @param {Array} value - Значение для сохранения
 * @param {number} days - Срок хранения в днях
 */
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=/";
}

/**
 * Получает значение из cookie
 * @param {string} name - Имя cookie
 * @returns {Array|Object|null} - Распарсенное значение или null, если cookie не найден
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            try {
                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
            } catch (e) {
                console.error('Ошибка при парсинге cookie:', e);
                return null;
            }
        }
    }
    return null;
}

/**
 * Сохраняет список развернутых папок
 * @param {Array} folderIds - Массив идентификаторов открытых папок
 */
export function saveExpandedFolders(folderIds) {
    setCookie(COOKIE_EXPANDED_FOLDERS, folderIds, COOKIE_EXPIRATION_DAYS);
}

/**
 * Получает список развернутых папок
 * @returns {Array} - Массив идентификаторов открытых папок
 */
export function getExpandedFolders() {
    return getCookie(COOKIE_EXPANDED_FOLDERS) || [];
}

/**
 * Сохраняет последнюю открытую папку
 * @param {Object} folderInfo - Информация о папке (id, name, type)
 */
export function saveLastOpenedFolder(folderInfo) {
    setCookie(COOKIE_LAST_FOLDER, folderInfo, COOKIE_EXPIRATION_DAYS);
}

/**
 * Получает информацию о последней открытой папке
 * @returns {Object|null} - Информация о папке или null
 */
export function getLastOpenedFolder() {
    return getCookie(COOKIE_LAST_FOLDER);
}

export default {
    saveExpandedFolders,
    getExpandedFolders,
    saveLastOpenedFolder,
    getLastOpenedFolder
}; 