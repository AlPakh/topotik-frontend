<template>
  <div class="color-picker">
    <div v-if="showTitle" class="color-picker-title">{{ title }}</div>

    <div class="tabs">
      <button
        @click="setActiveTab('neon')"
        :class="{ active: activeTab === 'neon' }"
      >
        Яркие
      </button>
      <button
        @click="setActiveTab('pastel')"
        :class="{ active: activeTab === 'pastel' }"
      >
        Пастельные
      </button>
    </div>

    <div class="color-palette">
      <div
        v-for="(color, index) in displayColors"
        :key="index"
        class="color-sample"
        :style="{ backgroundColor: color }"
        :class="{ selected: selectedColor === color }"
        @click="selectColor(color)"
      ></div>
    </div>

    <div class="custom-color" v-if="customColorEnabled">
      <div class="input-group">
        <label for="custom-color">Свой цвет:</label>
        <div class="hex-input-wrapper">
          <span class="hash-symbol">#</span>
          <input
            id="custom-color"
            v-model="customColorInput"
            placeholder="FF0000"
            maxlength="6"
            @input="validateHexInput"
            @blur="formatHexInput"
          />
          <div
            class="color-preview"
            :style="{
              backgroundColor: customColorValid
                ? `#${customColorInput}`
                : '#ccc',
            }"
          ></div>
        </div>
      </div>
      <button
        class="confirm-button"
        :disabled="!customColorValid"
        @click="applyCustomColor"
      >
        Подтвердить
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ColorPicker",
  props: {
    value: {
      type: String,
      default: "#FF0000",
    },
    title: {
      type: String,
      default: "Выберите цвет",
    },
    showTitle: {
      type: Boolean,
      default: true,
    },
    customColorEnabled: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      // Исходный выбранный цвет, инициализируется из props.value
      selectedColor: this.value,
      // Активная вкладка, по умолчанию "neon"
      activeTab: "neon",
      // Массив ярких цветов
      neonColors: [
        "#FF0000", // Красный
        "#FF8000", // Оранжевый
        "#FFFF00", // Желтый
        "#00FF00", // Зеленый
        "#00FFFF", // Голубой
        "#0080FF", // Синий
        "#8000FF", // Фиолетовый
        "#FF00FF", // Розовый
        "#000000", // Черный
        "#FFFFFF", // Белый
      ],
      // Массив пастельных цветов (обновленные, более яркие)
      pastelColors: [
        "#FF6B81", // Розовый
        "#FFA07A", // Лососевый
        "#FFDA79", // Желтый
        "#BADC58", // Зеленый
        "#7ED6DF", // Голубой
        "#70A1FF", // Синий
        "#B79CED", // Лавандовый
        "#FF9FF3", // Розовый
        "#A0A0A0", // Серый
        "#F8F8F8", // Светло-серый
      ],
      // Пользовательский цвет (без #)
      customColorInput: "",
      // Флаг валидности пользовательского цвета
      customColorValid: false,
    };
  },
  computed: {
    // Возвращает массив цветов в зависимости от активной вкладки
    displayColors() {
      return this.activeTab === "neon" ? this.neonColors : this.pastelColors;
    },
  },
  watch: {
    // Если value изменится извне, обновим выбранный цвет
    value(newVal) {
      this.selectedColor = newVal;

      // Если новый цвет начинается с #, удалим его для поля ввода
      if (newVal && newVal.startsWith("#")) {
        this.customColorInput = newVal.slice(1);
        this.validateHexInput();
      }
    },
  },
  created() {
    // При создании компонента, если value начинается с #, удалим его для поля ввода
    if (this.value && this.value.startsWith("#")) {
      this.customColorInput = this.value.slice(1);
      this.validateHexInput();
    }
  },
  methods: {
    // Устанавливаем активную вкладку
    setActiveTab(tab) {
      this.activeTab = tab;
    },

    // Выбор цвета из палитры
    selectColor(color) {
      console.log("Выбран цвет:", color);
      this.selectedColor = color;

      // Обновляем пользовательский ввод, если выбран цвет из палитры
      this.customColorInput = color.startsWith("#") ? color.slice(1) : color;
      this.validateHexInput();

      // Уведомляем родительский компонент об изменении с помощью событий
      this.$emit("input", color);
      // Важно! Отправляем событие change с выбранным цветом
      this.$emit("change", color);
    },

    // Проверка валидности HEX-кода
    validateHexInput() {
      // Регулярное выражение для проверки шестнадцатеричного кода
      const hexRegex = /^[0-9A-Fa-f]{6}$/;
      this.customColorValid = hexRegex.test(this.customColorInput);

      // Если введено 3 символа, автоматически дублируем их (например, F00 -> FF0000)
      if (/^[0-9A-Fa-f]{3}$/.test(this.customColorInput)) {
        const expandedHex = this.customColorInput
          .split("")
          .map((char) => char + char)
          .join("");
        this.customColorInput = expandedHex;
        this.customColorValid = true;
      }
    },

    // Форматирование ввода HEX-кода при потере фокуса
    formatHexInput() {
      if (this.customColorValid) {
        this.customColorInput = this.customColorInput.toUpperCase();
      }
    },

    // Применение пользовательского цвета
    applyCustomColor() {
      if (this.customColorValid) {
        const hexColor = `#${this.customColorInput.toUpperCase()}`;
        this.selectedColor = hexColor;
        console.log("Применен пользовательский цвет:", hexColor);

        // Уведомляем родительский компонент об изменении с помощью событий
        this.$emit("input", hexColor);
        // Важно! Отправляем событие change с выбранным цветом
        this.$emit("change", hexColor);
      }
    },
  },
};
</script>

<style scoped>
.color-picker {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  width: 100%;
  max-width: 350px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.color-picker-title {
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
  font-weight: bold;
}

.tabs {
  display: flex;
  margin-bottom: 15px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.tabs button {
  flex: 1;
  background-color: #f0f0f0;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
}

.tabs button.active {
  background-color: #4285f4;
  color: white;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.color-sample {
  width: 100%;
  padding-bottom: 100%;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.color-sample:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.color-sample.selected {
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.5), 0 2px 5px rgba(0, 0, 0, 0.2);
}

.custom-color {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

label {
  font-size: 14px;
  margin-right: 10px;
  flex-shrink: 0;
}

.hex-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 5px;
  flex-grow: 1;
  background-color: white;
}

.hash-symbol {
  color: #666;
  font-weight: 500;
  margin-right: 2px;
}

input {
  border: none;
  padding: 8px 5px;
  width: 100%;
  font-family: monospace;
  font-size: 14px;
  outline: none;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  margin-left: 5px;
  border: 1px solid #ddd;
}

.confirm-button {
  width: 100%;
  padding: 8px 12px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.confirm-button:hover:not(:disabled) {
  background-color: #2b6ed9;
}

.confirm-button:disabled {
  background-color: #a6c8ff;
  cursor: not-allowed;
}
</style> 

