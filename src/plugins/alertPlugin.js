import alertService from '@/services/alertService';

/**
 * Плагин для Vue, который заменяет глобальный window.alert на стилизованное уведомление
 */
export default {
    install(app) {
        // Сохраняем оригинальную функцию alert
        const originalAlert = window.alert;

        // Переопределяем глобальную функцию alert
        window.alert = function (message) {
            alertService.showAlert(message);
        };

        // Добавляем методы в глобальный $alert, чтобы использовать в компонентах
        app.config.globalProperties.$alert = {
            show: alertService.showAlert,
            success: alertService.showSuccess,
            error: alertService.showError,
            clear: alertService.clearAlerts
        };

        // Также предоставляем возможность восстановить оригинальный alert
        app.config.globalProperties.$alert.restoreOriginal = function () {
            window.alert = originalAlert;
        };
    }
}; 