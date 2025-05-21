// src/mixins/markerOperations.js
// Миксин с общей логикой по работе с маркерами
import Cookies from 'js-cookie';
import L from 'leaflet';
import { API_URL } from '@/api';

export const markerOperationsMixin = {
    methods: {
        // Базовый метод создания маркера на сервере
        async createMarkerInCategory(latitude, longitude, categoryId, title = "Новая метка") {
            const mapId = this.$route.params.id;

            try {
                // Создаем маркер на сервере
                const markerResponse = await fetch(`${API_URL}/markers/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Cookies.get("access_token")}`
                    },
                    body: JSON.stringify({
                        latitude,
                        longitude,
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
            try {
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

                return response.ok;
            } catch (error) {
                console.error("Ошибка при удалении маркера:", error);
                return false;
            }
        }
    }
};