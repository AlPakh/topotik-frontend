<template>
  <div class="app-container">
    <AppHeader />

    <div class="map-container">
      <!-- Боковая панель с категориями и маркерами через отдельный компонент -->
      <MapSidebar
        :categories="categories"
        :mapName="mapName"
        @show-create-panel="showCreatePanel = true"
        @category-toggled="renderMarkers"
        @category-visibility-changed="renderMarkers"
        @marker-visibility-changed="renderMarkers"
        @show-category-menu="showCategoryMenuHandler"
        @show-marker-menu="showMarkerMenuHandler"
        @marker-drop="handleMarkerDrop"
        @category-drop="handleCategoryDrop"
        @marker-drag-start="onMarkerDragStartHandler"
      />

      <div class="map-view">
        <!-- Контейнер карты с пользовательским изображением -->
        <div id="map" class="map-container" ref="mapContainer"></div>

        <!-- Кнопка для шеринга карты -->
        <div class="map-actions-panel">
          <button class="share-button" @click="openShareModal">
            Поделиться
          </button>
        </div>

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

        <!-- Диалог выбора категории для метки -->
        <div
          v-if="showCategoryDialog"
          class="select-category-overlay"
          @click.self="closeCategoryDialog"
        >
          <div class="select-category-dialog">
            <div class="select-dialog-header">
              Выберите категорию для новой метки
            </div>
            <select
              class="category-select"
              v-model="selectedCategoryId"
              @change="onCategorySelected"
            >
              <option value="" disabled selected>Выберите категорию...</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
                :style="{ color: category.color }"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Редактор метки -->
        <MarkerEditor
          v-if="showMarkerEditor"
          :marker="currentMarker"
          :category="currentCategory"
          @save="saveMarkerChanges"
          @close="showMarkerEditor = false"
        />

        <!-- Универсальное контекстное меню -->
        <ContextMenu
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
        <EditCollectionColor
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
// Импорт необходимых компонентов и библиотек
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AppHeader from "@/components/AppHeader.vue";
// Импортируем все необходимые компоненты
import MarkerEditor from "@/components/MarkerEditor.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import EditCollectionColor from "@/components/EditCollectionColor.vue";
import MapSidebar from "@/components/MapSidebar.vue";
import { mapOperationsMixin } from "@/mixins/mapOperations";
import { markerOperationsMixin } from "@/mixins/markerOperations";
import Cookies from "js-cookie";
import { getMapById } from "@/services/maps";
import { moveMarkerBetweenCollections } from "@/services/collections";
import { api } from "@/api";
import { EventBus } from "@/services/eventBus";

// Определение URL API сервера из переменных окружения
const API_URL = process.env.VUE_APP_API_URL || "http://localhost:8000";

