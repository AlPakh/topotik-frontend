<template>
  <div class="marker-editor-panel">
    <div class="editor-header">
      <div class="header-title-area">
        <textarea 
          v-model="localMarker.name" 
          class="editor-title" 
          @input="handleTitleInput($event)"
          placeholder="Название метки"
        ></textarea>
        <div class="header-subtitle">
          <span v-if="category" class="category-badge" :style="{ backgroundColor: category.color }">
            {{ category.name }}
          </span>
          <button class="export-button" @click="exportMarkdown" title="Экспорт в Markdown">
            <span>MD</span>
          </button>
        </div>
      </div>
      <button class="close-button" @click="$emit('close')">&times;</button>
    </div>
    
    <div class="editor-content">
      <div class="editor-form">
        <div class="blocks-container">
          <div v-for="(block, index) in localMarker.blocks" :key="index" class="content-block"
               @mouseover="hoveredBlockIndex = index"
               @mouseleave="hoveredBlockIndex = null">
            <div class="block-controls" :class="{ 'show-controls': hoveredBlockIndex === index }">
              <button class="add-block-button" @click="showAddBlockMenu(index, $event)">+</button>
              <div class="drag-handle" 
                   draggable="true" 
                   @click="showBlockMenu($event, index)"
                   @dragstart="onDragStart($event, index)"
                   @dragend="onDragEnd">░</div>
            </div>
            
            <div class="block-content" 
                 :class="{ 'block-hover': hoveredBlockIndex === index, 'block-active': hoveredBlockIndex === index || activeBlockIndex === index }"
                 @dragover.prevent="dragOverIndex = index">
              <div v-if="block.type === 'text'" class="text-block">
                <textarea v-model="block.content" ref="textarea" class="form-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Введите текст..."></textarea>
              </div>
              
              <div v-else-if="block.type === 'heading1'" class="heading-block heading1">
                <textarea v-model="block.content" ref="textarea" class="form-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Заголовок 1"></textarea>
              </div>
              
              <div v-else-if="block.type === 'heading2'" class="heading-block heading2">
                <textarea v-model="block.content" ref="textarea" class="form-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Заголовок 2"></textarea>
              </div>
              
              <div v-else-if="block.type === 'heading3'" class="heading-block heading3">
                <textarea v-model="block.content" ref="textarea" class="form-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Заголовок 3"></textarea>
              </div>
              
              <div v-else-if="block.type === 'quote'" class="quote-block">
                <textarea v-model="block.content" ref="textarea" class="form-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Цитата"></textarea>
              </div>
              
              <div v-else-if="block.type === 'list-item'" class="list-item-block">
                  <span class="list-bullet">•</span>
                <textarea v-model="block.content" ref="textarea" class="form-textarea list-item-textarea"
                          @input="handleTextareaInput($event, index)"
                          @focus="onBlockFocus(index)"
                          @blur="handleTextareaBlur(index)"
                          @keydown="handleKeyDown($event, index)"
                          placeholder="Элемент списка"></textarea>
              </div>
              
              <div v-else-if="block.type === 'divider'" class="divider-block">
                <hr>
              </div>
            </div>
            
            <div class="drop-indicator" v-if="draggingBlockIndex !== null && draggingBlockIndex !== index && dragOverIndex === index"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button class="save-button" @click="save">Сохранить</button>
    </div>
    
    <!-- Меню добавления блока -->
    <div v-if="showBlockTypeMenu" 
         class="block-type-menu" 
         :style="blockTypeMenuPosition"
         @mouseenter="handleMenuMouseEnter('blockType')"
         @mouseleave="handleMenuMouseLeave('blockType')">
      <div class="block-type-option" @click="addNewBlock('text', blockTypeMenuIndex)">
        <span class="block-type-icon">T</span>
        <span class="block-type-label">Текст</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('heading1', blockTypeMenuIndex)">
        <span class="block-type-icon">H1</span>
        <span class="block-type-label">Заголовок 1</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('heading2', blockTypeMenuIndex)">
        <span class="block-type-icon">H2</span>
        <span class="block-type-label">Заголовок 2</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('heading3', blockTypeMenuIndex)">
        <span class="block-type-icon">H3</span>
        <span class="block-type-label">Заголовок 3</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('list-item', blockTypeMenuIndex)">
        <span class="block-type-icon">•</span>
        <span class="block-type-label">Список</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('quote', blockTypeMenuIndex)">
        <span class="block-type-icon">""</span>
        <span class="block-type-label">Цитата</span>
      </div>
      <div class="block-type-option" @click="addNewBlock('divider', blockTypeMenuIndex)">
        <span class="block-type-icon">—</span>
        <span class="block-type-label">Разделитель</span>
      </div>
    </div>
    
    <!-- Контекстное меню блока -->
    <div v-if="showContextMenu" 
         class="context-menu" 
         :style="menuPosition"
         @mouseenter="handleMenuMouseEnter('context')"
         @mouseleave="handleMenuMouseLeave('context')">
      <button 
        v-for="(action, index) in contextActions" 
        :key="index" 
        @click="executeAction(action.action)"
        :class="{ 'danger': action.danger }"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MarkerEditor',
  props: {
    marker: {
      type: Object,
      required: true
    },
    category: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      localMarker: JSON.parse(JSON.stringify(this.marker)),
      hoveredBlockIndex: null,
      activeBlockIndex: null,
      showBlockTypeMenu: false,
      blockTypeMenuPosition: { top: '0px', left: '0px' },
      blockTypeMenuIndex: 0,
      draggingBlockIndex: null,
      dragOverIndex: null,
      showContextMenu: false,
      menuPosition: { top: '0px', left: '0px' },
      contextActions: [],
      menuMouseLeaveTimeout: null,
      contextMenuMouseLeaveTimeout: null,
      markdownContent: ''
    }
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideClick)
    
    // Конвертируем имеющиеся блоки в markdown при монтировании
    this.updateMarkdownContent()
    
    // Гарантированно применяем autoGrow после полной загрузки DOM
    this.$nextTick(() => {
      this.resizeAllTextareas()
    })
  },
  updated() {
    // Вызываем resize при обновлении компонента
    this.$nextTick(() => {
      this.resizeAllTextareas()
    })
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
    clearTimeout(this.menuMouseLeaveTimeout)
    clearTimeout(this.contextMenuMouseLeaveTimeout)
  },
  methods: {
    handleTitleInput(event) {
      // Автоматически изменяем высоту поля заголовка при вводе
      this.autoGrow(event.target)
    },
    
    closeAllMenus() {
      this.showContextMenu = false
      this.showBlockTypeMenu = false
      clearTimeout(this.menuMouseLeaveTimeout)
      clearTimeout(this.contextMenuMouseLeaveTimeout)
    },
    
    handleOutsideClick(event) {
      // Закрываем контекстное меню при клике вне его
      if (this.showContextMenu) {
        const menu = document.querySelector('.context-menu')
        if (menu && !menu.contains(event.target)) {
          this.showContextMenu = false
          clearTimeout(this.contextMenuMouseLeaveTimeout)
        }
      }
      
      // Закрываем меню типов блоков при клике вне его
      if (this.showBlockTypeMenu) {
        const menu = document.querySelector('.block-type-menu')
        if (menu && !menu.contains(event.target)) {
          this.showBlockTypeMenu = false
          clearTimeout(this.menuMouseLeaveTimeout)
        }
      }
    },
    onBlockFocus(index) {
      // Сохраняем индекс активного блока
      this.hoveredBlockIndex = index
      this.activeBlockIndex = index
      
      // Находим textarea элемент и применяем autoGrow
      this.$nextTick(() => {
        const textareas = document.querySelectorAll('.content-block textarea')
        if (textareas[index]) {
          this.autoGrow(textareas[index])
        }
      })
      
      // Если это последний блок и он не пустой, добавляем новый пустой блок
      if (index === this.localMarker.blocks.length - 1) {
        const block = this.localMarker.blocks[index]
        if (block.type === 'text' && block.content.trim() !== '' ||
            block.type === 'heading1' && block.content.trim() !== '' ||
            block.type === 'heading2' && block.content.trim() !== '' ||
            block.type === 'heading3' && block.content.trim() !== '' ||
            block.type === 'quote' && block.content.trim() !== '') {
          this.addNewBlock('text', index)
        }
      }
    },
    showAddBlockMenu(index, event) {
      event.stopPropagation()
      this.closeAllMenus() // Закрываем все меню перед открытием нового
      
      this.blockTypeMenuIndex = index
      this.showBlockTypeMenu = true
      
      // Позиционируем меню рядом с кнопкой
      const rect = event.target.getBoundingClientRect()
      const menuHeight = 280 // Примерная высота меню
      const menuWidth = 200 // Примерная ширина меню
      
      // Проверяем, поместится ли меню снизу
      let top = rect.bottom + window.scrollY
      let left = rect.left
      
      // Если меню не помещается снизу, показываем его сверху
      if (top + menuHeight > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight
      }
      
      // Если меню не помещается справа, показываем его слева
      if (left + menuWidth > window.innerWidth) {
        left = rect.right - menuWidth
      }
      
      this.blockTypeMenuPosition = {
        top: `${top}px`,
        left: `${left}px`
      }
    },
    addNewBlock(type, index) {
      // Создаем новый пустой блок
      const newBlock = {
        type,
        content: '',
      }
      
      // Переменная для хранения индекса нового блока
      let newIndex = index;
      
      // Если текущий блок пустой текстовый блок, заменяем его
      if (index < this.localMarker.blocks.length) {
        const currentBlock = this.localMarker.blocks[index]
        if (currentBlock.type === 'text' && currentBlock.content.trim() === '') {
          this.localMarker.blocks.splice(index, 1, newBlock)
        } else {
          this.localMarker.blocks.splice(index + 1, 0, newBlock)
          newIndex = index + 1;
        }
      } else {
        this.localMarker.blocks.push(newBlock)
        newIndex = this.localMarker.blocks.length - 1;
      }
      
      // Добавляем две пустые строки после разделителя, если он последний
      if (type === 'divider') {
        // Проверяем, является ли разделитель последним блоком
        if (newIndex === this.localMarker.blocks.length - 1) {
          // Добавляем две пустые текстовые строки
          this.localMarker.blocks.push({ type: 'text', content: '' })
          this.localMarker.blocks.push({ type: 'text', content: '' })
        }
      }
      
      this.showBlockTypeMenu = false
      
      // Фокусируемся на новом блоке и применяем autoGrow
      this.$nextTick(() => {
        // Получаем все текстовые поля
        const elements = document.querySelectorAll('.content-block textarea, .content-block input')
        
        // Определяем индекс элемента, на который нужно установить фокус
        let focusIndex;
        
        if (type === 'divider') {
          // Если добавлен разделитель и он последний, фокусируемся на первой пустой строке после него
          if (newIndex === this.localMarker.blocks.length - 3) {
            focusIndex = this.localMarker.blocks.length - 3;
          } else {
            // Иначе фокусируемся на следующем за разделителем блоке, если он есть
            focusIndex = newIndex + 1 < this.localMarker.blocks.length ? newIndex + 1 : newIndex;
          }
        } else {
          // Для всех остальных блоков устанавливаем фокус на сам добавленный блок
          focusIndex = newIndex;
        }
        
        // Устанавливаем фокус на нужный элемент, если он существует
        if (elements[focusIndex]) {
          elements[focusIndex].focus()
          if (elements[focusIndex].tagName === 'TEXTAREA') {
            this.autoGrow(elements[focusIndex])
            
            // Устанавливаем курсор в начало текстового поля
            elements[focusIndex].setSelectionRange(0, 0)
          }
        }
      })
      
      // Проверяем наличие пустого блока в конце
      this.ensureEmptyBlockAtEnd()
    },
    checkEmptyBlock(index) {
      const block = this.localMarker.blocks[index]
      
      // Проверяем, является ли блок последним
      if (index === this.localMarker.blocks.length - 1) {
        // Если последний блок не пустой, добавляем новый пустой блок
        if (block.type === 'text' && block.content.trim() !== '' ||
            block.type === 'heading1' && block.content.trim() !== '' ||
            block.type === 'heading2' && block.content.trim() !== '' ||
            block.type === 'heading3' && block.content.trim() !== '' ||
            block.type === 'quote' && block.content.trim() !== '') {
          this.addNewBlock('text', index)
        }
      }
    },
    handleKeyDown(event, index) {
      const block = this.localMarker.blocks[index]
      
      // Обработка стрелок для навигации между блоками
      if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
        const textarea = event.target
        const cursorPosition = textarea.selectionStart
        const contentLength = textarea.value.length
        
        // Стрелка влево/вверх в начале блока - переход к концу предыдущего блока
        if ((event.key === 'ArrowLeft' || event.key === 'ArrowUp') && 
            cursorPosition === 0 && index > 0) {
          
          // Проверяем предыдущий блок
          const prevIndex = index - 1
          const prevBlock = this.localMarker.blocks[prevIndex]
          
          // Если предыдущий блок - divider, пропускаем его
          if (prevBlock.type === 'divider') {
            if (index > 1) {
              event.preventDefault()
              this.$nextTick(() => {
                const textareas = document.querySelectorAll('.content-block textarea')
                if (textareas[index - 2]) {
                  textareas[index - 2].focus()
                  const len = textareas[index - 2].value.length
                  textareas[index - 2].setSelectionRange(len, len)
                }
              })
            }
            return
          }
          
          // Переход к предыдущему блоку
          if (['text', 'heading1', 'heading2', 'heading3', 'quote', 'list-item'].includes(prevBlock.type)) {
            event.preventDefault()
            this.$nextTick(() => {
              const textareas = document.querySelectorAll('.content-block textarea')
              if (textareas[prevIndex]) {
                textareas[prevIndex].focus()
                const len = textareas[prevIndex].value.length
                textareas[prevIndex].setSelectionRange(len, len)
              }
            })
            return
          }
        }
        
        // Стрелка вправо/вниз в конце блока - переход к началу следующего блока
        if ((event.key === 'ArrowRight' || event.key === 'ArrowDown') && 
            cursorPosition === contentLength && 
            index < this.localMarker.blocks.length - 1) {
          
          // Проверяем следующий блок
          const nextIndex = index + 1
          const nextBlock = this.localMarker.blocks[nextIndex]
          
          // Если следующий блок - divider, пропускаем его
          if (nextBlock.type === 'divider') {
            if (index < this.localMarker.blocks.length - 2) {
              event.preventDefault()
              this.$nextTick(() => {
                const textareas = document.querySelectorAll('.content-block textarea')
                if (textareas[index + 2]) {
                  textareas[index + 2].focus()
                  textareas[index + 2].setSelectionRange(0, 0)
                }
              })
            }
            return
          }
          
          // Переход к следующему блоку
          if (['text', 'heading1', 'heading2', 'heading3', 'quote', 'list-item'].includes(nextBlock.type)) {
            event.preventDefault()
            this.$nextTick(() => {
              const textareas = document.querySelectorAll('.content-block textarea')
              if (textareas[nextIndex]) {
                textareas[nextIndex].focus()
                textareas[nextIndex].setSelectionRange(0, 0)
              }
            })
            return
          }
        }
      }
      
      // Обработка Backspace
      if (event.key === 'Backspace') {
        const textarea = event.target
        const cursorPosition = textarea.selectionStart
        
        // Если курсор находится в начале текста (позиция 0) и есть предыдущий блок
        if (cursorPosition === 0 && index > 0) {
          const prevBlock = this.localMarker.blocks[index - 1]
          
          // Проверка, является ли предыдущий блок разделителем (divider)
          if (prevBlock.type === 'divider') {
            event.preventDefault()
            
            // Просто удаляем divider
            this.localMarker.blocks.splice(index - 1, 1)
            
            // Обновляем автоматически высоту текущего блока
            this.$nextTick(() => {
              const textareas = document.querySelectorAll('.content-block textarea')
              if (textareas[index - 1]) { // Теперь индекс текущего блока уменьшился на 1
                this.autoGrow(textareas[index - 1])
              }
            })
            
            return
          }
          
          // Проверяем, что предыдущий блок может содержать текст
          if (['text', 'heading1', 'heading2', 'heading3', 'quote', 'list-item'].includes(prevBlock.type)) {
            event.preventDefault()
            
            // Сохраняем содержимое текущего блока
            const currentContent = block.content
            // Сохраняем содержимое предыдущего блока
            const prevContent = prevBlock.content
            // Определяем позицию курсора после объединения
            const newCursorPosition = prevContent.length
            
            // Объединяем содержимое блоков
            prevBlock.content = prevContent + currentContent
            
            // Удаляем текущий блок
            this.localMarker.blocks.splice(index, 1)
            
            // Переносим фокус на предыдущий блок и устанавливаем курсор в место объединения
            this.$nextTick(() => {
              const textareas = document.querySelectorAll('.content-block textarea')
              if (textareas[index - 1]) {
                textareas[index - 1].focus()
                textareas[index - 1].setSelectionRange(newCursorPosition, newCursorPosition)
                this.autoGrow(textareas[index - 1])
              }
            })
            
            // Проверяем наличие пустого блока в конце
            this.ensureEmptyBlockAtEnd()
            return
          }
        }
        
        // Обработка Backspace в пустом блоке (оставляем существующую логику)
        if ((block.type === 'text' || block.type === 'heading1' || 
           block.type === 'heading2' || block.type === 'heading3' || 
             block.type === 'quote' || block.type === 'list-item') && 
          block.content.trim() === '') {
        
        // Не удаляем блок, если он единственный
        if (this.localMarker.blocks.length <= 1) {
          return
        }
        
        event.preventDefault()
        
        // Запоминаем предыдущий индекс для переноса фокуса
        const prevIndex = Math.max(0, index - 1)
        
        // Удаляем текущий блок
        this.localMarker.blocks.splice(index, 1)
        
        // Переносим фокус на предыдущий блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll('.content-block textarea')
          if (textareas[prevIndex]) {
            textareas[prevIndex].focus()
            // Устанавливаем курсор в конец текста
            const len = textareas[prevIndex].value.length
            textareas[prevIndex].setSelectionRange(len, len)
          }
        })
        
        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd()
        return
        }
      }
      
      // Обработка Enter для создания нового блока
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        
        const textarea = event.target
        const cursorPosition = textarea.selectionStart
        const textBeforeCursor = block.content.substring(0, cursorPosition)
        const textAfterCursor = block.content.substring(cursorPosition)
        
        // Обновляем текст текущего блока
        block.content = textBeforeCursor
        
        // Создаем новый блок с текстом после курсора
        // Если текущий блок - элемент списка, создаем еще один элемент списка
        const newBlockType = block.type === 'list-item' ? 'list-item' : 'text'
        
        this.localMarker.blocks.splice(index + 1, 0, {
          type: newBlockType,
          content: textAfterCursor
        })
        
        // Переносим фокус на новый блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll('.content-block textarea')
          if (textareas[index + 1]) {
            textareas[index + 1].focus()
            textareas[index + 1].setSelectionRange(0, 0)
            this.autoGrow(textareas[index + 1])
          }
        })
        
        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd()
      }
    },
    onDragStart(event, index) {
      this.draggingBlockIndex = index
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd() {
      if (this.draggingBlockIndex !== null && this.dragOverIndex !== null) {
        const block = this.localMarker.blocks[this.draggingBlockIndex]
        this.localMarker.blocks.splice(this.draggingBlockIndex, 1)
        this.localMarker.blocks.splice(this.dragOverIndex, 0, block)
      }
      this.draggingBlockIndex = null
      this.dragOverIndex = null
    },
    save() {
      // Обновляем markdown-контент перед сохранением
      this.updateMarkdownContent()
      this.$emit('save', this.localMarker)
    },
    ensureEmptyBlockAtEnd() {
      const lastBlockIndex = this.localMarker.blocks.length - 1
      if (lastBlockIndex >= 0) {
        const lastBlock = this.localMarker.blocks[lastBlockIndex]
        
        // Если последний блок не является пустым текстовым блоком,
        // добавляем новый пустой блок
        if (!(lastBlock.type === 'text' && lastBlock.content.trim() === '')) {
          this.localMarker.blocks.push({ type: 'text', content: '' })
        }
      } else {
        // Если блоков нет, добавляем первый пустой блок
        this.localMarker.blocks.push({ type: 'text', content: '' })
      }
    },
    showBlockMenu(event, index) {
      event.stopPropagation()
      event.preventDefault()
      
      this.closeAllMenus() // Закрываем все меню перед открытием нового
      
      this.showContextMenu = true
      
      // Позиционируем контекстное меню
      const menuHeight = 100 // Примерная высота меню
      const menuWidth = 150 // Примерная ширина меню
      
      // Получаем координаты кнопки относительно контейнера
      const rect = event.target.getBoundingClientRect()
      const editorRect = this.$el.getBoundingClientRect()
      
      let top = rect.top - editorRect.top + rect.height
      let left = rect.left - editorRect.left
      
      // Если меню не помещается снизу, показываем его сверху
      if (top + menuHeight > editorRect.height) {
        top = rect.top - editorRect.top - menuHeight
      }
      
      // Если меню не помещается справа, показываем его слева
      if (left + menuWidth > editorRect.width) {
        left = rect.right - editorRect.left - menuWidth
      }
      
      this.menuPosition = {
        top: `${top}px`,
        left: `${left}px`
      }
      
      this.contextActions = [
        { label: 'Дублировать', action: 'duplicateBlock' },
        { label: 'Удалить', action: 'deleteBlock', danger: true }
      ]
      
      this.activeItem = this.localMarker.blocks[index]
      this.activeItemIndex = index
    },
    handleMenuMouseEnter(menuType) {
      if (menuType === 'blockType') {
        clearTimeout(this.menuMouseLeaveTimeout)
      } else if (menuType === 'context') {
        clearTimeout(this.contextMenuMouseLeaveTimeout)
      }
    },
    
    handleMenuMouseLeave(menuType) {
      if (menuType === 'blockType') {
        this.menuMouseLeaveTimeout = setTimeout(() => {
          this.showBlockTypeMenu = false
        }, 300)
      } else if (menuType === 'context') {
        this.contextMenuMouseLeaveTimeout = setTimeout(() => {
          this.showContextMenu = false
        }, 300)
      }
    },
    duplicateBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Создаем глубокую копию блока
        const blockCopy = JSON.parse(JSON.stringify(this.activeItem))
        
        // Вставляем копию после оригинала
        this.localMarker.blocks.splice(this.activeItemIndex + 1, 0, blockCopy)
        
        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd()
      }
      this.showContextMenu = false
    },
    deleteBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Не удаляем блок, если он единственный
        if (this.localMarker.blocks.length <= 1) {
          return
        }
        
        // Удаляем блок
        this.localMarker.blocks.splice(this.activeItemIndex, 1)
        
        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd()
      }
      this.showContextMenu = false
    },
    executeAction(action) {
      if (action === 'duplicateBlock') {
        this.duplicateBlock()
      } else if (action === 'deleteBlock') {
        this.deleteBlock()
      }
    },
    // Преобразование блоков в Markdown
    updateMarkdownContent() {
      this.markdownContent = this.blocksToMarkdown(this.localMarker.blocks)
      // Сохраняем markdown в маркере
      this.localMarker.markdownContent = this.markdownContent
    },
    
    // Преобразование блоков в Markdown
    blocksToMarkdown(blocks) {
      if (!blocks || !blocks.length) return ''
      
      let result = []
      let listMode = false
      let listContents = []
      
      blocks.forEach(block => {
        if (block.type === 'list-item') {
          // Накапливаем элементы списка
          listMode = true
          if (block.content.trim() !== '') {
            listContents.push(`* ${block.content}`)
          }
        } else {
          // Если до этого был список, выводим его и сбрасываем режим списка
          if (listMode && listContents.length > 0) {
            result.push(listContents.join('\n'))
            listContents = []
            listMode = false
          }
          
          // Обрабатываем другие типы блоков
          switch (block.type) {
            case 'text':
              if (block.content.trim() !== '') {
                result.push(block.content)
              }
              break
            case 'heading1':
              if (block.content.trim() !== '') {
                result.push(`# ${block.content}`)
              }
              break
            case 'heading2':
              if (block.content.trim() !== '') {
                result.push(`## ${block.content}`)
              }
              break
            case 'heading3':
              if (block.content.trim() !== '') {
                result.push(`### ${block.content}`)
              }
              break
            case 'quote':
              if (block.content.trim() !== '') {
                result.push(`> ${block.content}`)
              }
              break
            case 'divider':
              result.push('---')
              break
          }
        }
      })
      
      // Не забываем про список в конце документа
      if (listMode && listContents.length > 0) {
        result.push(listContents.join('\n'))
      }
      
      return result.filter(content => content !== '').join('\n\n')
    },
    
    // Преобразование Markdown в блоки
    markdownToBlocks(markdown) {
      if (!markdown) return [{ type: 'text', content: '' }]
      
      const lines = markdown.split('\n')
      const blocks = []
      let currentBlock = null
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Пропускаем пустые строки между блоками
        if (line.trim() === '' && currentBlock) {
          currentBlock = null
          continue
        }
        
        // Заголовок 1
        if (line.startsWith('# ')) {
          blocks.push({
            type: 'heading1',
            content: line.substring(2).trim()
          })
          currentBlock = null
        } 
        // Заголовок 2
        else if (line.startsWith('## ')) {
          blocks.push({
            type: 'heading2',
            content: line.substring(3).trim()
          })
          currentBlock = null
        }
        // Заголовок 3
        else if (line.startsWith('### ')) {
          blocks.push({
            type: 'heading3',
            content: line.substring(4).trim()
          })
          currentBlock = null
        }
        // Цитата
        else if (line.startsWith('> ')) {
          blocks.push({
            type: 'quote',
            content: line.substring(2).trim()
          })
          currentBlock = null
        }
        // Разделитель
        else if (line.trim() === '---') {
          blocks.push({ type: 'divider' })
          currentBlock = null
        }
        // Элемент списка
        else if (line.startsWith('* ') || line.startsWith('- ')) {
          blocks.push({
            type: 'list-item',
            content: line.substring(2).trim()
          })
          currentBlock = null
        }
        // Обычный текст
        else {
          // Если предыдущий блок был текстом, добавляем строку к нему
          if (currentBlock && currentBlock.type === 'text') {
            currentBlock.content += '\n' + line
          } else {
            currentBlock = {
              type: 'text',
              content: line
            }
            blocks.push(currentBlock)
          }
        }
      }
      
      // Добавляем пустой текстовый блок в конце, если его нет
      if (blocks.length === 0 || 
          !((blocks[blocks.length - 1].type === 'text') && 
           (blocks[blocks.length - 1].content.trim() === ''))) {
        blocks.push({ type: 'text', content: '' })
      }
      
      return blocks
    },
    
    // Экспорт содержимого в markdown файл
    exportMarkdown() {
      // Обновляем markdown-контент перед экспортом
      this.updateMarkdownContent()
      
      // Создаем файл для скачивания
      const fileName = `${this.localMarker.name.replace(/\s+/g, '_')}.md`
      const blob = new Blob([this.markdownContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      
      // Создаем ссылку и эмулируем клик
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      
      // Очищаем ресурсы
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 0)
    },
    // Новая улучшенная функция для изменения всех textarea
    resizeAllTextareas() {
      const textareas = document.querySelectorAll('.form-textarea')
      textareas.forEach(textarea => {
        this.autoGrow(textarea)
      })
    },
    // Обработчик ввода в textarea
    handleTextareaInput(event, index) {
      this.autoGrow(event.target)
      this.checkEmptyBlock(index)
    },
    // Улучшенная функция autoGrow
    autoGrow(element) {
      if (!element) return
      
      // Сохраняем положение скролла
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop
      
      // Клонируем стили для точного расчета
      const computedStyle = window.getComputedStyle(element)
      const lineHeight = parseFloat(computedStyle.lineHeight) || parseInt(computedStyle.fontSize) * 1.2
      
      // Сначала сбрасываем высоту
      element.style.height = '0'
      
      // Вычисляем высоту на основе содержимого
      // Учитываем только высоту текста и минимальную высоту строки
      const textHeight = element.scrollHeight
      
      // Подсчитываем количество строк (приблизительно)
      const lines = element.value.split('\n').length
      
      // Рассчитываем точную высоту на основе количества строк и высоты строки
      // Добавляем небольшой отступ для предотвращения обрезания текста
      const calculatedHeight = lines * lineHeight + 8
      
      // Используем большее из вычисленных значений для надежности
      const newHeight = Math.max(textHeight, calculatedHeight)
      
      // Устанавливаем высоту
      element.style.height = `${newHeight}px`
      
      // Восстанавливаем положение скролла
      window.scrollTo(0, scrollPos)
    },
    handleTextareaBlur(index) {
      // Снимаем метку активного блока
      if (this.activeBlockIndex === index) {
        this.activeBlockIndex = null
      }
    }
  }
}
</script>

