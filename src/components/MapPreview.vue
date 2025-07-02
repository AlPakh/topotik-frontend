<template>
  <div class="map-preview" :class="{ 'is-selected': selected }">
    <div class="map-thumbnail">
      <img v-if="hasBackgroundImage" :src="backgroundImageUrl" alt="Карта" />
      <div v-else class="no-image" :class="{ 'custom-map': isCustomMap }">
        {{ isCustomMap ? "Нет фонового изображения" : "Карта OSM" }}
      </div>
      <!-- Иконка владельца для расшаренной карты (наложение в нижнем правом углу) -->
      <div v-if="isShared" class="shared-overlay">
        <div class="shared-icon" :title="'Карта от: ' + ownerName">🌐</div>
      </div>
    </div>
    <div class="map-info">
      <!-- Информация о владельце для расшаренных карт -->
      <div v-if="isShared" class="owner-info">Владелец: {{ ownerName }}</div>

      <div class="map-actions">
        <button v-if="isCustomMap" @click="uploadImage" class="upload-btn">
          {{
            hasBackgroundImage
              ? "Изменить изображение"
              : "Загрузить изображение"
          }}
        </button>
        <button
          @click="openMap"
          :disabled="isCustomMap && !hasBackgroundImage"
          class="open-btn"
          :class="{ disabled: isCustomMap && !hasBackgroundImage }"
        >
          Открыть карту
        </button>
        <button @click="shareMap" class="share-btn">Поделиться</button>
      </div>
    </div>
  </div>
</template>

<script>
import { EventBus } from "@/services/eventBus";

