// Alert Service для управления уведомлениями

// Эта переменная будет доступна только внутри этого модуля
let alertAppInstance = null;

/**
 * Регистрирует экземпляр компонента AppAlert для управления уведомлениями
 * @param {Object} instance - Экземпляр компонента AppAlert
 */
export function registerAlertInstance(instance) {
    alertAppInstance = instance;
}

/**
 * Показывает уведомление с указанным сообщением
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции (type, duration)
 */
export function showAlert(message, options = {}) {
    if (alertAppInstance && alertAppInstance.addAlert) {
        alertAppInstance.addAlert(message, options);
    } else {
        console.warn('AlertService: AppAlert компонент не зарегистрирован');
        // Если компонент не был зарегистрирован, показываем стандартный alert
        alert(message);
    }
}

/**
 * Показывает уведомление об успехе
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции (duration)
 */
export function showSuccess(message, options = {}) {
    showAlert(message, { type: 'success', ...options });
}

/**
 * Показывает уведомление об ошибке
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции (duration)
 */
export function showError(message, options = {}) {
    showAlert(message, { type: 'error', ...options });
}

/**
 * Удаляет все активные уведомления
 */
export function clearAlerts() {
    if (alertAppInstance && alertAppInstance.alerts) {
        alertAppInstance.alerts.value = [];
    }
}

// Экспортируем объект с методами для удобства использования
export default {
    registerAlertInstance,
    showAlert,
    showSuccess,
    showError,
    clearAlerts
}; 