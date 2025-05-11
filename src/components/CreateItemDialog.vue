<template>
  <div class="dialog-overlay" v-if="show">
    <div class="dialog-content">
      <h3>{{ dialogTitle }}</h3>
      
      <div class="input-group">
        <label :for="inputId">{{ inputLabel }}</label>
        <input 
          :id="inputId" 
          v-model="itemName" 
          type="text" 
          :placeholder="inputPlaceholder"
          @input="validateInput"
        />
        <div v-if="validationError" class="validation-error">
          {{ validationError }}
        </div>
      </div>
      
      <div class="dialog-buttons">
        <button class="cancel-button" @click="$emit('cancel')">Отмена</button>
        <button 
          class="create-button" 
          @click="createItem"
          :disabled="!isValid"
        >
          Создать
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreateItemDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    itemType: {
      type: String,
      required: true,
      validator: (value) => ['map-real', 'map-custom', 'folder'].includes(value)
    }
  },
  data() {
    return {
      itemName: '',
      validationError: '',
      isValid: false
    }
  },
  computed: {
    dialogTitle() {
      if (this.itemType === 'folder') return 'Создание новой папки'
      if (this.itemType === 'map-real') return 'Создание карты местности'
      return 'Создание пользовательской карты'
    },
    inputLabel() {
      return this.itemType.startsWith('map') 
        ? 'Введите название карты' 
        : 'Введите название папки'
    },
    inputPlaceholder() {
      return this.itemType.startsWith('map') 
        ? 'Название карты...' 
        : 'Название папки...'
    },
    inputId() {
      return `new-${this.itemType}-name`
    }
  },
  methods: {
    validateInput() {
      // Проверяем название на пустоту
      if (!this.itemName.trim()) {
        this.validationError = 'Название не может быть пустым'
        this.isValid = false
        return
      }
      
      // Проверяем название на недопустимые символы
      const forbiddenPattern = /[<>{}[\]"'\\;:=]/;
      if (forbiddenPattern.test(this.itemName)) {
        this.validationError = 'Название содержит недопустимые символы: { } " [ ] < >'
        this.isValid = false
        return
      }
      
      // Все проверки пройдены
      this.validationError = ''
      this.isValid = true
    },
    createItem() {
      if (!this.isValid) return
      
      const payload = { name: this.itemName.trim() }
      
      if (this.itemType === 'map-real') {
        this.$emit('create', { ...payload, type: 'map', mapType: 'real' })
      } else if (this.itemType === 'map-custom') {
        this.$emit('create', { ...payload, type: 'map', mapType: 'custom' })
      } else {
        this.$emit('create', { ...payload, type: 'folder' })
      }
      
      // Сбрасываем форму
      this.itemName = ''
      this.validationError = ''
      this.isValid = false
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // При открытии диалога сбрасываем форму
        this.itemName = ''
        this.validationError = ''
        this.isValid = false
      }
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input {
  width: calc(100% - 20px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.validation-error {
  color: red;
  font-size: 12px;
  margin-top: 5px;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button, .create-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  background-color: #f2f2f2;
  color: #333;
}

.create-button {
  background-color: #4CAF50;
  color: white;
}

.create-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style> 