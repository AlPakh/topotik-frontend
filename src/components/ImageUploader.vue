<template>
  <div class="image-uploader-overlay" @click.self="close">
    <div class="image-uploader-container">
      <h2>Загрузка изображения карты</h2>
      <div
        class="drop-zone"
        @dragover.prevent
        @dragenter.prevent="dragActive = true"
        @dragleave.prevent="dragActive = false"
        @drop.prevent="handleDrop"
        @paste="handlePaste"
        :class="{ active: dragActive, 'has-preview': hasPreview }"
      >
        <div v-if="!hasPreview" class="upload-prompt">
          <p>Перетащите изображение сюда или</p>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileInput"
            accept="image/png"
          />
          <button @click="$refs.fileInput.click()">Выберите файл</button>
          <p>Также можно вставить изображение из буфера обмена (Ctrl+V)</p>
        </div>
        <div v-else class="preview-container">
          <img :src="previewUrl" alt="Предпросмотр" class="image-preview" />
          <div class="file-info">
            <p>{{ fileName }}</p>
            <p>{{ fileSize }}</p>
          </div>
          <button @click="clearPreview" class="clear-btn">×</button>
        </div>
      </div>
      <div class="upload-actions">
        <button @click="close">Отмена</button>
        <button
          @click="uploadImage"
          :disabled="!hasPreview || isUploading"
          class="upload-btn"
        >
          {{ isUploading ? "Загрузка..." : "Загрузить" }}
        </button>
      </div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script>
import { api } from "@/api";
import { updateMapBackground } from "@/services/maps";

export default {
  props: {
    mapId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      dragActive: false,
      hasPreview: false,
      previewUrl: null,
      fileName: "",
      fileSize: "",
      file: null,
      isUploading: false,
      errorMessage: null,
    };
  },
  mounted() {
    // Добавляем глобальный обработчик для вставки из буфера обмена
    document.addEventListener("paste", this.handlePaste);
  },
  beforeUnmount() {
    // Удаляем глобальный обработчик перед удалением компонента
    document.removeEventListener("paste", this.handlePaste);

    // Очищаем URL объекта при уничтожении компонента
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  },
  methods: {
    handleFileInput(event) {
      const file = event.target.files[0];
      this.processFile(file);
    },

    handleDrop(event) {
      this.dragActive = false;
      const file = event.dataTransfer.files[0];
      this.processFile(file);
    },

    handlePaste(event) {
      const items = (event.clipboardData || event.originalEvent.clipboardData)
        .items;
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          this.processFile(file);
          break;
        }
      }
    },

    processFile(file) {
      if (!file) return;

      // Проверка формата
      if (file.type !== "image/png") {
        this.errorMessage = "Поддерживаются только PNG изображения";
        return;
      }

      // Проверка размера (100 МБ = 104857600 байт)
      if (file.size > 104857600) {
        this.errorMessage = "Размер файла не должен превышать 100 МБ";
        return;
      }

      this.errorMessage = null;
      this.file = file;
      this.fileName = file.name;
      this.fileSize = this.formatFileSize(file.size);

      // Создаем URL для предпросмотра
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.previewUrl = URL.createObjectURL(file);
      this.hasPreview = true;
    },

    clearPreview() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }
      this.previewUrl = null;
      this.file = null;
      this.fileName = "";
      this.fileSize = "";
      this.hasPreview = false;
      this.errorMessage = null;
    },

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " Б";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " КБ";
      return (bytes / 1048576).toFixed(1) + " МБ";
    },

    async uploadImage() {
      if (!this.file) return;

      try {
        this.isUploading = true;
        this.errorMessage = null;

        console.log(
          "ImageUploader - Начало загрузки изображения для карты:",
          this.mapId
        );

        // Используем API для загрузки изображения
        const formData = new FormData();
        formData.append("file", this.file);

        const response = await api.post("/images/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log(
          "ImageUploader - Ответ API при загрузке изображения:",
          response.data
        );

        // Связываем изображение с картой
        // Используем правильное название поля из ответа
        const imageId = response.data.id;
        console.log("ImageUploader - ID загруженного изображения:", imageId);
        console.log(
          "ImageUploader - URL загруженного изображения:",
          response.data.url
        );

        // Используем функцию из сервиса maps вместо прямого вызова API
        const mapResult = await updateMapBackground(this.mapId, imageId);
        console.log(
          "ImageUploader - Результат обновления фона карты:",
          mapResult
        );

        this.$emit("upload-success", {
          imageId: imageId,
          url: response.data.url,
          mapData: mapResult,
        });

        this.close();
      } catch (error) {
        console.error(
          "ImageUploader - Ошибка при загрузке изображения:",
          error
        );
        if (error.response) {
          this.errorMessage =
            error.response.data.detail || "Ошибка при загрузке изображения";
        } else {
          this.errorMessage =
            "Ошибка при загрузке изображения. Пожалуйста, попробуйте снова.";
        }
      } finally {
        this.isUploading = false;
      }
    },

    close() {
      this.clearPreview();
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.image-uploader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.image-uploader-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 80%;
  max-width: 600px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  text-align: center;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 6px;
  padding: 30px;
  text-align: center;
  margin-bottom: 20px;
  transition: background-color 0.2s, border-color 0.2s;
}

.drop-zone.active {
  border-color: #4a90e2;
  background-color: rgba(74, 144, 226, 0.1);
}

.drop-zone.has-preview {
  border-style: solid;
  padding: 10px;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-prompt input[type="file"] {
  display: none;
}

.upload-prompt button {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin: 10px 0;
}

.preview-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-preview {
  max-width: 100%;
  max-height: 300px;
  margin-bottom: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.file-info {
  width: 100%;
  text-align: left;
}

.file-info p {
  margin: 5px 0;
  font-size: 14px;
}

.clear-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #ff4d4d;
  color: white;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.upload-actions button {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.upload-actions button:first-child {
  background-color: #f5f5f5;
  color: #333;
}

.upload-btn {
  background-color: #4a90e2;
  color: white;
}

.upload-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: #ff4d4d;
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
}
</style> 