<style scoped>
.marker-editor-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: calc(100vh - 65px);
  background: white;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.editor-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-title-area {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  margin-right: 10px;
}

.editor-title {
  font-size: 24px;
  font-weight: bold;
  width: 100%;
  border: none;
  resize: none;
  background: none;
  font-family: inherit;
  overflow-y: hidden;
  padding: 0;
  margin: 0 0 8px 0;
  min-height: 24px;
}

.editor-title:focus {
  outline: none;
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-badge {
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.blocks-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.content-block {
  margin-bottom: 0;
  position: relative;
  padding: 0;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  align-items: end;
}

.block-controls {
  position: relative;
  left: 0;
  display: flex;
  flex-direction: row;  
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  bottom: 8px;
}

.content-block:hover .block-controls,
.content-block:focus-within .block-controls {
  opacity: 1;
  pointer-events: all;
}

.add-block-button, .drag-handle {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  padding: 0;
}

.add-block-button:hover, .drag-handle:hover {
  color: #333;
}

.block-content {
  flex: 1;
  padding:  0 5px 0 5px;
  border-radius: 4px;
}

.block-hover {
  background-color: #f5f5f5;
}

.form-textarea {
  width: 100%;
  padding: 4px;
  border: none;
  resize: none;
  background: none;
  font-family: inherit;
  overflow-y: hidden;
  box-sizing: border-box;
  line-height: 1.5;
  display: block;
  /* Удаляем минимальную высоту, чтобы не создавать лишнее пространство */
  min-height: 0;
  /* Убираем все внутренние отступы */
  margin: 0;
}

.form-textarea:focus {
  outline: none;
}

.heading1 .form-textarea {
  margin-top: 0.5em;
  font-size: 24px;
  font-weight: bold;
}

.heading2 .form-textarea {
  margin-top: 0.5em;
  font-size: 20px;
  font-weight: bold;
}

.heading3 .form-textarea {
  margin-top: 0.5em;
  font-size: 16px;
  font-weight: bold;
}

.quote-block {
  border-left: 3px solid #ddd;
  padding-left: 10px;
  font-style: italic;
}

.list-item-block {
  display: flex;
  align-items: flex-start;
  margin: 2px 0;
}

.list-bullet {
  margin-right: 8px;
  margin-top: 6px;
  flex-shrink: 0;
  color: #666;
}

.list-item-textarea {
  flex: 1;
  padding-left: 0;
}

.divider-block hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 10px 0;
}

.block-type-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.block-type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.block-type-option:hover {
  background-color: #f5f5f5;
}

.block-type-icon {
  width: 20px;
  text-align: center;
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #2196f3;
}

.editor-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.save-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button:hover {
  background-color: #45a049;
}

@media (max-width: 768px) {
  .marker-editor-panel {
    width: 100%;
  }
}

.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  min-width: 150px;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f5f5f5;
}

.context-menu button.danger {
  color: #dc3545;
}

.context-menu button.danger:hover {
  background-color: #ffebee;
}

.header-actions {
  display: flex;
  align-items: center;
}

.export-button {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: #333;
  font-weight: bold;
}

.export-button:hover {
  background: #e0e0e0;
}

/* Скрываем плейсхолдеры по умолчанию */
.form-textarea::placeholder {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Показываем плейсхолдеры при наведении или фокусе */
.block-active .form-textarea::placeholder,
.content-block:hover .form-textarea::placeholder,
.form-textarea:focus::placeholder {
  opacity: 1;
}
</style> 