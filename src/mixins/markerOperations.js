// src/mixins/markerOperations.js
// Миксин с общей логикой по работе с маркерами
import Cookies from 'js-cookie';
import L from 'leaflet';
import { API_URL } from '@/api';

export const markerOperationsMixin = {
    methods: {
        /**
         * Подготовка координат для сохранения в базе данных
         * Форматирует координаты в требуемый формат БД (numeric(9, 6))
         * @param {number} latitude - широта
         * @param {number} longitude - долгота
         * @returns {Object} - форматированные координаты {latitude, longitude}
         */
        normalizeCoordinates(latitude, longitude) {
            // Просто форматируем координаты в нужный формат для БД
            // без масштабирования и преобразования
            return {
                latitude: parseFloat(parseFloat(latitude).toFixed(6)),
                longitude: parseFloat(parseFloat(longitude).toFixed(6))
            };
        },

        /**
         * Преобразует строковые координаты из БД в числовые значения
         * Учитывает возможные различия в форматировании (запятые/точки)
         * @param {string|number} lat - широта из БД
         * @param {string|number} lng - долгота из БД
         * @returns {Array} - массив координат [lat, lng]
         */
        parseDbCoordinates(lat, lng) {
            // Обрабатываем случай, когда координаты могут быть строками с запятой вместо точки
            const parseCoord = (coord) => {
                if (typeof coord === 'string') {
                    // Заменяем запятую на точку, если она есть
                    return parseFloat(coord.replace(',', '.'));
                }
                return parseFloat(coord);
            };

            return [parseCoord(lat), parseCoord(lng)];
        },

        // Базовый метод создания маркера на сервере
        async createMarkerInCategory(latitude, longitude, categoryId, title = "Новая метка") {
            const mapId = this.$route.params.id;

            try {
                // Форматируем координаты для сохранения в БД
                const formattedCoords = this.normalizeCoordinates(latitude, longitude);
                console.log("Форматированные координаты для БД:", formattedCoords);

                // Создаем маркер на сервере
                const markerResponse = await fetch(`${API_URL}/markers/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Cookies.get("access_token")}`
                    },
                    body: JSON.stringify({
                        latitude: formattedCoords.latitude,
                        longitude: formattedCoords.longitude,
                        title,
                        description: "",
                        map_id: mapId
                    })
                });

                if (!markerResponse.ok) {
                    throw new Error(`Ошибка при создании маркера: ${markerResponse.status}`);
                }

                const newMarker = await markerResponse.json();

                // Добавляем маркер в коллекцию
                const addToCollectionResponse = await fetch(
                    `${API_URL}/collections/${categoryId}/markers`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Cookies.get("access_token")}`
                        },
                        body: JSON.stringify({
                            marker_id: newMarker.marker_id
                        })
                    }
                );

                if (!addToCollectionResponse.ok) {
                    console.warn(`Не удалось добавить маркер ${newMarker.marker_id} в коллекцию ${categoryId}`);
                }

                return newMarker;
            } catch (error) {
                console.error("Ошибка при создании маркера:", error);
                throw error;
            }
        },

        // Метод создания маркера на карте Leaflet
        createLeafletMarker(position, markerData, category) {
            // Создаем SVG-маркер с цветом категории
            const markerSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
          <path fill="${category.color}" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 32 16 32s16-23.2 16-32C32 7.2 24.8 0 16 0z"/>
          <circle fill="white" cx="16" cy="16" r="8"/>
        </svg>
      `;

            const customIcon = L.divIcon({
                className: "custom-map-marker",
                html: markerSvg,
                iconSize: [32, 48],
                iconAnchor: [16, 48]
            });

            // Создаем маркер
            const marker = L.marker(position, {
                icon: customIcon,
                interactive: true,
                zIndexOffset: position[0] * 10,
                riseOnHover: false,
                riseOffset: 0
            });

            // Добавляем маркер на карту
            marker.addTo(this.map);

            // Добавляем тултип при наведении
            marker.on("mouseover", (e) => {
                try {
                    const popup = L.popup({
                        className: "marker-tooltip",
                        offset: [0, -48],
                        closeButton: false,
                        autoClose: true,
                        closeOnEscapeKey: false,
                        closeOnClick: false,
                    })
                        .setLatLng(e.target.getLatLng())
                        .setContent(markerData.name)
                        .openOn(this.map);

                    marker.bindPopup(popup);
                } catch (err) {
                    console.warn("Ошибка при создании попапа:", err);
                }
            });

            // Закрываем попап при уходе мыши
            marker.on("mouseout", () => {
                try {
                    this.map.closePopup();
                } catch (err) {
                    console.warn("Ошибка при закрытии попапа:", err);
                }
            });

            // Обработчик клика
            marker.on("click", () => {
                try {
                    this.map.closePopup();
                    this.openMarkerDetails(markerData, category);
                } catch (err) {
                    console.warn("Ошибка при обработке клика на маркер:", err);
                }
            });

            // Сохраняем маркер
            this.leafletMarkers[markerData.id] = marker;

            return marker;
        },

        // Метод удаления маркера с сервера
        async deleteMarkerFromServer(markerId) {
            if (!markerId) {
                console.error("Ошибка: ID маркера не определен");
                return false;
            }

            // Проверка на локальные маркеры (начинаются с "local_")
            if (typeof markerId === 'string' && markerId.startsWith('local_')) {
                console.log(`Удаление локального маркера ${markerId}`);
                return true; // Для локальных маркеров не нужно обращаться к серверу
            }

            try {
                // Проверяем, что markerId действительно относится к маркеру, а не к коллекции
                try {
                    const checkResponse = await fetch(`${API_URL}/markers/${markerId}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Cookies.get("access_token")}`
                        }
                    });

                    if (!checkResponse.ok) {
                        console.error(`Ошибка: ID ${markerId} не найден как маркер (статус ${checkResponse.status})`);
                        return false;
                    }
                } catch (checkError) {
                    console.error(`Ошибка при проверке маркера ${markerId}:`, checkError);
                    return false;
                }

                // Сначала удаляем маркер из всех коллекций
                const mapId = this.$route.params.id;

                const collectionsResponse = await fetch(
                    `${API_URL}/collections?map_id=${mapId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Cookies.get("access_token")}`
                        }
                    }
                );

                if (!collectionsResponse.ok) {
                    throw new Error(`Ошибка при получении коллекций: ${collectionsResponse.status}`);
                }

                const collections = await collectionsResponse.json();

                // Удаляем маркер из каждой коллекции
                for (const collection of collections) {
                    try {
                        // Проверяем, не пытаемся ли мы использовать ID коллекции как ID маркера
                        if (collection.collection_id === markerId) {
                            console.error(`Ошибка: попытка удалить маркер с ID, совпадающим с ID коллекции: ${markerId}`);
                            continue;
                        }

                        await fetch(
                            `${API_URL}/collections/${collection.collection_id}/markers/${markerId}`,
                            {
                                method: "DELETE",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${Cookies.get("access_token")}`
                                }
                            }
                        );
                    } catch (collectionError) {
                        console.warn(`Не удалось удалить маркер из коллекции ${collection.collection_id}:`, collectionError);
                    }
                }

                // Удаляем сам маркер
                const response = await fetch(`${API_URL}/markers/${markerId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Cookies.get("access_token")}`
                    }
                });

                if (response.ok) {
                    console.log(`Маркер ${markerId} успешно удален с сервера`);
                    return true;
                } else {
                    console.error(`Ошибка при удалении маркера ${markerId}: ${response.status}`);
                    return false;
                }
            } catch (error) {
                console.error("Ошибка при удалении маркера:", error);
                return false;
            }
        }
    }
};