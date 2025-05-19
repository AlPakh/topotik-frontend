<template>
  <div class="map-preview">
    <div class="map-thumbnail">
      <img v-if="hasBackgroundImage" :src="backgroundImageUrl" alt="Карта" />
      <div v-else class="no-image" :class="{ 'custom-map': isCustomMap }">
        {{ isCustomMap ? "Нет фонового изображения" : "Карта OSM" }}
      </div>
    </div>
    <div class="map-info">
      <h3>{{ map.title }}</h3>
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
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "MapPreview",
  props: {
    map: {
      type: Object,
      required: true,
    },
  },
  computed: {
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

      // Проверяем все возможные поля, связанные с изображением
      const hasImage = !!(
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
        // Проверка флага is_custom, который может указывать на наличие изображения
        (this.map.is_custom === true &&
          (this.map.mapType === "custom" ||
            this.map.map_type === "custom_image"))
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

      // Если есть ID, но нет URL, конструируем URL
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

        // Проверяем, не содержит ли ID уже расширение файла
        const hasExtension = imageId.includes(".");
        const url = hasExtension
          ? `https://s3.eu-central-003.backblazeb2.com/bex-sber-bucket/map_images/${imageId}`
          : `https://s3.eu-central-003.backblazeb2.com/bex-sber-bucket/map_images/${imageId}.png`;

        console.log("MapPreview - Сконструированный URL:", url);
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
      if (this.isCustomMap && !this.hasBackgroundImage) {
        return; // Блокируем открытие карты, если нет фонового изображения
      }

      // Определяем маршрут в зависимости от типа карты
      const route = this.isCustomMap ? "CustomMapView" : "MapView";

      // Определяем ID карты (может быть как map_id, так и id)
      const mapId = this.map.map_id || this.map.id;

      console.log("Переход на маршрут:", route, "с ID:", mapId);

      // Перенаправляем на соответствующий маршрут
      this.$router.push({
        name: route,
        params: { id: mapId },
        query: { name: this.map.title || this.map.name },
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
  transition: transform 0.2s, box-shadow 0.2s;
}

.map-preview:hover {
  transform: translateY(-3px);
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

.map-info h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.open-btn.disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>