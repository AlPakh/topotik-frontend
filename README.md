# topotik-frontend

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Настройка окружения

Проект использует переменные окружения для конфигурации. Создайте файлы с соответствующими переменными:

### Для локальной разработки (.env или .env.development):
```
VUE_APP_API_URL=http://localhost:8000
```

### Для продакшена (.env.production):
```
VUE_APP_API_URL=https://topotik-backend.onrender.com
```

Эти настройки позволят вам гибко переключаться между локальной разработкой и продакшн-окружением.
