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
 
<style scoped src="@/assets/css/components/CreateItemDialog.css"> </style>