export default {
  name: "CustomMapView",
  components: {
    AppHeader,
    MapSidebar,
    MarkerEditor,
    ContextMenu,
    EditCollectionColor,
  },
  // Подключаем миксины для переиспользования логики
  mixins: [mapOperationsMixin, markerOperationsMixin],

  data() {
    return {
      // Основные данные карты
      map: null,
      mapName: "",
      imageOverlay: null,
      imageBounds: null,
      imageLoaded: false,

      // Данные для работы с категориями и маркерами
      categories: [],
      leafletMarkers: {},

      // Состояние интерфейса
      showCreatePanel: false,
      showContextMenu: false,
      showMarkerEditor: false,
      showDeleteConfirmation: false,
      showColorEditor: false,
      showCategoryDialog: false,

      // Данные для работы с меню и метками
      menuPosition: { x: 0, y: 0 },
      contextMenuItems: [],
      currentMarker: null,
      currentCategory: null,
      itemToDelete: null,
      confirmationMessage: "",
      confirmationInput: "",

      // Данные для drag-n-drop
      dragEnterCategory: null,
      dragEnterMarker: null,
      pendingMarkerCategory: null,
      selectedCategoryId: null,

      // Новые поля для контекстного меню
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
    // Инициализируем карту после монтирования компонента
    this.initMap();

    // Удаляем этот вызов, так как он уже вызывается в методе initMap
    // this.loadMapData();

    // Добавляем обработчик клика вне контекстного меню
    document.addEventListener("click", this.handleOutsideClick);
  },

  beforeUnmount() {
    // Удаляем обработчики событий при уничтожении компонента
    document.removeEventListener("click", this.handleOutsideClick);
  },

  methods: {
    /**
     * Открытие модального окна шеринга карты
     */
    openShareModal() {
      EventBus.$emit("open-share-modal", {
        resourceType: "map",
        resourceId: this.$route.params.id,
        owner: this.mapOwner,
      });
    },

    /**
     * Инициализация карты
     */
    async initMap() {
      try {
        console.log("Инициализация пользовательской карты...");

        // Получаем данные карты с использованием сервисной функции
        const mapId = this.$route.params.id;
        const mapData = await getMapById(mapId);

        // Устанавливаем название карты из полученных данных
        if (mapData) {
          this.mapName = mapData.title || "Пользовательская карта";
          console.log(
            "Установлено название пользовательской карты:",
            this.mapName
          );
        }

        // Создаем карту с базовыми настройками
        const mapElement = this.$refs.mapContainer;
        if (!mapElement) {
          console.error("Контейнер для карты не найден");
          return;
        }

        // Удаляем предыдущую карту, если она существует
        if (this.map) {
          try {
            this.map.remove();
          } catch (e) {
            console.warn("Ошибка при удалении старой карты:", e);
          }
        }

        // Создаем новую карту с преднастроенной системой координат
        // Используем нестандартную систему координат, где 0,0 - левый верхний угол
        // а 1000,1000 - правый нижний угол изображения
        const crs = L.CRS.Simple;
        this.map = L.map(mapElement, {
          crs: crs,
          minZoom: -2,
          maxZoom: 2,
          zoomControl: true,
          attributionControl: false,
          center: [500, 500], // Центрируем по умолчанию
          zoom: 0,
          // Отключаем анимацию для предотвращения ошибок
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          // Другие настройки для стабильности
          preferCanvas: true,
          doubleClickZoom: false,
          // Включаем масштабирование колесиком мыши
          scrollWheelZoom: true,
        });

        // Добавляем обработчик закрытия тултипов перед изменением масштаба
        this.map.on("zoomstart", this.closeAllTooltips);
        this.map.on("movestart", this.closeAllTooltips);

        // Добавляем обработчик клика по карте для создания меток
        this.map.on("click", this.onMapClick);

        // Настраиваем элементы управления
        L.control.zoom({ position: "topleft" }).addTo(this.map);

        console.log("Карта успешно инициализирована");

        // Загружаем данные карты (фоновое изображение и метки)
        // Выполняем загрузку с задержкой, чтобы карта успела полностью инициализироваться
        setTimeout(() => this.loadMapData(), 100);
      } catch (error) {
        console.error("Ошибка при инициализации карты:", error);
      }
    },

    /**
     * Получение данных карты по ID
     * @param {string} mapId - ID карты
     * @returns {Object|null} данные карты или null при ошибке
     */
    async getMapById(mapId) {
      try {
        const response = await fetch(`${API_URL}/maps/${mapId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Ошибка при загрузке данных карты: ${response.status}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error(`Ошибка при получении данных карты ${mapId}:`, error);
        return null;
      }
    },

    /**
     * Загрузка данных о карте, коллекциях и маркерах
     */
    async loadMapData() {
      try {
        const mapId = this.$route.params.id;

        // Получаем данные о карте, включая владельца
        try {
          const mapDetails = await getMapById(mapId);
          if (mapDetails) {
            this.mapName =
              mapDetails.title || mapDetails.name || "Пользовательская карта";
            this.mapOwner = mapDetails.owner || null;
            console.log(
              "Данные карты загружены:",
              this.mapName,
              "владелец:",
              this.mapOwner
            );

            // Настраиваем фоновое изображение, если оно существует
            if (
              mapDetails.background_image_url &&
              mapDetails.background_image_id
            ) {
              await this.setupBackgroundImage(mapDetails.background_image_url);
            } else {
              console.error("У карты отсутствует фоновое изображение");

              // Показываем сообщение об ошибке пользователю
              const mapElement = this.$refs.mapContainer;
              if (mapElement) {
                mapElement.innerHTML = `
                  <div class="error-message">
                    <h3>Отсутствует фоновое изображение</h3>
                    <p>Для этой карты не загружено фоновое изображение. Пожалуйста, загрузите изображение через настройки карты.</p>
                  </div>
                `;
                mapElement.style.display = "flex";
                mapElement.style.justifyContent = "center";
                mapElement.style.alignItems = "center";
                mapElement.style.backgroundColor = "#f5f5f5";
                mapElement.style.padding = "20px";
                mapElement.style.textAlign = "center";
                mapElement.style.color = "#ff3333";
              }

              // Прерываем дальнейшую загрузку
              return;
            }
          }
        } catch (err) {
          console.warn("Не удалось получить данные карты:", err);
        }

        // Загружаем коллекции маркеров для этой карты
        this.loadCollectionsFromServer(mapId);
      } catch (e) {
        console.error("Ошибка при загрузке данных карты:", e);
      }
    },

    /**
     * Настройка фонового изображения карты
     * @param {string} imageUrl - URL изображения
     */
    async setupBackgroundImage(imageUrl) {
      try {
        // Добавляем полный URL API, если в URL начинается с /
        const fullImageUrl = imageUrl.startsWith("/")
          ? `${API_URL}${imageUrl}`
          : imageUrl;

        console.log("Загружаем фоновое изображение из URL:", fullImageUrl);

        // Создаем новый экземпляр Image для загрузки изображения
        const img = new Image();

        // Возвращаем Promise, который разрешается после загрузки изображения
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log(
              "Изображение успешно загружено. Размер:",
              img.width,
              "x",
              img.height
            );

            // Устанавливаем границы карты на основе размеров изображения
            const southWest = this.map.unproject([0, img.height], 0);
            const northEast = this.map.unproject([img.width, 0], 0);
            const bounds = new L.LatLngBounds(southWest, northEast);

            // Обновляем границы карты и устанавливаем фоновое изображение
            this.map.setMaxBounds(bounds);

            // Добавляем изображение на карту
            L.imageOverlay(fullImageUrl, bounds).addTo(this.map);

            // Центрируем карту и устанавливаем зум
            this.map.fitBounds(bounds);

            resolve();
          };

          img.onerror = (error) => {
            console.error("Ошибка при загрузке изображения:", error);
            reject(error);
          };

          // Начинаем загрузку изображения
          img.src = fullImageUrl;
        });
      } catch (error) {
        console.error("Ошибка при настройке фонового изображения:", error);
      }
    },

    /**
     * Создание категории "Без категории" по умолчанию
     * @param {string} mapId - ID карты
     * @returns {Object} созданная категория
     */
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
        const response = await api.post("/collections/", {
          title: "Без категории",
          map_id: mapId,
          is_public: false,
          collection_color: defaultColor,
        });

        if (response.data) {
          const newCollection = response.data;

          // Добавляем категорию в список
          const newCategory = {
            id: newCollection.collection_id,
            name: "Без категории",
            color: defaultColor,
            expanded: true,
            visible: true,
            markers: [],
          };

          this.categories.push(newCategory);
          console.log(
            'Создана категория "Без категории" с ID:',
            newCategory.id
          );
          return newCategory;
        } else {
          throw new Error("Ошибка при создании категории на сервере");
        }
      } catch (error) {
        console.error('Ошибка при создании категории "Без категории":', error);

        // В случае ошибки создаем локальную категорию
        const newCategoryId = "local_" + Date.now();
        const localCategory = {
          id: newCategoryId,
          name: "Без категории",
          color: "#8A2BE2",
          expanded: true,
          visible: true,
          markers: [],
        };

        this.categories.push(localCategory);
        console.warn(
          'Создана локальная категория "Без категории" с ID:',
          localCategory.id
        );
        return localCategory;
      }
    },

    /**
     * Загрузка и отображение фонового изображения карты
     * @param {string} imageUrl - URL изображения
     */
    async loadMapImage(imageUrl) {
      try {
        if (!this.map) {
          console.error("Карта не инициализирована");
          this.$notify({
            type: "error",
            title: "Ошибка",
            text: "Не удалось загрузить карту. Повторите попытку позже.",
          });
          return;
        }

        // Удаляем предыдущее изображение, если оно есть
        if (this.imageOverlay) {
          try {
            this.map.removeLayer(this.imageOverlay);
          } catch (e) {
            console.warn("Ошибка при удалении предыдущего изображения:", e);
          }
        }

        // Проверяем, является ли URL относительным
        // Если да, добавляем к нему базовый URL API
        const fullImageUrl = imageUrl.startsWith("/")
          ? `${API_URL}${imageUrl}`
          : imageUrl;

        console.log("Загрузка изображения с URL:", fullImageUrl);

        // Счетчик для повторных попыток
        let retryCount = 0;
        const maxRetries = 3;

        // Функция для загрузки изображения с повторными попытками
        const loadImageWithRetry = () => {
          // Создаем новое изображение
          const img = new Image();

          img.onload = () => {
            // Проверяем, что карта все еще существует
            if (!this.map) {
              console.error(
                "Карта была уничтожена во время загрузки изображения"
              );
              return;
            }

            console.log("Изображение успешно загружено", fullImageUrl);
            console.log("Размеры изображения:", img.width, "x", img.height);

            // Вычисляем соотношение сторон изображения
            const aspectRatio = img.width / img.height;
            console.log("Соотношение сторон изображения:", aspectRatio);

            // Создаем границы с учетом соотношения сторон
            // Базовая высота всегда 1000, ширина зависит от соотношения сторон
            const height = 1000;
            const width = height * aspectRatio;

            // Создаем границы изображения в координатах карты
            // Центрируем изображение по горизонтали, если его ширина не равна 1000
            const offsetX = (width - 1000) / 2;
            this.imageBounds = [
              [0, 0 - offsetX], // верхний левый угол [y, x]
              [height, width - offsetX], // нижний правый угол [y, x]
            ];

            console.log("Границы изображения на карте:", this.imageBounds);

            try {
              // Закрываем все тултипы перед изменением вида карты
              this.closeAllTooltips();

              // Добавляем изображение на карту
              this.imageOverlay = L.imageOverlay(
                fullImageUrl,
                this.imageBounds
              );
              this.imageOverlay.addTo(this.map);

              // Центрируем карту на изображении и приближаем для его полного отображения
              // Используем метод без анимации для предотвращения ошибок
              this.map.fitBounds(this.imageBounds, { animate: false });
              this.imageLoaded = true;
            } catch (error) {
              console.error(
                "Ошибка при добавлении изображения на карту:",
                error
              );
            }
          };

          // Добавляем обработчик ошибок
          img.onerror = (error) => {
            console.error("Ошибка при загрузке изображения:", error);
            console.log("URL изображения:", fullImageUrl);

            // Пробуем загрузить снова, если не превышено максимальное количество попыток
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(
                `Повторная попытка загрузки (${retryCount}/${maxRetries})...`
              );
              setTimeout(loadImageWithRetry, 1000); // Пауза перед повторной попыткой
            } else {
              console.error(
                `Не удалось загрузить изображение после ${maxRetries} попыток.`
              );
              this.$notify({
                type: "error",
                title: "Ошибка загрузки изображения",
                text: "Не удалось загрузить фоновое изображение карты. Проверьте соединение с сервером.",
              });
            }
          };

          // Загружаем изображение
          img.src = fullImageUrl;
        };

        // Запускаем загрузку изображения
        loadImageWithRetry();
      } catch (error) {
        console.error("Ошибка при загрузке изображения:", error);
        this.$notify({
          type: "error",
          title: "Ошибка",
          text:
            "Не удалось загрузить изображение: " +
            (error.message || "неизвестная ошибка"),
        });
      }
    },

    /**
     * Преобразование внутренних координат в координаты Leaflet
     * @param {number} x - координата X (0-1000)
     * @param {number} y - координата Y (0-1000)
     * @return {Array} - координаты в формате Leaflet [lat, lng]
     */
    transformCoordinates(x, y) {
      // Преобразуем координаты из внутренней системы (0-1000) в систему Leaflet
      // y соответствует lat, x соответствует lng
      return [y, x];
    },

    /**
     * Преобразование координат Leaflet во внутренние координаты
     * @param {number} lat - широта
     * @param {number} lng - долгота
     * @return {Array} - координаты в формате [x, y]
     */
    reverseTransformCoordinates(lat, lng) {
      // Преобразуем координаты из системы Leaflet во внутреннюю систему (0-1000)
      return [lng, lat]; // x, y
    },

    // ====== Методы для работы с маркерами ======

    /**
     * Отрисовка маркеров на карте
     */
    renderMarkers() {
      try {
        if (!this.map) {
          console.error("Карта не инициализирована");
          return;
        }

        // Удаляем все существующие маркеры
        Object.values(this.leafletMarkers).forEach((marker) => {
          if (marker) {
            try {
              if (marker.getTooltip && marker.getTooltip()) {
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

        // Для каждой категории отрисовываем маркеры
        this.categories.forEach((category) => {
          if (!category.visible) return; // Пропускаем невидимые категории

          category.markers.forEach((marker) => {
            if (!marker.visible) return; // Пропускаем невидимые маркеры

            try {
              // Получаем координаты маркера
              const { latitude, longitude } = marker;
              const [lat, lng] = this.transformCoordinates(longitude, latitude);

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

              // Создаем маркер Leaflet
              const leafletMarker = L.marker([lat, lng], {
                icon: customIcon,
                interactive: true,
                zIndexOffset: lat * 10,
                riseOnHover: false,
                riseOffset: 0,
                // Включаем возможность перетаскивания маркера
                draggable: true,
              });

              // Добавляем маркер на карту
              leafletMarker.addTo(this.map);

              // Используем событие mouseover вместо tooltip для более стабильной работы
              leafletMarker.on("mouseover", (e) => {
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
                    .setContent(marker.title || marker.name)
                    .openOn(this.map);

                  // Сохраняем ссылку на попап
                  leafletMarker.bindPopup(popup);
                } catch (err) {
                  console.warn("Ошибка при создании попапа:", err);
                }
              });

              // Закрываем попап при уходе мыши
              leafletMarker.on("mouseout", () => {
                try {
                  this.map.closePopup();
                } catch (err) {
                  console.warn("Ошибка при закрытии попапа:", err);
                }
              });

              // Добавляем обработчик клика
              leafletMarker.on("click", () => {
                try {
                  this.map.closePopup();
                  this.openMarkerDetails(marker, category);
                } catch (err) {
                  console.warn("Ошибка при обработке клика на маркер:", err);
                }
              });

              // Добавляем обработчик окончания перетаскивания маркера
              leafletMarker.on("dragend", () => {
                try {
                  const markerId = marker.id || marker.marker_id;
                  this.updateMarkerPosition(leafletMarker, markerId);
                } catch (err) {
                  console.error(
                    "Ошибка при обработке перетаскивания маркера:",
                    err
                  );
                }
              });

              // Сохраняем ссылку на маркер
              this.leafletMarkers[marker.id] = leafletMarker;
            } catch (err) {
              console.error("Ошибка при создании маркера:", err);
            }
          });
        });
      } catch (error) {
        console.error("Ошибка при отрисовке маркеров:", error);
      }
    },

    /**
     * Обработчик клика по карте для создания маркера
     * @param {Object} e - событие клика
     */
    async onMapClick(e) {
      console.log(
        "Метод onMapClick() вызван - пользователь кликнул на карту в координатах:",
        e.latlng
      );

      // Проверяем, что карта существует
      if (!this.map) {
        console.error("Карта не инициализирована в обработчике клика");
        return;
      }

      // Проверяем, находимся ли мы в режиме создания маркера
      if (!this.showCreatePanel && !this.pendingMarkerCategory) return;

      // Если у нас нет выбранной категории, предлагаем выбрать
      if (!this.pendingMarkerCategory) {
        console.log("Запрашиваем категорию для метки");

        // Показываем диалог выбора категории
        this.showCategoryDialog = true;

        // Сохраняем координаты для последующего создания маркера
        const { lat, lng } = e.latlng;
        const [x, y] = this.reverseTransformCoordinates(lat, lng);

        // Сохраняем координаты во временные переменные
        this.pendingMarkerCoordinates = {
          latitude: y,
          longitude: x,
        };

        return;
      }

      console.log(
        "Режим создания метки активен, категория:",
        this.pendingMarkerCategory
      );

      // Создаем маркер в выбранной категории
      const { lat, lng } = e.latlng;
      const [x, y] = this.reverseTransformCoordinates(lat, lng);
      const category = this.categories.find(
        (c) => c.id === this.pendingMarkerCategory
      );

      if (category) {
        console.log("Найдена категория для метки:", category.name);
        const mapId = this.$route.params.id;
        const defaultName = "Метка " + (category.markers.length + 1);

        console.log("Данные метки:", {
          mapId: mapId,
          position: [y, x],
          name: defaultName,
          categoryId: category.id,
        });

        try {
          const newMarkerId = await this.createMarkerInCategory(
            y,
            x,
            this.pendingMarkerCategory,
            defaultName
          );

          console.log(`Маркер успешно создан с ID ${newMarkerId}`);

          // Сбрасываем режим создания маркера
          this.showCreatePanel = false;
          this.pendingMarkerCategory = null;

          // Возвращаем курсор в нормальное состояние
          document.getElementById("map").classList.remove("adding-marker-mode");

          // Удаляем обработчик правой кнопки мыши
          document
            .getElementById("map")
            .removeEventListener("contextmenu", this.cancelMarkerCreation);

          console.log("Режим создания метки деактивирован");

          // Сохраняем изменения
          this.saveMapData();
        } catch (error) {
          console.error("Ошибка при создании маркера:", error);
          alert("Не удалось создать маркер. Повторите попытку позже.");
        }
      } else {
        console.error("Категория не найдена:", this.pendingMarkerCategory);
      }
    },

    /**
     * Отображение редактора для маркера
     * @param {Object} marker - маркер
     * @param {Object} category - категория
     */
    async openMarkerDetails(marker, category) {
      // Закрываем все открытые тултипы
      this.closeAllTooltips();

      // Центрируем карту на выбранном маркере
      this.centerMapOnMarker(marker);

      // Загружаем содержимое маркера с сервера
      await this.loadMarkerContent(marker);

      // Устанавливаем текущий маркер и категорию
      this.currentCategory = category;

      // Показываем редактор маркера
      this.showMarkerEditor = true;
    },

    /**
     * Загрузка содержимого маркера (markdown статьи) с сервера
     * @param {Object} marker - маркер
     */
    async loadMarkerContent(marker) {
      if (!marker) return;

      console.log(
        "Загрузка содержимого для маркера:",
        marker.id || marker.marker_id
      );

      try {
        // Используем копию маркера, чтобы сохранить исходные данные
        this.currentMarker = { ...marker };

        // Получаем ID маркера
        const markerId = marker.id || marker.marker_id;

        // Если это локальный маркер, не загружаем с сервера
        if (markerId.toString().startsWith("local_")) {
          console.log("Локальный маркер, не загружаем содержимое с сервера");
          return;
        }

        // Загружаем статью маркера с сервера
        const response = await api.get(`/markers/${markerId}/article`);

        if (response.data) {
          const article = response.data;
          console.log("Загружена статья маркера:", article);

          if (article && article.markdown_content !== undefined) {
            // Обновляем данные текущего маркера
            this.currentMarker.markdownContent = article.markdown_content;

            // Также обновляем маркер в коллекции
            this.updateMarkerInCategories(markerId, {
              markdownContent: article.markdown_content,
            });
          }
        } else {
          console.warn(`Не удалось загрузить статью для маркера ${markerId}`);
        }
      } catch (error) {
        console.error("Ошибка при загрузке статьи маркера:", error);
      }
    },

    /**
     * Закрытие всех тултипов на карте
     */
    closeAllTooltips() {
      if (!this.map) return;

      // Закрываем все тултипы маркеров
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
    },

    // ====== Методы для работы с категориями ======

    /**
     * Переключение свернутости/развернутости категории
     * @param {Object} category - категория
     */
    toggleCategory(category) {
      category.expanded = !category.expanded;
    },

    /**
     * Переключение видимости категории
     * @param {Object} category - категория
     */
    toggleCategoryVisibility(category) {
      category.visible = !category.visible;

      // Обновляем видимость всех маркеров категории
      category.markers.forEach((marker) => {
        marker.visible = category.visible;
      });

      // Перерисовываем маркеры на карте
      this.renderMarkers();
    },

    /**
     * Переключение видимости маркера
     * @param {Object} marker - маркер
     */
    toggleMarkerVisibility(marker) {
      marker.visible = !marker.visible;

      // Перерисовываем маркеры на карте
      this.renderMarkers();
    },

    /**
     * Создание новой категории
     */
    async createCategory() {
      try {
        // Закрываем панель создания
        this.showCreatePanel = false;

        const mapId = this.$route.params.id;

        // Запрашиваем у пользователя название категории
        const categoryName = prompt("Введите название категории:");
        if (!categoryName || !categoryName.trim()) return;

        // Генерируем случайный цвет
        const randomColor =
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0");

        // Создаем коллекцию на сервере
        const response = await fetch(`${API_URL}/collections/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            title: categoryName.trim(),
            map_id: mapId,
            is_public: false,
            collection_color: randomColor,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ошибка при создании коллекции: ${response.status}`);
        }

        // Получаем данные созданной коллекции
        const newCollection = await response.json();

        // Добавляем новую категорию в локальные данные
        this.categories.push({
          id: newCollection.collection_id,
          name: categoryName.trim(),
          color: randomColor,
          expanded: true,
          visible: true,
          markers: [],
        });

        console.log(`Категория "${categoryName}" успешно создана`);

        // Сохраняем данные карты
        this.saveMapData();
      } catch (error) {
        console.error("Ошибка при создании категории:", error);
      }
    },

    /**
     * Инициирование процесса создания маркера
     */
    createMarker() {
      console.log(
        'Метод createMarker() вызван - пользователь нажал на опцию "Метка на карте"'
      );

      // Закрываем панель создания
      this.showCreatePanel = false;

      // Если нет категорий, предлагаем создать категорию
      if (this.categories.length === 0) {
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
        alert("Кликните на карту, чтобы создать маркер");

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

      // Отображаем диалог выбора категории
      this.selectedCategoryId = ""; // Устанавливаем пустое значение для плейсхолдера
      this.showCategoryDialog = true;
    },

    /**
     * Обработчик выбора категории для маркера
     */
    onCategorySelected() {
      if (!this.selectedCategoryId) {
        alert("Пожалуйста, выберите категорию из списка!");
        return;
      }

      const selectedCategory = this.categories.find(
        (c) => c.id === this.selectedCategoryId
      );

      console.log(
        "Пользователь выбрал категорию:",
        selectedCategory ? selectedCategory.name : "неизвестная",
        "(ID:",
        this.selectedCategoryId,
        ")"
      );

      // Сохраняем выбранную категорию и закрываем диалог
      this.pendingMarkerCategory = this.selectedCategoryId;
      this.showCategoryDialog = false;

      alert("Кликните на карту, чтобы создать маркер");

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
    },

    /**
     * Отмена создания маркера
     * @param {Event} event - событие
     */
    cancelMarkerCreation(event) {
      console.log(
        "Метод cancelMarkerCreation() вызван - пользователь отменил создание метки правым кликом"
      );

      // Предотвращаем стандартное контекстное меню
      if (event) {
        event.preventDefault();
      }

      // Выходим из режима создания метки
      this.pendingMarkerCategory = null;
      this.pendingMarkerCoordinates = null;

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

    // ====== Методы для работы с контекстным меню ======

    /**
     * Показывает контекстное меню для категории
     * @param {Object} data - данные с категорией и позицией меню
     */
    showCategoryMenuHandler(data) {
      // Сохраняем текущую категорию
      this.currentCategory = data.category;
      this.selectedContextType = "category";

      // Устанавливаем позицию меню
      this.menuPosition = data.position;

      // Определяем пункты меню
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

      // Показываем меню
      this.showContextMenu = true;
    },

    /**
     * Показывает контекстное меню для маркера
     * @param {Object} data - данные с маркером, категорией и позицией меню
     */
    showMarkerMenuHandler(data) {
      // Сохраняем текущий маркер и категорию
      this.currentMarker = data.marker;
      this.currentCategory = data.category;
      this.selectedContextType = "marker";

      // Устанавливаем позицию меню
      this.menuPosition = data.position;

      // Определяем пункты меню
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

      // Показываем меню
      this.showContextMenu = true;
    },

    /**
     * Обработчик выбора действия в контекстном меню
     * @param {string} action - выбранное действие
     */
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

    /**
     * Перемещение маркера между категориями
     * @param {Object} marker - маркер
     * @param {string} sourceCategoryId - ID исходной категории
     * @param {string} targetCategoryId - ID целевой категории
     */
    async moveMarkerToCategory(marker, sourceCategoryId, targetCategoryId) {
      // Проверяем наличие данных
      if (!marker) {
        console.error("Ошибка: маркер не определен");
        return;
      }

      // Проверяем наличие ID маркера
      const markerId = marker.id || marker.marker_id;
      if (!markerId) {
        console.error("Ошибка: ID маркера не определен", marker);
        return;
      }

      // Проверяем равенство категорий
      if (sourceCategoryId === targetCategoryId) {
        console.log(
          "Категории источника и назначения совпадают, операция отменена"
        );
        return;
      }

      try {
        // Если метка локальная, не делаем запрос на сервер
        if (markerId.toString().startsWith("local_")) {
          console.warn("Локальная метка перемещена только в интерфейсе");

          // Находим целевую категорию
          const targetCategory = this.categories.find(
            (c) => c.id === targetCategoryId
          );
          if (!targetCategory) return;

          // Находим метку в исходной категории
          const sourceCategory = this.categories.find(
            (c) => c.id === sourceCategoryId
          );
          if (!sourceCategory) return;

          const markerIndex = sourceCategory.markers.findIndex(
            (m) => m.id === markerId || m.marker_id === markerId
          );
          if (markerIndex === -1) return;

          // Копируем метку
          const markerCopy = { ...sourceCategory.markers[markerIndex] };

          // Удаляем из исходной категории
          sourceCategory.markers.splice(markerIndex, 1);

          // Добавляем в целевую категорию
          targetCategory.markers.push(markerCopy);

          // Перерисовываем маркеры
          this.renderMarkers();
          return;
        }

        // Используем сервисную функцию для перемещения маркера между коллекциями
        await moveMarkerBetweenCollections(
          sourceCategoryId,
          markerId,
          targetCategoryId
        );

        console.log(
          `Маркер ${markerId} успешно перемещен из коллекции ${sourceCategoryId} в коллекцию ${targetCategoryId}`
        );

        // Находим целевую категорию
        const targetCategory = this.categories.find(
          (c) => c.id === targetCategoryId
        );
        if (!targetCategory) return;

        // Находим метку в исходной категории
        const sourceCategory = this.categories.find(
          (c) => c.id === sourceCategoryId
        );
        if (!sourceCategory) return;

        const markerIndex = sourceCategory.markers.findIndex(
          (m) => m.id === markerId || m.marker_id === markerId
        );
        if (markerIndex === -1) return;

        // Копируем метку
        const markerCopy = { ...sourceCategory.markers[markerIndex] };

        // Удаляем из исходной категории
        sourceCategory.markers.splice(markerIndex, 1);

        // Добавляем в целевую категорию
        targetCategory.markers.push(markerCopy);

        // Перерисовываем маркеры
        this.renderMarkers();
      } catch (error) {
        console.error("Ошибка при перемещении маркера:", error);
      }
    },

    /**
     * Центрирование карты на маркере
     * @param {Object} marker - маркер, на котором нужно центрировать карту
     */
    centerMapOnMarker(marker) {
      if (!this.map) {
        console.error("Карта не инициализирована");
        return;
      }

      try {
        // Закрываем все тултипы перед изменением вида карты
        this.closeAllTooltips();

        // Получаем координаты маркера
        const { latitude, longitude } = marker;
        const [lat, lng] = this.transformCoordinates(longitude, latitude);

        // Центрируем карту на маркере
        this.map.setView([lat, lng], this.map.getZoom());

        // Открываем тултип маркера, если он есть
        const leafletMarker = this.leafletMarkers[marker.id];
        if (leafletMarker) {
          if (leafletMarker.getPopup) {
            leafletMarker.openPopup();
          }
        }

        // Показываем уведомление пользователю
        this.$notify?.info
          ? this.$notify.info(
              `Метка "${marker.name || marker.title}" найдена на карте`
            )
          : console.log(
              `Метка "${marker.name || marker.title}" найдена на карте`
            );
      } catch (error) {
        console.error("Ошибка при центрировании карты на маркере:", error);
      }
    },

    /**
     * Обработчик обновления цвета коллекции
     * @param {Object} updateData - данные обновления
     */
    onCollectionColorUpdated(updateData) {
      // Обновляем цвет коллекции в интерфейсе
      const category = this.categories.find(
        (c) =>
          c.id === updateData.collectionId || c.id === updateData.categoryId
      );

      if (category) {
        category.color = updateData.newColor;

        // Если нужно обновить цвета маркеров
        this.renderMarkers();

        // Сохраняем изменения на сервере
        this.saveMapData();
      }

      // Закрываем редактор цвета
      this.showColorEditor = false;
    },

    // ====== Методы для изменения данных ======

    /**
     * Сохранение изменений в маркере
     * @param {Object} updatedMarkerData - обновленные данные маркера
     * @return {boolean} - успешность операции
     */
    async saveMarkerChanges(updatedMarkerData) {
      try {
        console.log("Сохранение изменений маркера:", updatedMarkerData);

        // Проверяем наличие ID маркера и используем правильное свойство
        const markerId = updatedMarkerData.marker_id || updatedMarkerData.id;

        if (!markerId) {
          console.error("Ошибка: ID маркера не определен", updatedMarkerData);
          throw new Error("ID маркера не определен");
        }

        // Сначала обновляем markdown-содержимое
        if (updatedMarkerData.markdownContent !== undefined) {
          console.log(
            "Сохранение Markdown:",
            updatedMarkerData.markdownContent
          );

          try {
            // Обновляем статью маркера
            await api.put(`/markers/${markerId}/article`, {
              markdown_content: updatedMarkerData.markdownContent,
            });

            console.log("Статья для маркера успешно обновлена");
          } catch (articleError) {
            console.error(
              "Ошибка при обновлении статьи маркера:",
              articleError
            );
          }
        }

        // Затем обновляем основные данные маркера, включая название
        // Даем приоритет name над title, т.к. name - это то, что пользователь изменяет в интерфейсе
        const name = updatedMarkerData.name || updatedMarkerData.title;

        const markerData = {
          latitude:
            updatedMarkerData.latitude || updatedMarkerData.position?.[0],
          longitude:
            updatedMarkerData.longitude || updatedMarkerData.position?.[1],
          title: name, // Используем name в качестве title для сервера
          description: updatedMarkerData.description || "Описание метки",
        };

        console.log("Отправка данных маркера на сервер:", markerData);

        const response = await api.put(`/markers/${markerId}`, markerData);

        if (response.data) {
          console.log("Маркер успешно обновлен:", response.data);

          // Обновляем маркер в списке категорий
          const updatedFields = {
            ...updatedMarkerData,
            title: name, // Убедимся, что title обновлен
            name: name, // Убедимся, что name обновлен
          };

          this.updateMarkerInCategories(markerId, updatedFields);

          // Перерисовываем маркеры на карте
          this.renderMarkers();

          // Сохраняем все изменения карты
          this.saveMapData();

          return true;
        } else {
          console.error("Ошибка при обновлении маркера");
          return false;
        }
      } catch (error) {
        console.error("Ошибка при сохранении изменений маркера:", error);
        return false;
      }
    },

    /**
     * Обновить маркер в списке категорий
     * @param {string} markerId - ID маркера
     * @param {Object} updatedData - обновленные данные
     */
    updateMarkerInCategories(markerId, updatedData) {
      // Ищем маркер в каждой категории
      for (const category of this.categories) {
        const markerIndex = category.markers.findIndex(
          (m) => m.id === markerId || m.marker_id === markerId
        );

        if (markerIndex !== -1) {
          // Обновляем данные маркера с сохранением ссылки на объект
          const marker = category.markers[markerIndex];
          if (updatedData.name) marker.name = updatedData.name;
          if (updatedData.title) marker.title = updatedData.title;
          if (updatedData.description)
            marker.description = updatedData.description;
          if (updatedData.markdownContent)
            marker.markdownContent = updatedData.markdownContent;
          if (updatedData.blocks) marker.blocks = updatedData.blocks;

          console.log("Маркер обновлен в категории:", category.name);
          break;
        }
      }
    },

    /**
     * Сохранение всех данных карты
     */
    async saveMapData() {
      try {
        const mapId = this.$route.params.id;

        // Сохраняем каждую категорию как коллекцию
        for (const category of this.categories) {
          const collectionData = {
            title: category.name,
            map_id: mapId,
            is_public: false,
            collection_color: category.color,
          };

          let collectionId = category.id;

          // Если у категории нет ID или ID локальный, создаем новую коллекцию
          if (!collectionId || collectionId.toString().startsWith("local_")) {
            try {
              const response = await api.post("/collections/", collectionData);

              if (response.data) {
                const newCollection = response.data;
                collectionId = newCollection.collection_id;
                category.id = collectionId; // Обновляем ID категории
                console.log(
                  `Создана новая коллекция ${collectionId} для карты ${mapId}`
                );
              } else {
                throw new Error("Ошибка при создании коллекции: ответ пуст");
              }
            } catch (error) {
              console.error("Ошибка при создании коллекции:", error);
              continue;
            }
          } else {
            // Обновляем существующую коллекцию
            try {
              const response = await api.put(
                `/collections/${collectionId}`,
                collectionData
              );

              if (!response.data) {
                console.warn(`Не удалось обновить коллекцию ${collectionId}`);
              } else {
                console.log(`Коллекция ${collectionId} успешно обновлена`);
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
            // Преобразуем блоки в markdown если нужно
            if (!marker.markdownContent && marker.blocks) {
              marker.markdownContent = this.blocksToMarkdown(marker.blocks);
            }

            const markerData = {
              latitude: marker.latitude || marker.position[0],
              longitude: marker.longitude || marker.position[1],
              title: marker.name,
              description: marker.markdownContent
                ? marker.markdownContent.substring(0, 100)
                : "", // Краткое описание
            };

            let markerId = marker.id;

            // Если у маркера нет ID или ID локальный, создаем новый
            if (!markerId || markerId.toString().startsWith("local_")) {
              try {
                // Создаем маркер
                const markerResponse = await api.post("/markers/", {
                  ...markerData,
                  map_id: mapId,
                });

                if (markerResponse.data) {
                  const newMarker = markerResponse.data;
                  markerId = newMarker.marker_id;
                  marker.id = markerId; // Обновляем ID маркера
                  console.log(
                    `Создан новый маркер ${markerId} для карты ${mapId}`
                  );

                  // Добавляем маркер в коллекцию
                  const addToCollectionResponse = await api.post(
                    `/collections/${collectionId}/markers`,
                    {
                      marker_id: markerId,
                    }
                  );

                  if (!addToCollectionResponse.data) {
                    console.warn(
                      `Не удалось добавить маркер ${markerId} в коллекцию ${collectionId}`
                    );
                  } else {
                    console.log(
                      `Маркер ${markerId} успешно добавлен в коллекцию ${collectionId}`
                    );
                  }

                  // Создаем статью для маркера
                  if (marker.markdownContent) {
                    const articleResponse = await api.post(
                      `/markers/${markerId}/article`,
                      {
                        markdown_content: marker.markdownContent,
                      }
                    );

                    if (!articleResponse.data) {
                      console.warn(
                        `Не удалось создать статью для маркера ${markerId}`
                      );
                    } else {
                      console.log(
                        `Статья для маркера ${markerId} успешно создана`
                      );
                    }
                  }
                } else {
                  throw new Error("Ошибка при создании маркера: ответ пуст");
                }
              } catch (error) {
                console.error("Ошибка при создании маркера:", error);
                continue;
              }
            } else {
              // Обновляем существующий маркер
              try {
                const markerResponse = await api.put(
                  `/markers/${markerId}`,
                  markerData
                );

                if (!markerResponse.data) {
                  console.warn(`Не удалось обновить маркер ${markerId}`);
                } else {
                  console.log(`Маркер ${markerId} успешно обновлен`);
                }

                // Обновляем статью для маркера
                if (marker.markdownContent) {
                  const articleResponse = await api.put(
                    `/markers/${markerId}/article`,
                    {
                      markdown_content: marker.markdownContent,
                    }
                  );

                  if (!articleResponse.data) {
                    console.warn(
                      `Не удалось обновить статью для маркера ${markerId}`
                    );
                  } else {
                    console.log(
                      `Статья для маркера ${markerId} успешно обновлена`
                    );
                  }
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

        console.log("Данные карты успешно сохранены на сервере");

        // Перерисовываем маркеры для отображения обновленных данных
        this.renderMarkers();
      } catch (e) {
        console.error("Ошибка при сохранении данных карты:", e);
      }
    },

    /**
     * Переименование категории
     * @param {Object} category - категория
     */
    renameCategory(category) {
      const newName = prompt(
        "Введите новое название категории:",
        category.name
      );
      if (newName && newName.trim()) {
        // Получаем ID карты из параметров маршрута
        const mapId = this.$route.params.id;

        // Обновляем коллекцию на сервере с полным набором данных
        fetch(`${API_URL}/collections/${category.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
          body: JSON.stringify({
            title: newName.trim(),
            map_id: mapId, // Добавляем ID карты - обязательное поле
            is_public:
              category.is_public !== undefined ? category.is_public : false, // Добавляем флаг публичности
            collection_color: category.color || "#000000", // Используем цвет категории или значение по умолчанию
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Ошибка при обновлении коллекции: ${response.status}`
              );
            }
            return response.json();
          })
          .then((data) => {
            console.log("Коллекция успешно обновлена:", data);

            // Обновляем название в локальных данных
            category.name = newName.trim();

            // Сохраняем обновленную карту
            this.saveMapData();
          })
          .catch((error) => {
            console.error("Ошибка при переименовании коллекции:", error);
          });
      }
    },

    /**
     * Подготовка диалога подтверждения удаления
     * @param {Object} item - удаляемый элемент
     * @param {string} type - тип элемента ('marker' или 'category')
     */
    confirmDelete(item, type) {
      this.itemToDelete = item;

      if (type === "marker") {
        const markerName = item.title || item.name || "метка";
        this.confirmationMessage = `Вы действительно хотите удалить метку "${markerName}"?`;
        // Для маркеров не требуем подтверждения вводом названия
        this.confirmationInput = markerName;
      } else if (type === "category") {
        this.confirmationMessage = `Вы действительно хотите удалить категорию "${item.name}" и все её метки?
        Это действие необратимо. Для подтверждения введите название категории.`;
        this.confirmationInput = "";
      }

      this.showDeleteConfirmation = true;
    },

    /**
     * Отмена удаления
     */
    cancelDelete() {
      this.showDeleteConfirmation = false;
      this.itemToDelete = null;
      this.confirmationMessage = "";
      this.confirmationInput = "";
    },

    /**
     * Подтверждение действия удаления
     */
    confirmDeleteAction() {
      const item = this.itemToDelete;

      if (!item) {
        this.cancelDelete();
        return;
      }

      if (item.title !== undefined || item.name !== undefined) {
        // Это маркер - не проверяем ввод, просто удаляем
        const categoryId = this.currentCategory.id;

        // Правильное определение ID маркера
        // Проверяем свойства marker_id и id в этом порядке, так как marker_id более вероятно является правильным ID маркера
        const markerId = item.marker_id || item.id;

        if (!markerId) {
          console.error("Ошибка: ID маркера не определен", item);
          this.cancelDelete();
          return;
        }

        // Проверка, что markerId не совпадает с ID коллекции
        if (markerId === categoryId) {
          console.error("Ошибка: ID маркера совпадает с ID коллекции", {
            markerId,
            categoryId,
          });
          this.cancelDelete();
          return;
        }

        // Удаляем маркер с сервера
        this.deleteMarkerFromServer(markerId)
          .then((success) => {
            if (success) {
              // Обновляем локальные данные
              const categoryIndex = this.categories.findIndex(
                (c) => c.id === categoryId
              );
              if (categoryIndex !== -1) {
                const markerIndex = this.categories[
                  categoryIndex
                ].markers.findIndex(
                  (m) => m.marker_id === markerId || m.id === markerId
                );
                if (markerIndex !== -1) {
                  // Получаем объект маркера перед удалением, чтобы иметь правильную ссылку
                  const markerToDelete =
                    this.categories[categoryIndex].markers[markerIndex];

                  // Удаляем маркер из массива категории
                  this.categories[categoryIndex].markers.splice(markerIndex, 1);

                  // Удаляем маркер с карты используя правильный ID
                  const leafletMarkerId =
                    markerToDelete.marker_id || markerToDelete.id;
                  if (this.leafletMarkers[leafletMarkerId]) {
                    this.map.removeLayer(this.leafletMarkers[leafletMarkerId]);
                    delete this.leafletMarkers[leafletMarkerId];
                    console.log(`Маркер ${leafletMarkerId} удален с карты`);
                  }
                }
              }
            } else {
              console.warn(
                "Не удалось удалить маркер на сервере, но удаляем из интерфейса"
              );
              // Всё равно удаляем маркер из интерфейса
              const categoryIndex = this.categories.findIndex(
                (c) => c.id === categoryId
              );
              if (categoryIndex !== -1) {
                const markerIndex = this.categories[
                  categoryIndex
                ].markers.findIndex(
                  (m) => m.marker_id === markerId || m.id === markerId
                );
                if (markerIndex !== -1) {
                  // Получаем объект маркера перед удалением, чтобы иметь правильную ссылку
                  const markerToDelete =
                    this.categories[categoryIndex].markers[markerIndex];

                  // Удаляем маркер из массива категории
                  this.categories[categoryIndex].markers.splice(markerIndex, 1);

                  // Удаляем маркер с карты используя правильный ID
                  const leafletMarkerId =
                    markerToDelete.marker_id || markerToDelete.id;
                  if (this.leafletMarkers[leafletMarkerId]) {
                    this.map.removeLayer(this.leafletMarkers[leafletMarkerId]);
                    delete this.leafletMarkers[leafletMarkerId];
                    console.log(`Маркер ${leafletMarkerId} удален с карты`);
                  }
                }
              }
            }

            // Сохраняем изменения
            this.saveMapData();
          })
          .catch((error) => {
            console.error("Ошибка при удалении маркера:", error);
          });
      } else {
        // Это категория - проверяем соответствие ввода
        if (this.confirmationInput !== item.name) {
          alert("Название категории введено неверно. Удаление отменено.");
          this.cancelDelete();
          return;
        }

        // Удаляем коллекцию с сервера
        fetch(`${API_URL}/collections/${item.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${Cookies.get("access_token")}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Ошибка при удалении коллекции: ${response.status}`
              );
            }

            // Обновляем локальные данные
            const categoryIndex = this.categories.findIndex(
              (c) => c.id === item.id
            );
            if (categoryIndex !== -1) {
              // Удаляем маркеры с карты
              this.categories[categoryIndex].markers.forEach((marker) => {
                const markerId = marker.id || marker.marker_id;
                if (markerId && this.leafletMarkers[markerId]) {
                  this.map.removeLayer(this.leafletMarkers[markerId]);
                  delete this.leafletMarkers[markerId];
                }
              });

              // Удаляем категорию из списка
              this.categories.splice(categoryIndex, 1);

              // Сохраняем изменения
              this.saveMapData();
            }
          })
          .catch((error) => {
            console.error("Ошибка при удалении коллекции:", error);
          });
      }

      this.cancelDelete();
    },

    /**
     * Удаление маркера с сервера
     */
    async deleteMarkerFromServer(markerId) {
      if (!markerId) {
        console.error("Ошибка: ID маркера не определен");
        return false;
      }

      // Проверяем, что markerId не используется как ID коллекции
      try {
        // Пытаемся получить данные маркера перед удалением
        const markerCheckResponse = await api.get(`/markers/${markerId}`);
        if (!markerCheckResponse.data || markerCheckResponse.status !== 200) {
          console.error(
            `ID ${markerId} не является валидным идентификатором маркера`
          );
          return false;
        }
      } catch (checkError) {
        console.error(
          `Ошибка при проверке ID маркера ${markerId}:`,
          checkError
        );
        return false;
      }

      try {
        console.log(`Отправка запроса на удаление маркера с ID ${markerId}`);

        // Сначала удаляем маркер из всех коллекций
        try {
          console.log(
            `Получение списка коллекций для карты ${this.$route.params.id}...`
          );
          // Используем map_id напрямую как основной параметр для получения коллекций
          const mapId = this.$route.params.id;
          const collectionsResponse = await api.get(
            `/collections/?map_id=${mapId}`
          );

          const collections = Array.isArray(collectionsResponse.data)
            ? collectionsResponse.data
            : collectionsResponse.data.collections || [];

          console.log(`Получено ${collections.length} коллекций`);

          // Удаляем маркер из каждой коллекции
          for (const collection of collections) {
            try {
              // Проверяем, что не пытаемся удалить маркер с ID, совпадающим с ID коллекции
              if (markerId === collection.collection_id) {
                console.warn(
                  `Пропуск удаления: ID маркера (${markerId}) совпадает с ID коллекции`
                );
                continue;
              }

              console.log(
                `Удаление маркера ${markerId} из коллекции ${collection.collection_id}...`
              );

              // Сначала проверяем, что маркер действительно есть в коллекции
              try {
                const checkResponse = await api.get(
                  `/collections/${collection.collection_id}/markers`
                );

                const markers = checkResponse.data || [];
                const markerExists = markers.some(
                  (m) => m.marker_id === markerId || m.id === markerId
                );

                if (!markerExists) {
                  console.log(
                    `Маркер ${markerId} не найден в коллекции ${collection.collection_id}, пропускаем удаление`
                  );
                  continue;
                }
              } catch (checkError) {
                console.warn(
                  `Не удалось проверить наличие маркера в коллекции:`,
                  checkError
                );
              }

              await api.delete(
                `/collections/${collection.collection_id}/markers/${markerId}`
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
        } catch (collectionsError) {
          console.warn(
            "Ошибка при получении или обработке коллекций:",
            collectionsError
          );
        }

        // После удаления из всех коллекций, удаляем сам маркер
        // Удаляем маркер из коллекции с использованием api
        await api.delete(`/markers/${markerId}`);

        console.log(`Маркер ${markerId} успешно удален с сервера`);
        return true;
      } catch (error) {
        console.error("Ошибка при удалении маркера:", error);

        // Если ошибка связана с сетью или соединением, считаем что маркер удален из UI
        if (
          error.name === "TypeError" ||
          error.message.includes("network") ||
          error.message.includes("connection") ||
          error.response?.status === 404 ||
          error.response?.status === 500
        ) {
          console.warn(
            "Сетевая ошибка или маркер не найден, удаляем из интерфейса"
          );
          return true;
        }

        return false;
      }
    },

    /**
     * Создание маркера в выбранной категории
     * @param {number} latitude - широта
     * @param {number} longitude - долгота
     * @param {string} categoryId - ID категории
     * @param {string} title - название маркера
     */
    async createMarkerInCategory(latitude, longitude, categoryId, title) {
      try {
        const mapId = this.$route.params.id;
        console.log("Создание маркера с параметрами:", {
          latitude,
          longitude,
          title,
          mapId,
          categoryId,
        });

        // Создаем маркер на сервере
        const markerResponse = await api.post("/markers/", {
          latitude,
          longitude,
          title,
          description: "Описание метки",
          map_id: mapId,
        });

        if (!markerResponse.data) {
          throw new Error("Ошибка при создании маркера");
        }

        const newMarker = markerResponse.data;
        const markerId = newMarker.marker_id || newMarker.id;

        console.log("Маркер успешно создан на сервере с ID:", markerId);

        if (!markerId) {
          throw new Error("Не удалось получить ID созданного маркера");
        }

        // Добавляем маркер в коллекцию
        console.log("Добавляем маркер в коллекцию", categoryId);
        const addToCollectionResponse = await api.post(
          `/collections/${categoryId}/markers`,
          {
            marker_id: markerId,
          }
        );

        if (!addToCollectionResponse.data) {
          console.warn(
            `Не удалось добавить маркер ${markerId} в коллекцию ${categoryId}`
          );
        } else {
          console.log("Маркер успешно добавлен в коллекцию");
        }

        // Создаем статью для маркера с базовым содержимым
        console.log("Создаем статью для маркера");
        const markdownContent = `# ${title}\nОписание метки`;
        const articleResponse = await api.post(`/markers/${markerId}/article`, {
          markdown_content: markdownContent,
        });

        if (!articleResponse.data) {
          console.warn(`Не удалось создать статью для маркера ${markerId}`);
        } else {
          console.log("Статья для маркера успешно создана");
        }

        // Находим категорию и добавляем в неё маркер локально
        const category = this.categories.find((c) => c.id === categoryId);
        if (category) {
          const markerItem = {
            id: markerId,
            marker_id: markerId, // Добавляем для совместимости
            title: title,
            name: title,
            latitude,
            longitude,
            visible: true,
            position: [latitude, longitude], // Совместимость с MapView.vue
            blocks: [
              { type: "heading1", content: title },
              { type: "text", content: "Описание метки" },
            ],
            markdownContent: markdownContent,
          };

          category.markers.push(markerItem);

          // Перерисовываем маркеры
          this.renderMarkers();
        }

        return markerId;
      } catch (error) {
        console.error("Ошибка при создании маркера:", error);
        throw error;
      }
    },

    /**
     * Начало перетаскивания маркера
     */
    onMarkerDragStartHandler() {
      console.log("Начало перетаскивания маркера");
      // Добавляем обработчики для окончания перетаскивания
      document.addEventListener("dragend", this.onMarkerDragEnd);
    },

    /**
     * Обработчик окончания перетаскивания маркера
     */
    onMarkerDragEnd() {
      console.log("Завершение перетаскивания маркера");
      // Удаляем стиль перетаскивания со всех элементов
      document.querySelectorAll(".dragging").forEach((el) => {
        el.classList.remove("dragging");
      });

      // Сбрасываем состояние перетаскивания
      this.dragEnterCategory = null;
      this.dragEnterMarker = null;

      // Удаляем обработчики
      document.removeEventListener("dragend", this.onMarkerDragEnd);
    },

    /**
     * Обработчик для handleMarkerDrop
     * @param {Object} data - данные о перетаскивании
     */
    handleMarkerDrop(data) {
      try {
        console.log("Обработка перетаскивания маркера", data);

        // Извлекаем данные из события
        const {
          sourceMarkerId,
          sourceCategoryId,
          targetCategory,
          targetMarker,
        } = data;

        // Проверяем корректность данных для перетаскивания
        if (!sourceCategoryId || !targetCategory) {
          console.error("Недостаточно данных для перетаскивания", data);
          return;
        }

        // Найдем перетаскиваемый маркер
        let marker = null;
        let markerIndex = -1;
        let sourceCategory = null;

        // Находим исходную категорию и маркер в ней
        for (let i = 0; i < this.categories.length; i++) {
          if (this.categories[i].id === sourceCategoryId) {
            sourceCategory = this.categories[i];
            break;
          }
        }

        if (!sourceCategory) {
          console.error("Не найдена исходная категория", sourceCategoryId);
          return;
        }

        // Если sourceMarkerId не определен, берем первый маркер из категории
        // (это может произойти при перетаскивании категории на категорию)
        if (
          !sourceMarkerId &&
          sourceCategory.markers &&
          sourceCategory.markers.length > 0
        ) {
          markerIndex = 0;
          marker = sourceCategory.markers[0];
        } else if (sourceMarkerId) {
          // Ищем маркер по ID
          markerIndex = sourceCategory.markers.findIndex(
            (m) => m.id === sourceMarkerId || m.marker_id === sourceMarkerId
          );

          if (markerIndex !== -1) {
            marker = sourceCategory.markers[markerIndex];
          }
        }

        // Проверяем, что маркер найден
        if (!marker) {
          console.error("Не найден маркер для перетаскивания", data);
          return;
        }

        const markerId = marker.id || marker.marker_id;
        if (!markerId) {
          console.error("ID маркера не определен", marker);
          return;
        }

        // Проверяем, не перетаскиваем ли в ту же категорию
        if (sourceCategoryId === targetCategory.id && !targetMarker) {
          console.log("Источник и цель совпадают, отменяем операцию");
          return;
        }

        // Перемещаем маркер между категориями
        this.moveMarkerToCategory(marker, sourceCategoryId, targetCategory.id)
          .then(() => {
            console.log(
              `Маркер ${markerId} перемещен из ${sourceCategoryId} в ${targetCategory.id}`
            );

            // Сохраняем изменения на сервере
            this.saveMapData();
          })
          .catch((error) => {
            console.error("Ошибка при перемещении маркера:", error);
          });
      } catch (error) {
        console.error("Ошибка в обработчике перетаскивания маркера:", error);
      }
    },

    /**
     * Обработчик для handleCategoryDrop
     * @param {Object} data - данные о перетаскивании
     */
    handleCategoryDrop(data) {
      try {
        console.log("Обработка перетаскивания между категориями", data);

        // Если есть targetMarker, значит перетаскиваем на маркер - такую операцию не поддерживаем
        if (data.targetMarker) {
          console.log("Перетаскивание на маркер не поддерживается");
          return;
        }

        // Используем общий обработчик перетаскивания маркеров
        this.handleMarkerDrop(data);
      } catch (error) {
        console.error("Ошибка в обработчике перетаскивания категории:", error);
      }
    },

    /**
     * Обработчик клика вне контекстного меню
     * @param {Event} event - событие
     */
    handleOutsideClick(event) {
      // Закрываем контекстное меню при клике вне его
      if (this.showContextMenu) {
        const contextMenu = document.querySelector(".context-menu");
        if (contextMenu && !contextMenu.contains(event.target)) {
          this.showContextMenu = false;
        }
      }
    },

    /**
     * Закрытие диалога выбора категории
     */
    closeCategoryDialog() {
      this.showCategoryDialog = false;
      this.selectedCategoryId = null;
      this.pendingMarkerCoordinates = null;
    },

    /**
     * Загрузка коллекций (категорий) и их маркеров с сервера
     * @param {string} mapId - ID карты
     */
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
                // Добавляем оригинальные координаты для CustomMapView
                latitude: marker.latitude,
                longitude: marker.longitude,
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

    /**
     * Создает случайный цвет для категорий
     * @returns {string} - HEX код цвета
     */
    generateRandomColor() {
      const colors = [
        "#8A2BE2", // BlueViolet
        "#DC143C", // Crimson
        "#FF8C00", // DarkOrange
        "#2E8B57", // SeaGreen
        "#4682B4", // SteelBlue
        "#800080", // Purple
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    },

    /**
     * Обновление позиции маркера после перетаскивания на карте
     * @param {Object} leafletMarker - маркер Leaflet
     * @param {string} markerId - ID маркера
     */
    updateMarkerPosition(leafletMarker, markerId) {
      try {
        if (!leafletMarker || !markerId) {
          console.error(
            "Неправильные параметры для обновления позиции маркера"
          );
          return;
        }

        // Получаем новые координаты маркера в системе Leaflet
        const latLng = leafletMarker.getLatLng();
        const [x, y] = this.reverseTransformCoordinates(latLng.lat, latLng.lng);

        console.log(`Маркер ${markerId} перемещен на позицию:`, {
          lat: y,
          lng: x,
        });

        // Обновляем координаты маркера в каждой категории, где он может находиться
        for (const category of this.categories) {
          const marker = category.markers.find(
            (m) => m.id === markerId || m.marker_id === markerId
          );

          if (marker) {
            // Обновляем координаты в объекте маркера
            marker.latitude = y;
            marker.longitude = x;
            marker.position = [y, x];

            console.log(
              `Обновлены координаты маркера ${markerId} в категории ${category.name}`
            );
            break;
          }
        }

        // Сохраняем изменения на сервере
        this.saveMapData();
      } catch (error) {
        console.error("Ошибка при обновлении позиции маркера:", error);
      }
    },
  },
};
</script>

<style scoped src="@/assets/css/views/MapView.css"></style> 
<style scoped>
/* Стиль для курсора в режиме добавления маркера */
#map.adding-marker-mode {
  cursor: crosshair !important;
}

/* Стили для маркеров */
.custom-map-marker {
  background-color: transparent;
  border: none;
}

/* Стили для тултипов */
.marker-tooltip {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-weight: bold;
  font-size: 14px;
  text-align: center;
  border: 1px solid #ccc;
}

/* Стили для кнопки шеринга */
.map-actions-panel {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 500;
  display: flex;
  gap: 10px;
}

.share-button {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-button:hover {
  background-color: #3a80d2;
}
</style> 