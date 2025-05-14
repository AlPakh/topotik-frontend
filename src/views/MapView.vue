<template>
  <div class="app-container">
    <AppHeader />

    <div class="map-container">
      <div class="map-sidebar">
        <div class="sidebar-header">
          <h3>{{ mapName }}</h3>
        </div>

        <div class="marker-categories">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category"
          >
            <div class="category-header" :style="{ color: category.color }">
              <span class="toggle-icon" @click="toggleCategory(category)">
                <div
                  class="arrow-icon"
                  :class="{ 'arrow-down': category.expanded }"
                >
                  <img src="@/assets/svg/arrow.svg" alt="Arrow" />
                </div>
              </span>
              <span class="category-name">{{ category.name }}</span>
              <span
                class="visibility-toggle"
                @click="toggleCategoryVisibility(category)"
              >
                <span v-if="category.visible">👁️</span>
                <span v-else>👁️‍🗨️</span>
              </span>
              <button
                class="dots-button"
                @click="showCategoryMenu(category, $event)"
              >
                ⋮
              </button>
            </div>

            <div v-if="category.expanded" class="markers-list">
              <div
                v-for="marker in category.markers"
                :key="marker.id"
                class="marker-item"
                :style="{ borderLeftColor: category.color }"
                draggable="true"
                @dragstart="onMarkerDragStart($event, marker, category)"
                @dragover.prevent
                @dragenter.prevent="dragEnterMarker = marker.id"
                @dragleave="dragEnterMarker = null"
                :class="{ 'drag-over': dragEnterMarker === marker.id }"
                @drop="onMarkerDrop($event, marker, category)"
              >
                <span class="marker-name">{{ marker.name }}</span>
                <span
                  class="visibility-toggle"
                  @click="toggleMarkerVisibility(marker)"
                >
                  <span v-if="marker.visible">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </span>
                <button
                  class="dots-button"
                  @click="showMarkerMenu(marker, category, $event)"
                >
                  ⋮
                </button>
              </div>

              <!-- Область для перетаскивания метки в пустую категорию -->
              <div
                v-if="category.markers.length === 0"
                class="empty-category-drop"
                @dragover.prevent
                @dragenter.prevent="dragEnterCategory = category.id"
                @dragleave="dragEnterCategory = null"
                :class="{ 'drag-over': dragEnterCategory === category.id }"
                @drop="onCategoryDrop($event, category)"
              >
                Перетащите сюда метку
              </div>
            </div>
          </div>
        </div>

        <div class="create-btn-container">
          <button class="create-btn" @click="showCreatePanel = true">
            Создать
          </button>
        </div>
      </div>

      <div class="map-view">
        <div id="map" class="map-container" ref="mapContainer"></div>

        <!-- Панель создания элементов -->
        <div v-if="showCreatePanel" class="create-overlay">
          <div class="create-panel-wrapper">
            <div class="panel-header">
              <h3>Создать элемент на карте</h3>
              <button class="close-button" @click="showCreatePanel = false">
                &times;
              </button>
            </div>

            <div class="create-options">
              <div class="create-option" @click="createCategory">
                <div class="option-icon">📁</div>
                <div class="option-title">Категория меток</div>
                <div class="option-description">Создать новую группу меток</div>
              </div>

              <div class="create-option" @click="createMarker">
                <div class="option-icon">📍</div>
                <div class="option-title">Метка на карте</div>
                <div class="option-description">
                  Создать метку в выбранной категории
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Редактор метки -->
        <marker-editor
          v-if="showMarkerEditor"
          :marker="currentMarker"
          :category="currentCategory"
          @save="saveMarkerChanges"
          @close="showMarkerEditor = false"
        />

        <!-- Универсальное контекстное меню -->
        <context-menu
          v-if="showContextMenu"
          :show="showContextMenu"
          :position="menuPosition"
          :items="contextMenuItems"
          @select="handleMenuAction"
          @close="showContextMenu = false"
          :autoClose="true"
          :closeDelay="300"
        />

        <!-- Редактор цвета коллекции -->
        <edit-collection-color
          v-if="showColorEditor"
          :collection="currentCategory"
          @close="showColorEditor = false"
          @update="onCollectionColorUpdated"
        />

        <!-- Диалог подтверждения удаления -->
        <div v-if="showDeleteConfirmation" class="confirmation-dialog-overlay">
          <div class="confirmation-dialog">
            <h3>Подтверждение удаления</h3>
            <p>{{ confirmationMessage }}</p>
            <div class="confirmation-input">
              <label
                >Для подтверждения введите "{{ itemToDelete.name }}":</label
              >
              <input v-model="confirmationInput" type="text" />
            </div>
            <div class="dialog-actions">
              <button
                @click="confirmDeleteAction"
                :disabled="confirmationInput !== itemToDelete.name"
                class="danger-button"
              >
                Удалить
              </button>
              <button @click="cancelDelete" class="cancel-button">
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerEditor from "@/components/MarkerEditor.vue";
import AppHeader from "@/components/AppHeader.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import EditCollectionColor from "@/components/EditCollectionColor.vue";
import { settingsService } from "@/services/settings";
import { getMapById } from "@/services/maps";
import Cookies from "js-cookie";
import { moveMarkerBetweenCollections } from "@/services/collections";
import { getCollections } from "@/services/collections";
import { removeMarkerFromCollection } from "@/services/collections";
import { api } from "@/api";

// Определение URL API сервера
const API_URL = "http://localhost:8000";

