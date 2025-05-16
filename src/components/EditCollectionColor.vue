<template>
  <div class="edit-collection-color">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Изменение цвета коллекции</h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <p>
          Выберите новый цвет для коллекции
          <strong>{{ collection.name }}</strong
          >:
        </p>

        <color-picker
          v-model="selectedColor"
          :value="selectedColor"
          :custom-color-enabled="true"
          @change="saveChanges"
        />

        <div class="status-message" v-if="statusMessage">
          {{ statusMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ColorPicker from "@/components/ColorPicker.vue";
import Cookies from "js-cookie";

// Определение URL API сервера из переменных окружения
const API_URL = process.env.VUE_APP_API_URL || "http://localhost:8000";
console.log("EditCollectionColor использует API URL:", API_URL);

export default {
  name: "EditCollectionColor",
  components: {
    ColorPicker,
  },
  props: {
    collection: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      selectedColor: this.collection.collection_color || "#FF0000",
      statusMessage: "",
      isProcessing: false,
    };
  },
  watch: {
    // Если коллекция изменилась, обновляем выбранный цвет
    collection: {
      handler(newVal) {
        this.selectedColor = newVal.collection_color || "#FF0000";
      },
      deep: true,
    },
  },
  methods: {
    async saveChanges(newColor) {
      // Предотвращаем повторные запросы
      if (this.isProcessing) return;
      this.isProcessing = true;

      // Используем цвет, который пришел в событии, если он есть
      const colorToSave = newColor || this.selectedColor;
      console.log(
        "Сохраняем цвет:",
        colorToSave,
        "для коллекции ID:",
        this.collection.id
      );

      // Убедимся, что у нас есть валидный ID
      if (!this.collection.id) {
        console.error("ID коллекции отсутствует:", this.collection);
        this.statusMessage = "Ошибка: ID коллекции не определен";
        this.isProcessing = false;
        return;
      }

      try {
        this.statusMessage = "Сохранение...";

        // Получаем ID карты из route, если оно не определено в коллекции
        const mapId = this.collection.map_id || this.$route.params.id;

        // Обновление цвета коллекции
        const response = await fetch(
          `${API_URL}/collections/${this.collection.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify({
              title: this.collection.name,
              map_id: mapId,
              is_public: this.collection.is_public || false,
              collection_color: colorToSave,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Ошибка при обновлении коллекции: ${response.status}`
          );
        }

        // Всегда обновляем цвет всех меток в коллекции
        const markersResponse = await fetch(
          `${API_URL}/collections/${this.collection.id}/markers`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
          }
        );

        if (markersResponse.ok) {
          const markers = await markersResponse.json();

          if (markers && markers.length) {
            const updatePromises = markers.map((marker) => {
              return fetch(`${API_URL}/markers/${marker.marker_id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Cookies.get("access_token")}`,
                },
                body: JSON.stringify({
                  ...marker,
                  color: colorToSave,
                }),
              });
            });

            await Promise.all(updatePromises);
          }
        }

        this.$emit("update", {
          collectionId: this.collection.id,
          newColor: colorToSave,
          markersUpdated: true,
        });

        this.statusMessage = "Цвет успешно изменен!";

        // Скрываем статусное сообщение через 2 секунды
        setTimeout(() => {
          this.statusMessage = "";
          this.$emit("close");
        }, 800);
      } catch (error) {
        console.error("Ошибка при обновлении цвета:", error);
        this.statusMessage = "Ошибка при обновлении цвета";

        setTimeout(() => {
          this.statusMessage = "";
        }, 3000);
      } finally {
        this.isProcessing = false;
      }
    },
  },
  mounted() {
    console.log("Компонент EditCollectionColor смонтирован.");
    console.log("Данные о коллекции:", this.collection);
    console.log("ID коллекции:", this.collection.id);
    console.log("Имя коллекции:", this.collection.name);
    console.log(
      "Цвет коллекции:",
      this.collection.color || this.collection.collection_color
    );
    console.log("Данные о карте:", this.collection.map_id);
  },
};
</script>

<style scoped>
.edit-collection-color {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 450px;
  z-index: 1001;
  position: relative;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.status-message {
  margin-top: 15px;
  padding: 8px 12px;
  background-color: #e6f7e6;
  color: #4caf50;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}
</style> 