export default {
  name: "MapPreview",
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    // Проверка, является ли карта расшаренной (т.е. поделились с текущим пользователем)
    isShared() {
      return this.map.isShared === true && this.map.ownerName;
    },

    // Имя владельца карты
    ownerName() {
      return (
        this.map.ownerName ||
        (this.map.owner && this.map.owner.username) ||
        "Неизвестный"
      );
    },

    isCustomMap() {
      console.log("Данные карты:", JSON.stringify(this.map));
      console.log("Тип карты через map_type:", this.map.map_type);
      console.log("Тип карты через mapType:", this.map.mapType);

      // Проверяем оба возможных поля типа карты
      // map_type приходит из API бэкенда, mapType - из структуры папок
      const mapType = this.map.map_type || this.map.mapType;

      // Пользовательская карта может иметь тип 'custom_image' (из API) или 'custom' (в структуре папок)
      return mapType === "custom_image" || mapType === "custom";
    },
    hasBackgroundImage() {
      // Добавляем подробные логи для отладки
      console.log(
        "MapPreview - Проверка наличия фонового изображения для карты:",
        this.map.title || this.map.name
      );
      console.log(
        "MapPreview - Данные карты для проверки изображения:",
        JSON.stringify(this.map)
      );
      console.log(
        "MapPreview - background_image_url:",
        this.map.background_image_url
      );
      console.log(
        "MapPreview - background_image_id:",
        this.map.background_image_id
      );

      // Проверяем конкретно URL для прокси (добавлено для решения проблемы)
      const hasProxyUrl = !!(
        this.map.background_image_url &&
        this.map.background_image_url.includes("/images/proxy/")
      );
      console.log("MapPreview - Содержит proxy URL:", hasProxyUrl);

      // Проверяем все возможные поля, связанные с изображением
      const hasImage = !!(
        hasProxyUrl || // Приоритетно проверяем наличие прокси URL
        this.map.background_image_url ||
        this.map.background_image_id ||
        this.map.backgroundImageUrl ||
        this.map.backgroundImageId ||
        // Проверка полей в camelCase с неправильным регистром
        this.map.backgroundImage_url ||
        this.map.backgroundImage_id ||
        // Проверка вложенных объектов, где может быть информация об изображении
        (this.map.image && this.map.image.url) ||
        (this.map.image && this.map.image.id) ||
        // Проверка флага is_custom и наличия типа custom_image как индикатора наличия изображения
        (this.map.map_type === "custom_image" &&
          (this.map.background_image_id || this.map.is_custom === true))
      );

      console.log(
        "MapPreview - Результат проверки hasBackgroundImage:",
        hasImage
      );
      return hasImage;
    },
    backgroundImageUrl() {
      // Добавляем подробные логи для отладки
      console.log("MapPreview - Определение URL изображения");

      // Проверяем сначала прокси URL (добавлено для решения проблемы)
      if (
        this.map.background_image_url &&
        this.map.background_image_url.includes("/images/proxy/")
      ) {
        const proxyUrl = this.map.background_image_url;
        console.log("MapPreview - Используется прокси URL:", proxyUrl);

        // Добавляем API_URL если URL относительный
        if (proxyUrl.startsWith("/")) {
          const API_URL =
            process.env.VUE_APP_API_URL || "http://localhost:8000";
          console.log(
            "MapPreview - Преобразован в полный URL:",
            API_URL + proxyUrl
          );
          return API_URL + proxyUrl;
        }
        return proxyUrl;
      }

      // Проверяем сначала готовый URL (разные варианты имен полей)
      if (this.map.background_image_url) {
        console.log(
          "MapPreview - Используется готовый URL:",
          this.map.background_image_url
        );
        return this.map.background_image_url;
      }

      if (this.map.backgroundImageUrl) {
        console.log(
          "MapPreview - Используется готовый URL (camelCase):",
          this.map.backgroundImageUrl
        );
        return this.map.backgroundImageUrl;
      }

      // Проверяем вложенный объект image
      if (this.map.image && this.map.image.url) {
        console.log(
          "MapPreview - Используется URL из вложенного объекта image:",
          this.map.image.url
        );
        return this.map.image.url;
      }

      // Если есть ID, но нет URL, конструируем URL для прокси
      let imageId = null;
      if (this.map.background_image_id) {
        imageId = this.map.background_image_id;
      } else if (this.map.backgroundImageId) {
        imageId = this.map.backgroundImageId;
      } else if (this.map.image && this.map.image.id) {
        imageId = this.map.image.id;
      }

      if (imageId) {
        console.log(
          "MapPreview - ID изображения для конструирования URL:",
          imageId
        );

        // Используем прокси URL вместо прямого обращения к S3
        const API_URL = process.env.VUE_APP_API_URL || "http://localhost:8000";
        const url = `${API_URL}/images/proxy/${imageId}`;

        console.log("MapPreview - Сконструированный прокси URL:", url);
        return url;
      }

      // URL не доступен
      console.log(
        "MapPreview - URL изображения недоступен (нет ни URL, ни ID)"
      );
      return null;
    },
  },
  methods: {
    uploadImage() {
      // Определяем ID карты (может быть как map_id, так и id)
      const mapId = this.map.map_id || this.map.id;
      console.log(
        "MapPreview - Запрос на загрузку изображения для карты ID:",
        mapId
      );
      console.log(
        "MapPreview - Полные данные карты:",
        JSON.stringify(this.map)
      );
      this.$emit("upload-image", mapId);
    },
    openMap() {
      // Проверяем, можно ли открыть карту (для пользовательских карт требуется фоновое изображение)
      if (this.isCustomMap && !this.hasBackgroundImage) {
        console.log(
          "MapPreview - Невозможно открыть карту без фонового изображения"
        );
        this.$notify({
          type: "warning",
          title: "Внимание",
          text: "Загрузите фоновое изображение, чтобы открыть карту",
        });
        return;
      }

      console.log(
        "MapPreview - Открытие карты:",
        this.map.title || this.map.name
      );
      // Определяем ID карты (может быть как map_id, так и id)
      const mapId = this.map.map_id || this.map.id;
      this.$emit("open-map", mapId);
    },
    shareMap() {
      // Определяем ID карты (может быть как map_id, так и id)
      const mapId = this.map.map_id || this.map.id;
      console.log(
        "MapPreview - Открытие модального окна шеринга для карты ID:",
        mapId
      );

      EventBus.$emit("open-share-modal", {
        resourceType: "map",
        resourceId: mapId,
        owner: null,
      });
    },
  },
};
</script>

<style scoped>
.map-preview {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.map-preview:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.map-thumbnail {
  height: 150px;
  background-color: #f0f0f0;
  position: relative;
  overflow: hidden;
}

.map-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #777;
  font-size: 14px;
  background-color: #eee;
}

.no-image.custom-map {
  background-color: #f8f0ff;
  color: #8a2be2;
}

.map-info {
  padding: 10px 15px;
}

.map-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.map-actions button {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.upload-btn {
  background-color: #f0f0f0;
  color: #333;
}

.open-btn {
  background-color: #4a90e2;
  color: white;
}

.share-btn {
  background-color: #28a745;
  color: white;
}

.open-btn.disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Новые стили для наложения иконки */
.shared-overlay {
  position: absolute;
  right: 15px;
  bottom: 15px;
  z-index: 5;
}

.shared-icon {
  width: 28px;
  height: 28px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-style: normal;
  color: #4a90e2;
  border: 2px solid #4a90e2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

/* Информация о владельце */
.owner-info {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-style: italic;
}
</style>