export default {
  name: "MapView",
  components: {
    MarkerEditor,
    AppHeader,
    ContextMenu,
    EditCollectionColor,
  },
  data() {
    return {
      map: null,
      mapName: this.$route.query.name || "Карта без названия",
      categories: [],
      leafletMarkers: {},
      showCreatePanel: false,
      showContextMenu: false,
      showDeleteConfirmation: false,
      menuPosition: { x: 0, y: 0 },
      contextMenuItems: [],
      activeItem: null,
      activeItemIndex: null,
      itemToDelete: null,
      confirmationMessage: "",
      confirmationInput: "",
      pendingMarkerCategory: null,
      currentMarker: null,
      currentCategory: null,
      showMarkerEditor: false,
      hoveredBlockIndex: null,
      dragOverIndex: null,
      draggingBlockIndex: null,
      showBlockTypeMenu: false,
      blockTypeMenuIndex: null,
      blockTypeMenuPosition: { top: "0px", left: "0px" },
      dragEnterCategory: null,
      dragEnterMarker: null,
      showColorEditor: false,
      selectedContextType: null,
    };
  },
  created() {
    // Получаем название карты из параметров маршрута
    if (this.$route.query.name) {
      this.mapName = this.$route.query.name;
    } else {
      this.mapName = "Карта #" + this.$route.params.id;
    }
  },
  mounted() {
    this.initMap();
    this.loadMapData();

    // Обработчик клика вне контекстного меню
    document.addEventListener("click", this.handleOutsideClick);
  },
  beforeUnmount() {
    try {
      // Закрываем все тултипы
      this.closeAllTooltips();

      // Удаляем все маркеры
      Object.values(this.leafletMarkers).forEach((marker) => {
        if (marker && marker.getTooltip) {
          try {
            if (marker.getTooltip()) {
              marker.closeTooltip();
              marker.unbindTooltip();
            }
            this.map.removeLayer(marker);
          } catch (e) {
            console.warn("Ошибка при удалении маркера:", e);
          }
        }
      });

      // Удаляем обработчики событий
      if (this.map) {
        this.map.off("click", this.onMapClick);
        this.map.off("zoomstart", this.closeAllTooltips);
        this.map.off("moveend", this.closeAllTooltips);
        document.removeEventListener("click", this.handleOutsideClick);

        // Уничтожаем карту
        this.map.remove();
      }
    } catch (e) {
      console.error("Ошибка при уничтожении карты:", e);
    }
  },
  methods: {
    async initMap() {
      try {
        // Проверяем тип карты
        const mapId = this.$route.params.id;
        try {
          const mapDetails = await getMapById(mapId);

          // Если это пользовательская карта, показываем сообщение
          if (mapDetails && mapDetails.map_type === "custom_image") {
            // Создаем контейнер для сообщения
            const mapContainer = document.getElementById("map");
            if (mapContainer) {
              mapContainer.innerHTML = `
                <div class="custom-map-unavailable">
                  <h3>Пользовательские карты временно недоступны</h3>
                  <p>Эта функция находится в разработке и будет доступна в ближайшее время.</p>
                </div>
              `;

              // Устанавливаем стили для контейнера
              mapContainer.style.display = "flex";
              mapContainer.style.justifyContent = "center";
              mapContainer.style.alignItems = "center";
              mapContainer.style.backgroundColor = "#f5f5f5";
              mapContainer.style.padding = "20px";
              mapContainer.style.textAlign = "center";

              // Не инициализируем карту OSM
              return;
            }
          }

          // Продолжаем инициализацию для карт OSM
          this.mapName = mapDetails.title || "Карта без названия";
        } catch (err) {
          console.warn("Не удалось получить данные карты:", err);
        }

        // Получаем настройки пользователя для карты
        let mapCenter = [55.7558, 37.6173]; // Москва по умолчанию
        let zoomLevel = 13;

        try {
          // Сначала пробуем получить настройки с сервера
          const userSettings = await settingsService.getUserSettings();

          if (
            userSettings &&
            userSettings.map &&
            userSettings.map.defaultCoordinates
          ) {
            mapCenter = [
              userSettings.map.defaultCoordinates.lat,
              userSettings.map.defaultCoordinates.lng,
            ];
            zoomLevel = userSettings.map.defaultZoom || 13;
          }
        } catch (err) {
          console.warn(
            "Не удалось получить настройки пользователя с сервера:",
            err
          );

          // Пробуем получить из localStorage
          const localSettings = localStorage.getItem("user_settings");
          if (localSettings) {
            try {
              const userSettings = JSON.parse(localSettings);
              if (
                userSettings &&
                userSettings.map &&
                userSettings.map.defaultCoordinates
              ) {
                mapCenter = [
                  userSettings.map.defaultCoordinates.lat,
                  userSettings.map.defaultCoordinates.lng,
                ];
                zoomLevel = userSettings.map.defaultZoom || 13;
                console.log("Используем настройки из localStorage:", mapCenter);
              }
            } catch (localError) {
              console.warn(
                "Ошибка при чтении настроек из localStorage:",
                localError
              );
            }
          }
        }

        // Инициализация карты Leaflet с полностью отключенной анимацией
        this.map = L.map("map", {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          preferCanvas: true,
          doubleClickZoom: false,
          // Разрешаем масштабирование колесиком мыши
          scrollWheelZoom: true,
          // Настраиваем, чтобы события колесика мыши работали корректно
          wheelPxPerZoomLevel: 120,
          wheelDebounceTime: 40,
          // Разрешаем масштабирование даже если body имеет overflow: hidden
          inertia: true,
          inertiaDeceleration: 3000,
        }).setView(mapCenter, zoomLevel);

        // Добавляем тайловый слой без привязки к событию load
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(this.map);

        // Обработчик клика для создания меток
        this.map.on("click", this.onMapClick);

        // Добавляем кнопки масштабирования руками
        const zoomControl = new L.Control.Zoom({
          position: "topleft",
          zoomInTitle: "Увеличить",
          zoomOutTitle: "Уменьшить",
        });
        zoomControl.addTo(this.map);

        // Настраиваем предварительное закрытие всех тултипов перед масштабированием
        this.map.on("zoomstart", () => {
          try {
            this.closeAllTooltips();
          } catch (e) {
            console.warn("Ошибка при обработке события zoomstart:", e);
          }
        });

        // Обработчик окончания масштабирования для перерисовки маркеров
        this.map.on("zoomend", () => {
          try {
            // Перерисовываем маркеры с небольшой задержкой
            setTimeout(() => this.renderMarkers(), 100);
          } catch (e) {
            console.warn("Ошибка при обработке события zoomend:", e);
          }
        });

        // Ставим таймер для перерисовки маркеров при полной инициализации
        setTimeout(() => {
          try {
            this.renderMarkers();
          } catch (e) {
            console.error("Ошибка при отрисовке маркеров:", e);
          }
        }, 1000);
      } catch (e) {
        console.error("Ошибка при инициализации карты:", e);
      }
    },

    handleMouseMove() {
      // Добавляем дебаунс для предотвращения частых вызовов
      clearTimeout(this._mouseMoveTimeout);
      this._mouseMoveTimeout = setTimeout(() => {
        try {
          if (this.map) {
            // Ничего не делаем - просто оставляем для обработки движения мыши
          }
        } catch (e) {
          console.warn("Ошибка при обработке движения мыши:", e);
        }
      }, 50);
    },

    closeAllTooltips() {
      // Закрываем все тултипы перед масштабированием
      if (!this.map) return;

      try {
        Object.values(this.leafletMarkers).forEach((marker) => {
          if (marker && marker.getTooltip) {
            try {
              if (marker.getTooltip()) {
                marker.closeTooltip();
              }
            } catch (e) {
              console.warn("Ошибка при закрытии тултипа:", e);
            }
          }
        });
      } catch (e) {
        console.warn("Ошибка в closeAllTooltips:", e);
      }
    },

    loadMapData() {
      try {
        const mapId = this.$route.params.id;

        // Загружаем коллекции маркеров для этой карты
        this.loadCollectionsFromServer(mapId);
      } catch (e) {
        console.error("Ошибка при загрузке данных карты:", e);
      }
    },

    async loadCollectionsFromServer(mapId) {
      try {
        // Загружаем коллекции для карты с сервера
        const response = await fetch(`${API_URL}/collections?map_id=${mapId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка при загрузке коллекций: ${response.status}`);
        }

        const collections = await response.json();

        // Преобразуем коллекции в категории для отображения
        this.categories = [];

        // Для каждой коллекции загружаем маркеры
        for (const collection of collections) {
          // Используем цвет коллекции из БД или генерируем случайный, если его нет
          const collectionColor =
            collection.collection_color || this.generateRandomColor();

          // Создаем категорию
          const category = {
            id: collection.collection_id,
            name: collection.title,
            color: collectionColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          try {
            // Загружаем маркеры для коллекции
            const markersResponse = await fetch(
              `${API_URL}/collections/${collection.collection_id}/markers`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Cookies.get("access_token")}`,
                },
              }
            );

            if (!markersResponse.ok) {
              console.error(
                `Ошибка при загрузке маркеров для коллекции ${collection.collection_id}: ${markersResponse.status}`
              );
              // Добавляем категорию даже без маркеров
              this.categories.push(category);
              continue;
            }

            const markers = await markersResponse.json();

            // Преобразуем маркеры в формат для отображения
            for (const marker of markers) {
              // Загружаем статью для маркера
              let blocks = [
                { type: "text", content: marker.description || "" },
              ];
              let markdownContent = marker.description || "";

              try {
                const articleResponse = await fetch(
                  `${API_URL}/markers/${marker.marker_id}/article`,
                  {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                  }
                );

                if (articleResponse.ok) {
                  const article = await articleResponse.json();
                  if (article && article.markdown_content) {
                    markdownContent = article.markdown_content;
                    blocks = this.markdownToBlocks(markdownContent);
                  }
                }
              } catch (articleError) {
                console.warn(
                  `Не удалось загрузить статью для маркера ${marker.marker_id}:`,
                  articleError
                );
              }

              category.markers.push({
                id: marker.marker_id,
                name: marker.title || "Метка без названия",
                visible: true,
                position: [marker.latitude, marker.longitude],
                blocks: blocks,
                markdownContent: markdownContent,
              });
            }

            // Добавляем категорию с маркерами
            this.categories.push(category);
          } catch (markersError) {
            console.error(
              `Ошибка при загрузке маркеров для коллекции ${collection.collection_id}:`,
              markersError
            );
            // Добавляем категорию даже в случае ошибки
            this.categories.push(category);
          }
        }

        // Если категорий нет, создаем категорию "Без категории"
        if (this.categories.length === 0) {
          await this.createDefaultCategory(mapId);
        }

        // Отображаем маркеры на карте
        this.renderMarkers();
      } catch (e) {
        console.error("Ошибка при загрузке коллекций с сервера:", e);
        // Если произошла ошибка, все равно создаем категорию "Без категории"
        await this.createDefaultCategory(this.$route.params.id);
      }
    },

    // Вспомогательный метод для генерации случайного цвета
    generateRandomColor() {
      const colors = [
        "#8A2BE2",
        "#DC143C",
        "#FF8C00",
        "#2E8B57",
        "#4682B4",
        "#800080",
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    },

    // Создание категории "Без категории"
    async createDefaultCategory(mapId) {
      try {
        // Проверяем, есть ли уже категория "Без категории"
        const existingCategory = this.categories.find(
          (category) =>
            category.name === "Без категории" || category.name === "Default"
        );

        if (existingCategory) {
          console.log(
            'Категория "Без категории" уже существует с ID:',
            existingCategory.id
          );
          return existingCategory; // Возвращаем существующую категорию
        }

        // Генерируем цвет
        const defaultColor = "#8A2BE2"; // BlueViolet по умолчанию

        // Пытаемся создать категорию на сервере
        const response = await fetch(`${API_URL}/collections/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            title: "Без категории",
            map_id: mapId,
            is_public: false,
            collection_color: defaultColor,
          }),
        });

        if (response.ok) {
          const newCollection = await response.json();

          // Добавляем категорию в список
          const newCategory = {
            id: newCollection.collection_id,
            name: "Без категории",
            color: newCollection.collection_color || defaultColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          this.categories.push(newCategory);

          console.log(
            'Создана категория "Без категории" с ID:',
            newCollection.collection_id
          );
          return newCategory;
        } else {
          // Если не удалось создать на сервере, создаем локально
          const localCategory = {
            id: "local_default_category",
            name: "Без категории",
            color: defaultColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          this.categories.push(localCategory);

          console.warn(
            'Создана локальная категория "Без категории" из-за ошибки сервера'
          );
          return localCategory;
        }
      } catch (error) {
        console.error('Ошибка при создании категории "Без категории":', error);

        // Создаем категорию локально в случае ошибки
        const defaultColor = "#8A2BE2"; // BlueViolet по умолчанию

        const localCategory = {
          id: "local_default_category",
          name: "Без категории",
          color: defaultColor,
          expanded: true,
          visible: true,
          markers: [],
        };

        this.categories.push(localCategory);

        console.warn(
          'Создана локальная категория "Без категории" из-за ошибки взаимодействия с сервером'
        );
        return localCategory;
      }
    },

    renderMarkers() {
      if (!this.map) return;

      try {
        // Удаляем все текущие маркеры с карты
        Object.values(this.leafletMarkers).forEach((marker) => {
          if (marker && marker.getTooltip) {
            try {
              if (marker.getTooltip()) {
                marker.closeTooltip();
                marker.unbindTooltip();
              }
              this.map.removeLayer(marker);
            } catch (e) {
              console.warn("Ошибка при удалении маркера:", e);
            }
          }
        });

        this.leafletMarkers = {};

        // Добавляем видимые маркеры из видимых категорий
        this.categories.forEach((category) => {
          if (category.visible) {
            category.markers.forEach((markerData) => {
              if (markerData.visible) {
                try {
                  // Создаем SVG-маркер с подстановкой цвета категории
                  const markerSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
                      <path fill="${category.color}" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 32 16 32s16-23.2 16-32C32 7.2 24.8 0 16 0z"/>
                      <circle fill="white" cx="16" cy="16" r="8"/>
                    </svg>
                  `;

                  // Создаем собственный класс иконки с отключенной анимацией
                  const customIcon = L.divIcon({
                    className: "custom-map-marker",
                    html: markerSvg,
                    iconSize: [32, 48],
                    iconAnchor: [16, 48],
                  });

                  // Создаем маркер с нашей иконкой
                  const marker = L.marker(markerData.position, {
                    icon: customIcon,
                    interactive: true,
                    // Отключаем анимацию на уровне маркера
                    zIndexOffset: markerData.position[0] * 10,
                    riseOnHover: false,
                    riseOffset: 0,
                  });

                  // Добавляем маркер на карту
                  marker.addTo(this.map);

                  // Используем событие mouseover вместо tooltip
                  marker.on("mouseover", (e) => {
                    try {
                      // Создаем попап вместо тултипа
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

                      // Сохраняем ссылку на попап
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
                      console.warn(
                        "Ошибка при обработке клика на маркер:",
                        err
                      );
                    }
                  });

                  // Сохраняем маркер
                  this.leafletMarkers[markerData.id] = marker;
                } catch (err) {
                  console.error("Ошибка при создании маркера:", err);
                }
              }
            });
          }
        });
      } catch (err) {
        console.error("Ошибка в renderMarkers:", err);
      }
    },

    toggleCategory(category) {
      category.expanded = !category.expanded;
    },

    toggleCategoryVisibility(category) {
      category.visible = !category.visible;
      this.renderMarkers();
    },

    toggleMarkerVisibility(marker) {
      marker.visible = !marker.visible;
      this.renderMarkers();
    },

    showCategoryMenu(category, event) {
      // Предотвращаем всплытие события
      event.stopPropagation();

      // Сохраняем категорию и тип контекста
      this.currentCategory = category;
      this.selectedContextType = "category";

      // Устанавливаем позицию меню относительно курсора
      this.menuPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      // Определяем пункты контекстного меню
      this.contextMenuItems = [
        { label: "Переименовать", action: "renameCategory", icon: "✏️" },
        { label: "Изменить цвет", action: "changeColor", icon: "🎨" },
        {
          label: "Удалить",
          action: "deleteCategory",
          icon: "🗑️",
          danger: true,
        },
      ];

      // Показываем контекстное меню
      this.showContextMenu = true;
    },

    showMarkerMenu(marker, category, event) {
      // Предотвращаем всплытие события
      event.stopPropagation();

      // Сохраняем маркер, категорию и тип контекста
      this.currentMarker = marker;
      this.currentCategory = category;
      this.selectedContextType = "marker";

      // Устанавливаем позицию меню относительно курсора
      this.menuPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      // Определяем пункты контекстного меню
      this.contextMenuItems = [
        { label: "Открыть", action: "openMarker", icon: "🔍" },
        { label: "Редактировать", action: "editMarker", icon: "✏️" },
        {
          label: "Удалить",
          action: "deleteMarker",
          icon: "🗑️",
          danger: true,
        },
      ];

      // Показываем контекстное меню
      this.showContextMenu = true;
    },

    executeAction(action) {
      this.showContextMenu = false;

      switch (action) {
        case "editMarker":
          this.showMarkerEditor = true;
          break;
        case "deleteMarker":
          this.confirmDelete(this.currentMarker, "marker");
          break;
        case "renameCategory":
          this.renameCategory(this.currentCategory);
          break;
        case "changeColor":
          this.changeColor(this.currentCategory);
          break;
        case "deleteCategory":
          this.confirmDelete(this.currentCategory, "category");
          break;
      }
    },

    renameCategory(category) {
      const newName = prompt(
        "Введите новое название категории:",
        category.name
      );
      if (newName && newName.trim()) {
        category.name = newName.trim();

        // Сохраняем изменения
        this.saveMapData();
      }
    },

    changeColor(category) {
      console.log("Открываем редактор цвета для категории:", category);
      this.currentCategory = category;
      this.showColorEditor = true;
    },

    confirmDelete(item, type) {
      this.showDeleteConfirmation = true;
      this.itemToDelete = item;
      this.confirmationMessage =
        type === "category"
          ? "Внимание! Все метки в категории будут удалены!"
          : "Вы уверены, что хотите удалить эту метку?";
    },

    cancelDelete() {
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationInput = "";
    },

    // Подтверждение удаления с сохранением данных
    confirmDeleteAction() {
      if (
        this.itemToDelete &&
        this.confirmationInput === this.itemToDelete.name
      ) {
        if (this.itemToDelete === this.currentMarker) {
          // Удаление метки
          const index = this.currentCategory.markers.findIndex(
            (m) => m.id === this.currentMarker.id
          );
          if (index !== -1) {
            // Удаляем маркер с сервера
            this.deleteMarkerFromServer(this.currentMarker.id);

            this.currentCategory.markers.splice(index, 1);
          }
        } else if (this.itemToDelete === this.currentCategory) {
          // Удаление категории
          const index = this.categories.findIndex(
            (c) => c.id === this.currentCategory.id
          );
          if (index !== -1) {
            // Удаляем коллекцию с сервера
            this.deleteCollectionFromServer(this.currentCategory.id);

            this.categories.splice(index, 1);
          }
        }

        // Сохраняем данные после удаления
        this.saveMapData();

        // Обновляем отображение маркеров на карте
        this.renderMarkers();
      }

      // Закрываем диалог подтверждения
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationInput = "";
    },

    // Удаление маркера с сервера
    async deleteMarkerFromServer(markerId) {
      // Сначала удаляем маркер из всех коллекций
      try {
        console.log(
          `Получение списка коллекций для карты ${this.$route.params.id}...`
        );
        // Используем map_id напрямую как основной параметр для получения коллекций
        const mapId = this.$route.params.id;
        const collectionsResponse = await getCollections(mapId);

        // Проверяем структуру ответа и извлекаем коллекции
        const collections = Array.isArray(collectionsResponse)
          ? collectionsResponse
          : collectionsResponse.collections || [];

        console.log(`Получено ${collections.length} коллекций`);

        // Удаляем маркер из каждой коллекции
        for (const collection of collections) {
          try {
            console.log(
              `Удаление маркера ${markerId} из коллекции ${collection.collection_id}...`
            );
            await removeMarkerFromCollection(
              collection.collection_id,
              markerId
            );
            console.log(
              `Маркер успешно удален из коллекции ${collection.collection_id}`
            );
          } catch (collectionError) {
            console.warn(
              `Не удалось удалить маркер из коллекции ${collection.collection_id}:`,
              collectionError
            );
            // Продолжаем с другими коллекциями, даже если одна из операций не удалась
          }
        }

        // После удаления из всех коллекций, удаляем сам маркер
        console.log(`Удаление маркера ${markerId}...`);
        const response = await api.delete(`/markers/${markerId}`);

        if (response.status === 200) {
          console.log("Маркер успешно удален:", response.data);
          return true;
        } else {
          console.error("Не удалось удалить маркер:", response);
          return false;
        }
      } catch (error) {
        console.error("Ошибка при удалении маркера:", error);
        return false;
      }
    },

    // Удаление коллекции с сервера
    async deleteCollectionFromServer(collectionId) {
      try {
        const response = await fetch(
          `http://localhost:8000/collections/${collectionId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(
            `Не удалось удалить коллекцию с сервера: ${response.status}`
          );
        } else {
          console.log(`Коллекция ${collectionId} успешно удалена с сервера`);
        }
      } catch (error) {
        console.error(`Ошибка при удалении коллекции ${collectionId}:`, error);
      }
    },

    async createCategory() {
      // Закрываем панель создания сразу после выбора опции
      this.showCreatePanel = false;

      const name = prompt("Введите название категории:");
      if (name && name.trim()) {
        // Генерируем случайный цвет
        const colors = [
          "#8A2BE2",
          "#DC143C",
          "#FF8C00",
          "#2E8B57",
          "#4682B4",
          "#800080",
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const mapId = this.$route.params.id;

        // Создаем коллекцию на сервере
        try {
          const response = await fetch("http://localhost:8000/collections/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify({
              title: name.trim(),
              map_id: mapId,
              is_public: false,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Ошибка при создании коллекции: ${response.status}`
            );
          }

          const newCollection = await response.json();

          // Создаем новую категорию
          const newCategory = {
            id: newCollection.collection_id,
            name: name.trim(),
            color: randomColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          this.categories.push(newCategory);

          console.log(
            `Категория ${name.trim()} успешно создана с ID ${
              newCollection.collection_id
            }`
          );
        } catch (error) {
          console.error("Ошибка при создании категории:", error);

          // Создаем категорию локально, чтобы не терять пользовательские данные
          const newCategory = {
            id: "local_" + Date.now(),
            name: name.trim(),
            color: randomColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          this.categories.push(newCategory);

          console.warn(
            "Категория создана локально из-за ошибки взаимодействия с сервером"
          );
        }
      }
    },

    createMarker() {
      console.log(
        'Метод createMarker() вызван - пользователь нажал на опцию "Метка на карте"'
      );

      // Закрываем панель создания сразу после выбора опции
      this.showCreatePanel = false;

      if (this.categories.length === 0) {
        console.warn("Нет доступных категорий для создания метки");
        alert("Сначала создайте категорию");
        return;
      }

      // Если есть только одна категория, используем её
      if (this.categories.length === 1) {
        console.log(
          "Доступна только одна категория, автоматически выбираем её:",
          this.categories[0].name,
          "(ID:",
          this.categories[0].id,
          ")"
        );
        this.pendingMarkerCategory = this.categories[0].id;
        alert("Кликните на карту, чтобы разместить метку");

        // Изменяем курсор для режима добавления метки
        document.getElementById("map").classList.add("adding-marker-mode");
        console.log(
          "Режим создания метки активирован (курсор изменен на крестик)"
        );

        // Добавляем обработчик правой кнопки мыши для отмены
        document
          .getElementById("map")
          .addEventListener("contextmenu", this.cancelMarkerCreation);
        console.log(
          "Добавлен обработчик правой кнопки мыши для отмены создания метки"
        );

        return;
      }

      console.log("Доступно несколько категорий, показываем диалог выбора");

      // Закрываем все предыдущие диалоги (если они остались)
      const existingDialogs = document.querySelectorAll(
        ".select-category-dialog"
      );
      existingDialogs.forEach((dialog) => {
        document.body.removeChild(dialog);
      });

      // Если есть несколько категорий, просим пользователя выбрать
      const categoryOptions = this.categories
        .map((c) => {
          return `<option value="${c.id}" style="color: ${c.color}">${c.name}</option>`;
        })
        .join("");

      const categorySelect = document.createElement("select");
      categorySelect.innerHTML = categoryOptions;
      categorySelect.className = "category-select";

      const container = document.createElement("div");
      container.innerHTML = "<p>Выберите категорию для новой метки:</p>";
      container.appendChild(categorySelect);

      // Показываем диалоговое окно с выбором категории
      const selectDialog = document.createElement("div");
      selectDialog.className = "select-category-dialog confirmation-dialog";
      selectDialog.appendChild(container);

      // Добавляем кнопки подтверждения и отмены
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "dialog-buttons";

      const okButton = document.createElement("button");
      okButton.innerText = "ОК";
      okButton.className = "confirm-button";

      const self = this; // Сохраняем контекст для использования в обработчике

      okButton.onclick = function () {
        const selectedCategoryId = categorySelect.value;
        const selectedCategory = self.categories.find(
          (c) => c.id === selectedCategoryId
        );
        console.log(
          "Пользователь выбрал категорию:",
          selectedCategory ? selectedCategory.name : "неизвестная",
          "(ID:",
          selectedCategoryId,
          ")"
        );

        self.pendingMarkerCategory = selectedCategoryId;
        document.body.removeChild(selectDialog);
        alert("Кликните на карту, чтобы разместить метку");

        // Изменяем курсор для режима добавления метки
        document.getElementById("map").classList.add("adding-marker-mode");
        console.log(
          "Режим создания метки активирован (курсор изменен на крестик)"
        );

        // Добавляем обработчик правой кнопки мыши для отмены
        document
          .getElementById("map")
          .addEventListener("contextmenu", self.cancelMarkerCreation);
        console.log(
          "Добавлен обработчик правой кнопки мыши для отмены создания метки"
        );
      };

      const cancelButton = document.createElement("button");
      cancelButton.innerText = "Отмена";
      cancelButton.className = "cancel-button";
      cancelButton.onclick = () => {
        console.log("Пользователь отменил выбор категории");
        document.body.removeChild(selectDialog);
      };

      buttonsContainer.appendChild(okButton);
      buttonsContainer.appendChild(cancelButton);

      selectDialog.appendChild(buttonsContainer);

      // Добавляем стили для обеспечения видимости диалога
      selectDialog.style.position = "fixed";
      selectDialog.style.top = "50%";
      selectDialog.style.left = "50%";
      selectDialog.style.transform = "translate(-50%, -50%)";
      selectDialog.style.zIndex = "9999"; // Высокий z-index, чтобы быть поверх других элементов
      selectDialog.style.backgroundColor = "#fff";
      selectDialog.style.padding = "20px";
      selectDialog.style.borderRadius = "8px";
      selectDialog.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      selectDialog.style.minWidth = "300px";
      selectDialog.style.maxWidth = "450px";

      // Применяем стили диалогового окна из общих стилей приложения
      document.body.appendChild(selectDialog);
      console.log("Диалоговое окно выбора категории отображено");
    },

    // Отмена создания метки (вызывается при клике правой кнопкой мыши)
    cancelMarkerCreation(event) {
      console.log(
        "Метод cancelMarkerCreation() вызван - пользователь отменил создание метки правым кликом"
      );

      // Предотвращаем стандартное контекстное меню
      event.preventDefault();

      // Выходим из режима создания метки
      this.pendingMarkerCategory = null;

      // Возвращаем курсор в нормальное состояние
      document.getElementById("map").classList.remove("adding-marker-mode");

      // Удаляем обработчик правой кнопки мыши
      document
        .getElementById("map")
        .removeEventListener("contextmenu", this.cancelMarkerCreation);

      // Сообщаем пользователю
      alert("Создание метки отменено");
      console.log("Режим создания метки деактивирован");
    },

    async onMapClick(e) {
      console.log(
        "Метод onMapClick() вызван - пользователь кликнул на карту в координатах:",
        e.latlng
      );

      // Проверяем, находимся ли мы в режиме создания маркера
      if (this.pendingMarkerCategory) {
        console.log(
          "Режим создания метки активен, категория:",
          this.pendingMarkerCategory
        );
        const category = this.categories.find(
          (c) => c.id === this.pendingMarkerCategory
        );

        if (category) {
          console.log("Найдена категория для метки:", category.name);
          const mapId = this.$route.params.id;
          const position = [e.latlng.lat, e.latlng.lng];
          const defaultName = "Метка " + (category.markers.length + 1);

          console.log("Данные метки:", {
            mapId: mapId,
            position: position,
            name: defaultName,
            categoryId: category.id,
          });

          try {
            console.log("Отправляем запрос на создание метки на сервере...");
            // Создаем маркер на сервере
            const markerResponse = await fetch(
              "http://localhost:8000/markers/",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Cookies.get("access_token")}`,
                },
                body: JSON.stringify({
                  latitude: position[0],
                  longitude: position[1],
                  title: defaultName,
                  description: "Описание метки",
                  map_id: mapId,
                }),
              }
            );

            console.log("Статус ответа сервера:", markerResponse.status);

            if (!markerResponse.ok) {
              throw new Error(
                `Ошибка при создании маркера: ${markerResponse.status}`
              );
            }

            const newMarker = await markerResponse.json();
            console.log(
              "Маркер успешно создан на сервере с ID:",
              newMarker.marker_id
            );

            // Добавляем маркер в коллекцию
            console.log("Добавляем маркер в коллекцию", category.id);
            const addToCollectionResponse = await fetch(
              `http://localhost:8000/collections/${category.id}/markers`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Cookies.get("access_token")}`,
                },
                body: JSON.stringify({
                  marker_id: newMarker.marker_id,
                }),
              }
            );

            console.log(
              "Статус ответа на добавление в коллекцию:",
              addToCollectionResponse.status
            );

            if (!addToCollectionResponse.ok) {
              console.warn(
                `Не удалось добавить маркер ${newMarker.marker_id} в коллекцию ${category.id}`
              );
            } else {
              console.log("Маркер успешно добавлен в коллекцию");
            }

            // Создаем статью для маркера с базовым содержимым
            console.log("Создаем статью для маркера");
            const markdownContent = ``;
            const articleResponse = await fetch(
              `http://localhost:8000/markers/${newMarker.marker_id}/article`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Cookies.get("access_token")}`,
                },
                body: JSON.stringify({
                  markdown_content: markdownContent,
                }),
              }
            );

            console.log(
              "Статус ответа на создание статьи:",
              articleResponse.status
            );

            if (!articleResponse.ok) {
              console.warn(
                `Не удалось создать статью для маркера ${newMarker.marker_id}`
              );
            } else {
              console.log("Статья для маркера успешно создана");
            }

            // Создаем локальное представление маркера
            const markerItem = {
              id: newMarker.marker_id,
              name: defaultName,
              visible: true,
              position: position,
              blocks: this.markdownToBlocks(markdownContent),
              markdownContent: markdownContent,
            };

            console.log("Добавляем представление маркера в интерфейс");
            category.markers.push(markerItem);
            this.renderMarkers();

            console.log(
              `Процесс создания маркера завершен успешно. Маркер создан с ID ${newMarker.marker_id}`
            );
          } catch (error) {
            console.error("Ошибка при создании маркера:", error);

            // Создаем маркер локально в случае ошибки
            console.log("Создаем локальный маркер из-за ошибки");
            const markerItem = {
              id: "local_" + Date.now(),
              name: defaultName,
              visible: true,
              position: position,
              blocks: [
                { type: "heading1", content: defaultName },
                { type: "text", content: "Описание метки" },
              ],
              markdownContent: `# ${defaultName}\nОписание метки`,
            };

            category.markers.push(markerItem);
            this.renderMarkers();

            console.warn(
              "Маркер создан локально из-за ошибки взаимодействия с сервером"
            );
          }
        } else {
          console.error("Категория не найдена:", this.pendingMarkerCategory);
        }

        // Возвращаем курсор в нормальное состояние
        document.getElementById("map").classList.remove("adding-marker-mode");

        // Удаляем обработчик правой кнопки мыши
        document
          .getElementById("map")
          .removeEventListener("contextmenu", this.cancelMarkerCreation);

        // Сбрасываем режим создания метки
        this.pendingMarkerCategory = null;
        console.log("Режим создания метки деактивирован");
      } else {
        console.log(
          "Клик по карте игнорируется, т.к. режим создания метки не активен"
        );
      }
    },

    async openMarkerDetails(marker, category) {
      this.currentMarker = { ...marker }; // Создаем копию маркера
      this.currentCategory = category;

      // Если маркер не локальный, пытаемся загрузить статью с сервера
      if (!marker.id.toString().startsWith("local_")) {
        try {
          const response = await fetch(
            `http://localhost:8000/markers/${marker.id}/article`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Cookies.get("access_token")}`,
              },
            }
          );

          if (response.ok) {
            const article = await response.json();
            if (article && article.markdown_content) {
              // Обновляем содержимое маркера из статьи
              this.currentMarker.markdownContent = article.markdown_content;
              this.currentMarker.blocks = this.markdownToBlocks(
                article.markdown_content
              );

              // Обновляем маркер в коллекции для сохранения изменений
              const index = category.markers.findIndex(
                (m) => m.id === marker.id
              );
              if (index !== -1) {
                category.markers[index].markdownContent =
                  article.markdown_content;
                category.markers[index].blocks = this.markdownToBlocks(
                  article.markdown_content
                );
              }
            }
          } else {
            console.warn(
              `Не удалось загрузить статью для маркера ${marker.id}`
            );
          }
        } catch (error) {
          console.error(
            `Ошибка при загрузке статьи для маркера ${marker.id}:`,
            error
          );
        }
      }

      this.showMarkerEditor = true;
    },

    // Проверка, является ли маркер локальным (созданным на клиенте)
    isLocalMarker(id) {
      return id && id.toString().startsWith("local_");
    },

    async saveMarkerChanges(updatedMarkerData) {
      // Проверка текущей категории и маркера
      if (!this.currentCategory || !this.currentMarker) return;

      console.log("Начинаем сохранение изменений маркера:", updatedMarkerData);

      // Находим индекс текущего маркера в массиве маркеров категории
      const markerIndex = this.currentCategory.markers.findIndex(
        (marker) => marker.id === this.currentMarker.id
      );

      if (markerIndex !== -1) {
        try {
          // Получаем текущий токен из cookies
          const token = Cookies.get("access_token");
          if (!token) {
            console.error("Ошибка авторизации: токен отсутствует");
            return false;
          }

          // Обновляем локальные данные маркера
          const updatedMarker = {
            ...this.currentCategory.markers[markerIndex],
            name: updatedMarkerData.name,
            blocks: updatedMarkerData.blocks,
            markdownContent: updatedMarkerData.markdownContent,
          };

          const isLocal = this.isLocalMarker(updatedMarker.id);
          console.log("Маркер локальный?", isLocal);

          if (isLocal) {
            // Маркер локальный, создаем его на сервере
            console.log(
              "Создаем новый маркер на сервере для локального маркера"
            );
            try {
              const response = await fetch(`http://localhost:8000/markers/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  latitude: updatedMarker.position[0],
                  longitude: updatedMarker.position[1],
                  title: updatedMarker.name,
                  description: "Краткое описание маркера",
                  map_id: this.$route.params.id,
                }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error("Ошибка при создании маркера:", errorText);
                return false;
              }

              const createdMarker = await response.json();
              console.log("Маркер успешно создан на сервере:", createdMarker);

              // Обновляем id маркера в локальном хранилище
              updatedMarker.id = createdMarker.marker_id;
              this.currentCategory.markers[markerIndex].id =
                createdMarker.marker_id;

              // Добавляем маркер в коллекцию
              console.log(
                "Добавляем маркер в коллекцию:",
                this.currentCategory.id
              );
              const addToCollectionResponse = await fetch(
                `http://localhost:8000/collections/${this.currentCategory.id}/markers`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    marker_id: createdMarker.marker_id,
                  }),
                }
              );

              if (!addToCollectionResponse.ok) {
                console.warn(
                  "Не удалось добавить маркер в коллекцию:",
                  await addToCollectionResponse.text()
                );
              } else {
                console.log("Маркер успешно добавлен в коллекцию");
              }

              // Создаем статью для нового маркера
              console.log("Создаем статью для маркера");
              const articleResponse = await fetch(
                `http://localhost:8000/markers/${createdMarker.marker_id}/article`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    markdown_content: updatedMarker.markdownContent,
                  }),
                }
              );

              if (!articleResponse.ok) {
                console.error(
                  "Ошибка при создании статьи маркера:",
                  await articleResponse.text()
                );
              } else {
                console.log("Статья для маркера успешно создана");
              }

              // Обновляем маркер в интерфейсе
              this.currentCategory.markers[markerIndex] = updatedMarker;
              this.renderMarkers();
              return true;
            } catch (error) {
              console.error("Ошибка при сохранении нового маркера:", error);
              return false;
            }
          } else {
            // Обновляем существующий маркер
            console.log(
              "Обновляем существующий маркер на сервере:",
              updatedMarker.id
            );
            try {
              // Обновляем основные данные маркера
              const response = await fetch(
                `http://localhost:8000/markers/${updatedMarker.id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    latitude: updatedMarker.position[0],
                    longitude: updatedMarker.position[1],
                    title: updatedMarker.name,
                  }),
                }
              );

              if (!response.ok) {
                console.error(
                  "Ошибка при обновлении маркера:",
                  await response.text()
                );
                return false;
              }

              console.log("Основные данные маркера успешно обновлены");

              // Обновляем статью маркера (markdown)
              console.log("Обновляем статью маркера");
              const articleResponse = await fetch(
                `http://localhost:8000/markers/${updatedMarker.id}/article`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    markdown_content: updatedMarker.markdownContent,
                  }),
                }
              );

              if (!articleResponse.ok) {
                console.error(
                  "Ошибка при обновлении статьи маркера:",
                  await articleResponse.text()
                );
                return false;
              }

              console.log("Статья маркера успешно обновлена");

              // Обновляем маркер в интерфейсе
              this.currentCategory.markers[markerIndex] = updatedMarker;
              this.renderMarkers();
              return true;
            } catch (error) {
              console.error("Ошибка при обновлении маркера:", error);
              return false;
            }
          }
        } catch (error) {
          console.error("Общая ошибка при сохранении маркера:", error);
          return false;
        }
      } else {
        console.error("Маркер не найден в категории");
        return false;
      }
    },

    showAddBlockMenu(index, event) {
      if (event) {
        const rect = event.target.getBoundingClientRect();
        this.blockTypeMenuPosition = {
          top: `${rect.top}px`,
          left: `${rect.left - 150}px`,
        };
      }

      this.blockTypeMenuIndex = index;
      this.showBlockTypeMenu = true;

      // Закрываем меню при клике в другое место
      setTimeout(() => {
        document.addEventListener("click", this.hideBlockTypeMenu, {
          once: true,
        });
      }, 0);
    },

    hideBlockTypeMenu() {
      this.showBlockTypeMenu = false;
    },

    onDragStart(event, index) {
      this.draggingBlockIndex = index;
      this.dragOverIndex = null;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", index.toString());

      // Добавляем обработчики для всего документа
      document.addEventListener("dragover", this.onDocumentDragOver);
      document.addEventListener("drop", this.onDocumentDrop);
    },

    onDragEnd() {
      this.draggingBlockIndex = null;
      this.dragOverIndex = null;

      // Удаляем обработчики
      document.removeEventListener("dragover", this.onDocumentDragOver);
      document.removeEventListener("drop", this.onDocumentDrop);
    },

    onDocumentDragOver(event) {
      event.preventDefault();

      // Находим блок, над которым находится курсор
      const blocks = document.querySelectorAll(".content-block");
      let targetIndex = null;

      blocks.forEach((block, index) => {
        const rect = block.getBoundingClientRect();
        const mouseY = event.clientY;

        // Если курсор находится в верхней половине блока, показываем индикатор перед блоком
        // Если в нижней - после блока
        if (mouseY >= rect.top && mouseY <= rect.bottom) {
          const isTop = mouseY < rect.top + rect.height / 2;
          targetIndex = isTop ? index : index + 1;
        }
      });

      // Не позволяем перетаскивать блок на самого себя
      if (
        targetIndex !== null &&
        targetIndex !== this.draggingBlockIndex &&
        targetIndex !== this.draggingBlockIndex + 1
      ) {
        this.dragOverIndex = targetIndex;
      } else {
        this.dragOverIndex = null;
      }
    },

    onDocumentDrop(event) {
      event.preventDefault();

      if (this.draggingBlockIndex !== null && this.dragOverIndex !== null) {
        // Извлекаем блок, который перетаскиваем
        const blockToMove = this.currentMarker.blocks[this.draggingBlockIndex];

        // Удаляем его из текущей позиции
        this.currentMarker.blocks.splice(this.draggingBlockIndex, 1);

        // Корректируем индекс вставки, если он больше индекса удаленного элемента
        let insertIndex = this.dragOverIndex;
        if (this.dragOverIndex > this.draggingBlockIndex) {
          insertIndex--;
        }

        // Вставляем блок в новую позицию
        this.currentMarker.blocks.splice(insertIndex, 0, blockToMove);

        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }

      this.draggingBlockIndex = null;
      this.dragOverIndex = null;
    },

    checkEmptyBlock(index) {
      // Если это последний блок и его содержимое не пустое, добавляем новый пустой блок
      if (index === this.currentMarker.blocks.length - 1) {
        const block = this.currentMarker.blocks[index];

        if (block.type === "text" && block.content.trim() !== "") {
          this.addNewBlock("text", index + 1);
        } else if (block.type === "heading1" && block.content.trim() !== "") {
          this.addNewBlock("text", index + 1);
        } else if (block.type === "heading2" && block.content.trim() !== "") {
          this.addNewBlock("text", index + 1);
        } else if (block.type === "heading3" && block.content.trim() !== "") {
          this.addNewBlock("text", index + 1);
        } else if (block.type === "quote" && block.content.trim() !== "") {
          this.addNewBlock("text", index + 1);
        }
      }
    },

    onBlockFocus(index) {
      this.hoveredBlockIndex = index;
    },

    addNewBlock(type, index) {
      if (!this.currentMarker) return;

      let newBlock;

      switch (type) {
        case "text":
          newBlock = { type: "text", content: "" };
          break;
        case "heading1":
          newBlock = { type: "heading1", content: "" };
          break;
        case "heading2":
          newBlock = { type: "heading2", content: "" };
          break;
        case "heading3":
          newBlock = { type: "heading3", content: "" };
          break;
        case "list":
          newBlock = { type: "list", items: [""] };
          break;
        case "quote":
          newBlock = { type: "quote", content: "" };
          break;
        case "divider":
          newBlock = { type: "divider" };
          break;
        default:
          newBlock = { type: "text", content: "" };
      }

      // Проверяем, является ли текущий блок пустым текстовым блоком
      const currentBlock = this.currentMarker.blocks[index];
      if (
        currentBlock &&
        currentBlock.type === "text" &&
        currentBlock.content.trim() === ""
      ) {
        // Заменяем текущий блок
        this.currentMarker.blocks.splice(index, 1, newBlock);
        this.hoveredBlockIndex = index;
      } else {
        // Вставляем новый блок после текущего
        this.currentMarker.blocks.splice(index + 1, 0, newBlock);
        this.hoveredBlockIndex = index + 1;
      }

      this.showBlockTypeMenu = false;

      // После добавления нового блока фокусируемся на нём
      this.$nextTick(() => {
        const blocksWithInputs = document.querySelectorAll(
          ".content-block textarea, .content-block input"
        );
        if (blocksWithInputs[this.hoveredBlockIndex]) {
          blocksWithInputs[this.hoveredBlockIndex].focus();
        }
      });

      // Проверяем, есть ли пустой блок в конце
      this.ensureEmptyBlockAtEnd();
    },

    removeListItem(block, index) {
      block.items.splice(index, 1);
    },

    addListItem(block) {
      block.items.push("");
    },

    handleOutsideClick(event) {
      // Скрываем контекстное меню при клике вне него
      if (this.showContextMenu) {
        const menu = document.querySelector(".context-menu");
        if (menu && !menu.contains(event.target)) {
          this.showContextMenu = false;
        }
      }
    },

    handleKeyDown(event, index) {
      // Обработка нажатия Backspace в пустом блоке
      if (
        event.key === "Backspace" &&
        this.currentMarker.blocks[index].content.trim() === ""
      ) {
        // Не удаляем блок, если он единственный
        if (this.currentMarker.blocks.length <= 1) {
          return;
        }

        // Запоминаем предыдущий индекс для переноса фокуса
        const prevIndex = Math.max(0, index - 1);

        // Удаляем текущий блок
        this.currentMarker.blocks.splice(index, 1);

        // В следующем цикле переносим фокус на предыдущий блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll(
            ".content-block textarea"
          );
          const input = textareas[prevIndex];

          if (input) {
            input.focus();

            // Устанавливаем курсор в конец текста
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        });

        event.preventDefault();
      }

      // Обработка нажатия Enter для создания нового блока
      else if (event.key === "Enter" && !event.shiftKey) {
        // Получаем текущий блок и его тип
        const currentBlock = this.currentMarker.blocks[index];
        let newBlockType = "text"; // По умолчанию создаем текстовый блок

        // Сохраняем тип блока для некоторых типов блоков
        if (
          ["text", "heading1", "heading2", "heading3", "quote"].includes(
            currentBlock.type
          )
        ) {
          // Определяем позицию курсора
          const textarea = event.target;
          const cursorPosition = textarea.selectionStart;
          const textBeforeCursor = currentBlock.content.substring(
            0,
            cursorPosition
          );
          const textAfterCursor =
            currentBlock.content.substring(cursorPosition);

          // Обновляем текст текущего блока (оставляем только текст до курсора)
          currentBlock.content = textBeforeCursor;

          // Создаем новый блок с текстом после курсора
          this.currentMarker.blocks.splice(index + 1, 0, {
            type: newBlockType,
            content: textAfterCursor,
          });

          // В следующем цикле переносим фокус на новый блок
          this.$nextTick(() => {
            const textareas = document.querySelectorAll(
              ".content-block textarea"
            );
            const newInput = textareas[index + 1];

            if (newInput) {
              newInput.focus();
              // Устанавливаем курсор в начало текста нового блока
              newInput.setSelectionRange(0, 0);
            }
          });

          // Проверяем, есть ли пустой блок в конце
          this.ensureEmptyBlockAtEnd();

          event.preventDefault();
        }
      }
    },

    ensureEmptyBlockAtEnd() {
      // Проверяем, есть ли пустой блок в конце
      const lastBlockIndex = this.currentMarker.blocks.length - 1;
      if (lastBlockIndex >= 0) {
        const lastBlock = this.currentMarker.blocks[lastBlockIndex];

        // Если последний блок не является пустым текстовым блоком,
        // добавляем пустой текстовый блок в конец
        if (!(lastBlock.type === "text" && lastBlock.content.trim() === "")) {
          this.currentMarker.blocks.push({ type: "text", content: "" });
        }
      } else {
        // Если блоков нет вообще, добавляем первый пустой блок
        this.currentMarker.blocks.push({ type: "text", content: "" });
      }
    },

    showBlockMenu(event, index) {
      // Предотвращаем всплытие события, чтобы не вызвать drag-and-drop
      event.stopPropagation();

      // Скрываем текущее меню если оно открыто
      this.showContextMenu = false;

      // Устанавливаем позицию меню относительно курсора
      this.menuPosition = {
        top: `${event.clientY}px`,
        left: `${event.clientX}px`,
      };

      this.contextActions = [
        { label: "Дублировать", action: "duplicateBlock" },
        { label: "Удалить", action: "deleteBlock", danger: true },
      ];

      this.activeItem = this.currentMarker.blocks[index];
      this.activeItemIndex = index; // Запоминаем индекс для использования в методах

      // Показываем меню
      this.showContextMenu = true;

      // Отменяем поведение по умолчанию, чтобы не начать drag-and-drop
      event.preventDefault();
    },

    duplicateBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Создаем глубокую копию блока
        const blockCopy = JSON.parse(JSON.stringify(this.activeItem));

        // Вставляем копию после оригинала
        this.currentMarker.blocks.splice(
          this.activeItemIndex + 1,
          0,
          blockCopy
        );

        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
    },

    deleteBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Не удаляем, если это единственный блок
        if (this.currentMarker.blocks.length <= 1) {
          return;
        }

        // Удаляем блок
        this.currentMarker.blocks.splice(this.activeItemIndex, 1);

        // Обеспечиваем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
    },

    handleListItemKeyDown(event, blockIndex, itemIndex) {
      // Если нажат Backspace в пустом элементе списка
      if (
        event.key === "Backspace" &&
        this.currentMarker.blocks[blockIndex].items[itemIndex].trim() === ""
      ) {
        // Не удаляем элемент, если он единственный
        if (this.currentMarker.blocks[blockIndex].items.length <= 1) {
          // Если это единственный элемент и пустой, меняем тип блока на текстовый
          //const block = this.currentMarker.blocks[blockIndex];
          this.currentMarker.blocks.splice(blockIndex, 1, {
            type: "text",
            content: "",
          });

          // Фокусируемся на новом текстовом блоке
          this.$nextTick(() => {
            const textareas = document.querySelectorAll(
              ".content-block textarea"
            );
            if (textareas[blockIndex]) {
              textareas[blockIndex].focus();
            }
          });

          event.preventDefault();
          return;
        }

        // Запоминаем предыдущий индекс для переноса фокуса
        const prevIndex = Math.max(0, itemIndex - 1);

        // Удаляем элемент
        this.currentMarker.blocks[blockIndex].items.splice(itemIndex, 1);

        // В следующем цикле переносим фокус на предыдущий элемент
        this.$nextTick(() => {
          const inputs = Array.from(document.querySelectorAll(".list-block"));
          if (inputs[blockIndex]) {
            const listItems =
              inputs[blockIndex].querySelectorAll(".list-item-input");
            if (listItems[prevIndex]) {
              listItems[prevIndex].focus();

              // Устанавливаем курсор в конец текста
              const len = listItems[prevIndex].value.length;
              if (listItems[prevIndex].setSelectionRange) {
                listItems[prevIndex].setSelectionRange(len, len);
              }
            }
          }
        });

        event.preventDefault();
      }
    },

    // Сохранение всех данных карты
    async saveMapData() {
      try {
        const mapId = this.$route.params.id;

        // Сохраняем каждую категорию как коллекцию
        for (const category of this.categories) {
          const collectionData = {
            title: category.name,
            map_id: mapId,
            is_public: false,
          };

          let collectionId = category.id;

          // Если у категории нет ID, создаем новую коллекцию
          if (!collectionId || collectionId.toString().startsWith("local_")) {
            try {
              const response = await fetch(
                "http://localhost:8000/collections/",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Cookies.get("access_token")}`,
                  },
                  body: JSON.stringify(collectionData),
                }
              );

              if (!response.ok) {
                throw new Error(
                  `Ошибка при создании коллекции: ${response.status}`
                );
              }

              const newCollection = await response.json();
              collectionId = newCollection.collection_id;
              category.id = collectionId; // Обновляем ID категории
            } catch (error) {
              console.error("Ошибка при создании коллекции:", error);
              continue;
            }
          } else {
            // Обновляем существующую коллекцию
            try {
              const response = await fetch(
                `http://localhost:8000/collections/${collectionId}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Cookies.get("access_token")}`,
                  },
                  body: JSON.stringify(collectionData),
                }
              );

              if (!response.ok) {
                console.warn(
                  `Не удалось обновить коллекцию ${collectionId}: ${response.status}`
                );
              }
            } catch (error) {
              console.error(
                `Ошибка при обновлении коллекции ${collectionId}:`,
                error
              );
            }
          }

          // Сохраняем маркеры коллекции
          for (const marker of category.markers) {
            // Преобразуем блоки в markdown
            if (!marker.markdownContent) {
              marker.markdownContent = this.blocksToMarkdown(marker.blocks);
            }

            const markerData = {
              latitude: marker.position[0],
              longitude: marker.position[1],
              title: marker.name,
              description: marker.markdownContent.substring(0, 100), // Краткое описание
            };

            let markerId = marker.id;

            // Если у маркера нет ID или он локальный, создаем новый
            if (!markerId || markerId.toString().startsWith("local_")) {
              try {
                // Создаем маркер
                const markerResponse = await fetch(
                  "http://localhost:8000/markers/",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                    body: JSON.stringify({
                      ...markerData,
                      map_id: mapId,
                    }),
                  }
                );

                if (!markerResponse.ok) {
                  throw new Error(
                    `Ошибка при создании маркера: ${markerResponse.status}`
                  );
                }

                const newMarker = await markerResponse.json();
                markerId = newMarker.marker_id;
                marker.id = markerId; // Обновляем ID маркера

                // Добавляем маркер в коллекцию
                const addToCollectionResponse = await fetch(
                  `http://localhost:8000/collections/${collectionId}/markers`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                    body: JSON.stringify({
                      marker_id: markerId,
                    }),
                  }
                );

                if (!addToCollectionResponse.ok) {
                  console.warn(
                    `Не удалось добавить маркер ${markerId} в коллекцию ${collectionId}`
                  );
                }

                // Создаем статью для маркера
                const articleResponse = await fetch(
                  `http://localhost:8000/markers/${markerId}/article`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                    body: JSON.stringify({
                      markdown_content: marker.markdownContent,
                    }),
                  }
                );

                if (!articleResponse.ok) {
                  console.warn(
                    `Не удалось создать статью для маркера ${markerId}`
                  );
                }
              } catch (error) {
                console.error("Ошибка при создании маркера:", error);
                continue;
              }
            } else {
              // Обновляем существующий маркер
              try {
                const markerResponse = await fetch(
                  `http://localhost:8000/markers/${markerId}`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                    body: JSON.stringify(markerData),
                  }
                );

                if (!markerResponse.ok) {
                  console.warn(
                    `Не удалось обновить маркер ${markerId}: ${markerResponse.status}`
                  );
                }

                // Обновляем статью для маркера
                const articleResponse = await fetch(
                  `http://localhost:8000/markers/${markerId}/article`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${Cookies.get("access_token")}`,
                    },
                    body: JSON.stringify({
                      markdown_content: marker.markdownContent,
                    }),
                  }
                );

                if (!articleResponse.ok) {
                  console.warn(
                    `Не удалось обновить статью для маркера ${markerId}`
                  );
                }
              } catch (error) {
                console.error(
                  `Ошибка при обновлении маркера ${markerId}:`,
                  error
                );
              }
            }
          }
        }

        console.log("Данные карты сохранены на сервере");
      } catch (e) {
        console.error("Ошибка при сохранении данных карты:", e);
      }
    },

    // Конвертер блоков в markdown (дублирует функцию из MarkerEditor для независимой работы)
    blocksToMarkdown(blocks) {
      if (!blocks || !blocks.length) return "";

      return blocks
        .map((block) => {
          switch (block.type) {
            case "text":
              return block.content;
            case "heading1":
              return `# ${block.content}`;
            case "heading2":
              return `## ${block.content}`;
            case "heading3":
              return `### ${block.content}`;
            case "quote":
              return `> ${block.content}`;
            case "list":
              if (block.items && block.items.length) {
                return block.items.map((item) => `* ${item}`).join("\n");
              }
              return "";
            case "divider":
              return "---";
            default:
              return "";
          }
        })
        .filter((content) => content !== "")
        .join("\n\n");
    },

    // Конвертер markdown в блоки (дублирует функцию из MarkerEditor для независимой работы)
    markdownToBlocks(markdown) {
      if (!markdown) return [{ type: "text", content: "" }];

      const lines = markdown.split("\n");
      const blocks = [];

      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();

        // Пропускаем пустые строки
        if (line === "") {
          i++;
          continue;
        }

        // Заголовок 1 уровня
        if (line.startsWith("# ")) {
          blocks.push({
            type: "heading1",
            content: line.substring(2).trim(),
          });
          i++;
          continue;
        }

        // Заголовок 2 уровня
        if (line.startsWith("## ")) {
          blocks.push({
            type: "heading2",
            content: line.substring(3).trim(),
          });
          i++;
          continue;
        }

        // Заголовок 3 уровня
        if (line.startsWith("### ")) {
          blocks.push({
            type: "heading3",
            content: line.substring(4).trim(),
          });
          i++;
          continue;
        }

        // Задача с чекбоксом
        const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (taskMatch) {
          blocks.push({
            type: "task-item",
            content: taskMatch[2].trim(),
            completed: taskMatch[1].toLowerCase() === "x",
          });
          i++;
          continue;
        }

        // Элемент маркированного списка (с дефисом)
        if (line.startsWith("- ")) {
          blocks.push({
            type: "list-item",
            content: line.substring(2).trim(),
          });
          i++;
          continue;
        }

        // Элемент маркированного списка (со звездочкой)
        if (line.startsWith("* ")) {
          blocks.push({
            type: "list-item",
            content: line.substring(2).trim(),
          });
          i++;
          continue;
        }

        // Элемент нумерованного списка
        const orderedListMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (orderedListMatch) {
          blocks.push({
            type: "ordered-list-item",
            content: orderedListMatch[2].trim(),
            order: parseInt(orderedListMatch[1]),
          });
          i++;
          continue;
        }

        // Горизонтальная линия
        if (line === "---") {
          blocks.push({ type: "divider" });
          i++;
          continue;
        }

        // Цитата
        if (line.startsWith("> ")) {
          blocks.push({
            type: "quote",
            content: line.substring(2).trim(),
          });
          i++;
          continue;
        }

        // Обычный текст
        // Собираем многострочный текст до следующего блока
        let textContent = line;
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();

          // Если следующая строка - начало нового блока, прерываем сбор текста
          if (
            nextLine === "" ||
            nextLine.startsWith("# ") ||
            nextLine.startsWith("## ") ||
            nextLine.startsWith("### ") ||
            nextLine.startsWith("- ") ||
            nextLine.startsWith("* ") ||
            nextLine.match(/^\d+\.\s+/) ||
            nextLine === "---" ||
            nextLine.startsWith("> ") ||
            nextLine.match(/^-\s*\[([ xX])\]\s*(.+)$/)
          ) {
            break;
          }

          textContent += "\n" + lines[j];
          j++;
        }

        blocks.push({
          type: "text",
          content: textContent,
        });

        i = j;
      }

      // Добавляем пустой блок в конце, если нужно
      if (
        blocks.length === 0 ||
        blocks[blocks.length - 1].type !== "text" ||
        blocks[blocks.length - 1].content.trim() !== ""
      ) {
        blocks.push({ type: "text", content: "" });
      }

      console.log("MapView markdownToBlocks результат:", blocks);
      return blocks;
    },

    // Drag and Drop меток
    onMarkerDragStart(event, marker, category) {
      // Сохраняем информацию о перетаскиваемой метке
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          markerId: marker.id,
          categoryId: category.id,
        })
      );
      event.dataTransfer.effectAllowed = "move";

      // Изменяем стиль элемента при перетаскивании
      if (event.target.classList.contains("marker-item")) {
        event.target.classList.add("dragging");
      }

      // Добавляем обработчики событий для всего документа
      document.addEventListener("dragend", this.onMarkerDragEnd);
    },

    onMarkerDragEnd() {
      // Удаляем стиль перетаскивания
      const draggingElements = document.querySelectorAll(
        ".marker-item.dragging"
      );
      draggingElements.forEach((el) => el.classList.remove("dragging"));

      // Сбрасываем состояние перетаскивания
      this.dragEnterMarker = null;
      this.dragEnterCategory = null;

      // Удаляем обработчики событий
      document.removeEventListener("dragend", this.onMarkerDragEnd);
    },

    onMarkerDrop(event, targetMarker, targetCategory) {
      // Сбрасываем состояние перетаскивания
      this.dragEnterMarker = null;

      try {
        // Получаем данные о перетаскиваемой метке
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        const { markerId, categoryId } = data;

        // Если метка перетаскивается в ту же категорию, ничего не делаем
        if (categoryId === targetCategory.id) {
          return;
        }

        // Находим исходную категорию и метку
        const sourceCategory = this.categories.find((c) => c.id === categoryId);
        if (!sourceCategory) {
          console.error("Не найдена исходная категория:", categoryId);
          return;
        }

        const markerIndex = sourceCategory.markers.findIndex(
          (m) => m.id === markerId
        );
        if (markerIndex === -1) {
          console.error("Не найдена метка:", markerId);
          return;
        }

        // Копируем метку для перемещения
        const marker = { ...sourceCategory.markers[markerIndex] };

        // Удаляем метку из исходной категории
        sourceCategory.markers.splice(markerIndex, 1);

        // Добавляем метку в целевую категорию
        targetCategory.markers.push(marker);

        // Сохраняем изменения на сервере
        this.moveMarkerToCategory(marker, sourceCategory.id, targetCategory.id);

        // Обновляем отображение
        this.renderMarkers();
      } catch (error) {
        console.error("Ошибка при перетаскивании метки:", error);
      }
    },

    onCategoryDrop(event, targetCategory) {
      // Сбрасываем состояние перетаскивания
      this.dragEnterCategory = null;

      try {
        // Получаем данные о перетаскиваемой метке
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        const { markerId, categoryId } = data;

        // Если метка перетаскивается в ту же категорию, ничего не делаем
        if (categoryId === targetCategory.id) {
          return;
        }

        // Находим исходную категорию и метку
        const sourceCategory = this.categories.find((c) => c.id === categoryId);
        if (!sourceCategory) {
          console.error("Не найдена исходная категория:", categoryId);
          return;
        }

        const markerIndex = sourceCategory.markers.findIndex(
          (m) => m.id === markerId
        );
        if (markerIndex === -1) {
          console.error("Не найдена метка:", markerId);
          return;
        }

        // Копируем метку для перемещения
        const marker = { ...sourceCategory.markers[markerIndex] };

        // Удаляем метку из исходной категории
        sourceCategory.markers.splice(markerIndex, 1);

        // Добавляем метку в целевую категорию
        targetCategory.markers.push(marker);

        // Сохраняем изменения на сервере
        this.moveMarkerToCategory(marker, sourceCategory.id, targetCategory.id);

        // Обновляем отображение
        this.renderMarkers();
      } catch (error) {
        console.error("Ошибка при перетаскивании метки в категорию:", error);
      }
    },

    // Перемещение метки между категориями на сервере
    async moveMarkerToCategory(marker, sourceCategoryId, targetCategoryId) {
      try {
        // Если метка локальная, не делаем запрос на сервер
        if (marker.id.toString().startsWith("local_")) {
          console.warn("Локальная метка перемещена только в интерфейсе");
          return;
        }

        // Используем новый сервисный метод для перемещения маркера
        await moveMarkerBetweenCollections(
          sourceCategoryId,
          marker.id,
          targetCategoryId
        );

        console.log(
          `Метка ${marker.id} перемещена из коллекции ${sourceCategoryId} в коллекцию ${targetCategoryId}`
        );
      } catch (error) {
        console.error(`Ошибка при перемещении метки ${marker.id}:`, error);
      }
    },

    async loadMarkerContent(marker) {
      if (!marker) return;

      console.log("Загрузка содержимого для маркера:", marker.id);

      try {
        // Получаем токен из cookies
        const token = Cookies.get("access_token");
        if (!token) {
          console.error("Ошибка авторизации: токен отсутствует");
          return;
        }

        // Загрузка статьи по ID маркера
        const response = await fetch(
          `http://localhost:8000/markers/${marker.id}/article`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const article = await response.json();
          console.log("Загружена статья маркера:", article);

          if (article && article.markdown_content) {
            // Преобразуем markdown в блоки для редактора
            const blocks = this.markdownToBlocks(article.markdown_content);

            // Обновляем текущий маркер
            this.currentMarker = {
              ...marker,
              markdownContent: article.markdown_content,
              blocks: blocks,
            };

            console.log("Блоки редактора созданы из markdown:", blocks);
          } else {
            console.warn("Статья не содержит markdown_content");
            // Если нет содержимого в статье, используем пустые блоки
            this.currentMarker = {
              ...marker,
              markdownContent: "",
              blocks: [{ type: "text", content: "" }],
            };
          }
        } else if (response.status === 404) {
          console.log("Статья не найдена, создаем пустую структуру");
          // Если статья не найдена, но есть description, используем его
          if (marker.description) {
            this.currentMarker = {
              ...marker,
              markdownContent: marker.description,
              blocks: this.markdownToBlocks(marker.description),
            };
          } else {
            // Пустые блоки для нового маркера
            this.currentMarker = {
              ...marker,
              markdownContent: "",
              blocks: [{ type: "text", content: "" }],
            };
          }
        } else {
          console.error("Ошибка при загрузке статьи:", await response.text());
          // В случае других ошибок используем description как запасной вариант
          this.currentMarker = {
            ...marker,
            markdownContent: marker.description || "",
            blocks: marker.description
              ? this.markdownToBlocks(marker.description)
              : [{ type: "text", content: "" }],
          };
        }
      } catch (error) {
        console.error("Ошибка при загрузке статьи маркера:", error);
        // В случае ошибки используем description как запасной вариант
        this.currentMarker = {
          ...marker,
          markdownContent: marker.description || "",
          blocks: marker.description
            ? this.markdownToBlocks(marker.description)
            : [{ type: "text", content: "" }],
        };
      }
    },
    async openMarkerEditor(marker) {
      console.log("Открываем редактор для маркера:", marker);
      await this.loadMarkerContent(marker);
      this.showMarkerEditor = true;
    },
    handleMenuAction(action) {
      this.showContextMenu = false;

      switch (action) {
        case "openMarker":
          this.centerMapOnMarker(this.currentMarker);
          break;
        case "editMarker":
          this.showMarkerEditor = true;
          break;
        case "deleteMarker":
          this.confirmDelete(this.currentMarker, "marker");
          break;
        case "renameCategory":
          this.renameCategory(this.currentCategory);
          break;
        case "changeColor":
          this.showColorEditor = true;
          break;
        case "deleteCategory":
          this.confirmDelete(this.currentCategory, "category");
          break;
      }
    },
    centerMapOnMarker(marker) {
      if (marker && marker.position && this.map) {
        this.map.setView(marker.position, 15);

        // Если есть leaflet маркер, открываем его попап
        const leafletMarker = this.leafletMarkers[marker.id];
        if (leafletMarker) {
          leafletMarker.openPopup();
        }

        // Показываем уведомление пользователю
        this.$alert?.info
          ? this.$alert.info(`Метка "${marker.name}" найдена на карте`)
          : console.log(`Метка "${marker.name}" найдена на карте`);
      }
    },
    renameMarker(marker) {
      const newName = prompt("Введите новое название метки:", marker.name);
      if (newName && newName.trim()) {
        marker.name = newName.trim();

        // Обновляем метку на сервере
        this.updateMarkerOnServer(marker);

        // Перерисовываем маркеры на карте
        this.renderMarkers();
      }
    },
    async updateMarkerOnServer(marker) {
      // Пропускаем для локальных маркеров
      if (marker.id.toString().startsWith("local_")) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/markers/${marker.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            title: marker.name,
            latitude: marker.position[0],
            longitude: marker.position[1],
          }),
        });

        if (!response.ok) {
          console.warn(`Не удалось обновить маркер ${marker.id} на сервере`);
        }
      } catch (error) {
        console.error(`Ошибка при обновлении маркера ${marker.id}:`, error);
      }
    },
    onCollectionColorUpdated(updateData) {
      // Обновляем цвет коллекции в интерфейсе
      const category = this.categories.find(
        (c) => c.id === updateData.collectionId
      );
      if (category) {
        category.color = updateData.newColor;

        // Если также нужно обновить цвета маркеров
        if (updateData.markersUpdated) {
          this.renderMarkers();
        }
      }

      // Закрываем редактор цвета
      this.showColorEditor = false;
    },
  },
};
</script>

<style scoped src="@/assets/css/views/MapView.css"></style>