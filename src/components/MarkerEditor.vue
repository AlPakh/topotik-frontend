<template>
  <div
    class="marker-editor-panel"
    ref="editorPanel"
    :style="{ width: editorWidth + 'px' }"
  >
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="editor-header">
      <div class="header-title-area">
        <textarea
          v-model="localMarker.name"
          class="editor-title"
          @input="handleTitleInput($event)"
          placeholder="Название метки"
        ></textarea>
        <div class="header-subtitle">
          <span
            v-if="category"
            class="category-badge"
            :style="{ backgroundColor: category.color }"
          >
            {{ category.name }}
          </span>
          <button
            class="export-button"
            @click="exportMarkdown"
            title="Экспорт в Markdown"
          >
            <span>Экспорт в MD</span>
          </button>
        </div>
      </div>
      <button class="close-button" @click="$emit('close')">&times;</button>
    </div>

    <div class="editor-content">
      <div class="editor-form">
        <div class="blocks-container">
          <div
            v-for="(block, index) in localMarker.blocks"
            :key="index"
            class="content-block"
            @mouseover="hoveredBlockIndex = index"
            @mouseleave="hoveredBlockIndex = null"
          >
            <div
              class="block-controls"
              :class="{ 'show-controls': hoveredBlockIndex === index }"
            >
              <button
                class="add-block-button"
                @click="showAddBlockMenu(index, $event)"
              >
                +
              </button>
              <div
                class="drag-handle"
                draggable="true"
                @click="showBlockMenu($event, index)"
                @dragstart="onDragStart($event, index)"
                @dragend="onDragEnd"
              >
                ░
              </div>
            </div>

            <div
              class="block-content"
              :class="{
                'block-hover': hoveredBlockIndex === index,
                'block-active':
                  hoveredBlockIndex === index || activeBlockIndex === index,
              }"
              @dragover.prevent="dragOverIndex = index"
            >
              <div v-if="block.type === 'text'" class="text-block">
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Введите текст..."
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'heading1'"
                class="heading-block heading1"
              >
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Заголовок 1"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'heading2'"
                class="heading-block heading2"
              >
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Заголовок 2"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'heading3'"
                class="heading-block heading3"
              >
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Заголовок 3"
                ></textarea>
              </div>

              <div v-else-if="block.type === 'quote'" class="quote-block">
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Цитата"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'list-item'"
                class="list-item-block"
              >
                <span class="list-bullet">•</span>
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea list-item-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Элемент списка"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'ordered-list-item'"
                class="ordered-list-item-block"
              >
                <span class="list-number">{{ getOrderNumber(index) }}.</span>
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea ordered-list-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleOrderedListKeyDown($event, index)"
                  placeholder="Пункт списка"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'task-item'"
                class="task-item-block"
              >
                <input
                  type="checkbox"
                  :checked="block.completed"
                  @change="toggleTaskCompletion(index)"
                  class="task-checkbox"
                />
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea task-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Задача"
                  :class="{ completed: block.completed }"
                ></textarea>
              </div>

              <div
                v-else-if="block.type === 'alert'"
                class="alert-block"
                :class="block.alertType"
              >
                <div class="alert-icon-container">
                  <span
                    v-if="block.alertType === 'info'"
                    class="alert-icon info"
                    >i</span
                  >
                  <span
                    v-else-if="block.alertType === 'warning'"
                    class="alert-icon warning"
                    >⚠</span
                  >
                  <span
                    v-else-if="block.alertType === 'error'"
                    class="alert-icon error"
                    >!</span
                  >
                  <span
                    v-else-if="block.alertType === 'success'"
                    class="alert-icon success"
                    >✓</span
                  >
                </div>
                <div class="alert-content">
                  <div class="alert-type-label">
                    {{ getAlertTypeLabel(block.alertType) }}
                  </div>
                  <textarea
                    v-model="block.content"
                    ref="textarea"
                    class="form-textarea alert-textarea"
                    @input="handleTextareaInput($event, index)"
                    @focus="onBlockFocus(index)"
                    @blur="handleTextareaBlur(index)"
                    @keydown="handleKeyDown($event, index)"
                    :placeholder="getAlertPlaceholder(block.alertType)"
                  ></textarea>
                </div>
              </div>

              <div v-else-if="block.type === 'embed'" class="embed-block">
                <div class="embed-preview" :class="block.service">
                  <div v-if="block.service === 'youtube'" class="youtube-embed">
                    <iframe
                      :src="`https://www.youtube.com/embed/${block.serviceId}`"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>
                  </div>
                  <div v-else-if="block.service === 'map'" class="map-embed">
                    <iframe
                      :src="`https://www.google.com/maps/embed?pb=${block.serviceId}`"
                      frameborder="0"
                      allowfullscreen
                    ></iframe>
                  </div>
                </div>
                <textarea
                  v-if="block.caption !== undefined"
                  v-model="block.caption"
                  placeholder="Подпись (опционально)"
                  class="embed-caption"
                ></textarea>
                <div class="embed-controls">
                  <button @click="editEmbed(index)" class="embed-edit-btn">
                    Изменить
                  </button>
                </div>
              </div>

              <div v-else-if="block.type === 'divider'" class="divider-block">
                <hr />
              </div>

              <div v-else-if="block.type === 'iframe'" class="iframe-block">
                <textarea
                  v-model="block.content"
                  ref="textarea"
                  class="form-textarea iframe-textarea"
                  @input="handleTextareaInput($event, index)"
                  @focus="onBlockFocus(index)"
                  @blur="handleTextareaBlur(index)"
                  @keydown="handleKeyDown($event, index)"
                  placeholder="Вставьте код iframe..."
                ></textarea>
                <div
                  v-if="block.content"
                  class="iframe-preview"
                  v-html="getSanitizedHtml(block.content)"
                ></div>
              </div>
            </div>

            <div
              class="drop-indicator"
              v-if="
                draggingBlockIndex !== null &&
                draggingBlockIndex !== index &&
                dragOverIndex === index
              "
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-footer">
      <button class="save-button" @click="save">Сохранить</button>
    </div>

    <!-- Меню добавления блока -->
    <div
      v-if="showBlockTypeMenu"
      class="block-type-menu"
      :style="blockTypeMenuPosition"
      @mouseenter="handleMenuMouseEnter('blockType')"
      @mouseleave="handleMenuMouseLeave('blockType')"
    >
      <div class="block-type-options-scroll">
        <div
          class="block-type-option"
          @click="addNewBlock('text', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">T</span>
          <span class="block-type-label">Текст</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('heading1', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">H1</span>
          <span class="block-type-label">Заголовок 1</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('heading2', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">H2</span>
          <span class="block-type-label">Заголовок 2</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('heading3', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">H3</span>
          <span class="block-type-label">Заголовок 3</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('list-item', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">•</span>
          <span class="block-type-label">Список</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('ordered-list-item', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">1.</span>
          <span class="block-type-label">Нумерованный список</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('task-item', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">☐</span>
          <span class="block-type-label">Задача</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('quote', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">""</span>
          <span class="block-type-label">Цитата</span>
        </div>
        <div
          class="block-type-option"
          @mouseenter="handleSubmenuMouseEnter('alert')"
          @mouseleave="handleSubmenuMouseLeave('alert')"
        >
          <span class="block-type-icon">!</span>
          <span class="block-type-label">Уведомление</span>

          <div v-if="showAlertTypesMenu" class="alert-types-submenu">
            <div
              class="alert-type-option"
              @click="addAlertBlock('info', blockTypeMenuIndex)"
            >
              <span class="alert-icon info">i</span>
              <span>Информация</span>
            </div>
            <div
              class="alert-type-option"
              @click="addAlertBlock('warning', blockTypeMenuIndex)"
            >
              <span class="alert-icon warning">⚠</span>
              <span>Предупреждение</span>
            </div>
            <div
              class="alert-type-option"
              @click="addAlertBlock('error', blockTypeMenuIndex)"
            >
              <span class="alert-icon error">!</span>
              <span>Ошибка</span>
            </div>
            <div
              class="alert-type-option"
              @click="addAlertBlock('success', blockTypeMenuIndex)"
            >
              <span class="alert-icon success">✓</span>
              <span>Успех</span>
            </div>
          </div>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('iframe', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">⧉</span>
          <span class="block-type-label">Встроить iframe</span>
        </div>
        <div
          class="block-type-option"
          @click="addNewBlock('divider', blockTypeMenuIndex)"
        >
          <span class="block-type-icon">—</span>
          <span class="block-type-label">Разделитель</span>
        </div>
      </div>
    </div>

    <!-- Контекстное меню блока -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="menuPosition"
      @mouseenter="handleMenuMouseEnter('context')"
      @mouseleave="handleMenuMouseLeave('context')"
    >
      <button
        v-for="(action, index) in contextActions"
        :key="index"
        @click="executeAction(action.action)"
        :class="{ danger: action.danger }"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Диалог для встраиваемого контента -->
    <div v-if="showEmbed" class="embed-dialog">
      <div class="embed-dialog-content">
        <h3>Вставить {{ embedServiceName }}</h3>
        <div class="form-group">
          <label>URL или ID:</label>
          <input type="text" v-model="embedUrl" class="form-input" />
        </div>
        <div class="form-group">
          <label>Подпись (опционально):</label>
          <input type="text" v-model="embedCaption" class="form-input" />
        </div>
        <div class="embed-dialog-buttons">
          <button @click="cancelEmbedDialog">Отмена</button>
          <button @click="insertEmbed" class="primary">Вставить</button>
        </div>
      </div>
    </div>
  </div>
</template>




<script>
export default {
  name: "MarkerEditor",
  props: {
    marker: {
      type: Object,
      required: true,
    },
    category: {
      type: Object,
      default: null,
    },
    parentWidth: {
      type: Number,
      default: window.innerWidth,
    },
  },
  data() {
    return {
      localMarker: JSON.parse(JSON.stringify(this.marker)),
      hoveredBlockIndex: null,
      activeBlockIndex: null,
      showBlockTypeMenu: false,
      blockTypeMenuPosition: { top: "0px", left: "0px" },
      blockTypeMenuIndex: 0,
      draggingBlockIndex: null,
      dragOverIndex: null,
      showContextMenu: false,
      menuPosition: { top: "0px", left: "0px" },
      contextActions: [],
      menuMouseLeaveTimeout: null,
      contextMenuMouseLeaveTimeout: null,
      markdownContent: "",
      showAlertTypesMenu: false,
      submenuTimeout: null,
      // Добавляем переменные для изменения размера
      isResizing: false,
      editorWidth: 400,
      startX: 0,
      startWidth: 400,
    };
  },
  computed: {
    embedServiceName() {
      switch (this.embedService) {
        case "youtube":
          return "YouTube видео";
        case "map":
          return "Карту";
        default:
          return "контент";
      }
    },
  },
  mounted() {
    document.addEventListener("click", this.handleOutsideClick);

    // Проверяем, есть ли markdownContent в маркере и конвертируем его в блоки при необходимости
    if (
      this.localMarker.markdownContent &&
      (!this.localMarker.blocks || this.localMarker.blocks.length === 0)
    ) {
      console.log(
        "Преобразуем markdown в блоки при инициализации:",
        this.localMarker.markdownContent
      );
      this.localMarker.blocks = this.markdownToBlocks(
        this.localMarker.markdownContent
      );
    } else if (
      !this.localMarker.blocks ||
      this.localMarker.blocks.length === 0
    ) {
      // Если ни markdownContent, ни blocks нет, создаем пустой блок
      this.localMarker.blocks = [{ type: "text", content: "" }];
    }

    // Конвертируем имеющиеся блоки в markdown при монтировании
    this.updateMarkdownContent();

    // Гарантированно применяем autoGrow после полной загрузки DOM
    this.$nextTick(() => {
      this.resizeAllTextareas();
    });

    // Добавляем обработчики для изменения размера
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // Рассчитываем максимальную ширину
    this.calculateMaxWidth();

    // Добавляем обработчик изменения размера окна
    window.addEventListener("resize", this.calculateMaxWidth);
  },
  watch: {
    marker: {
      handler(newMarker) {
        console.log("Маркер обновлен:", newMarker);
        // Создаем глубокую копию маркера
        this.localMarker = JSON.parse(JSON.stringify(newMarker));

        // Проверяем, есть ли markdownContent в маркере и конвертируем его в блоки
        if (
          this.localMarker.markdownContent &&
          (!this.localMarker.blocks || this.localMarker.blocks.length === 0)
        ) {
          console.log(
            "Преобразуем markdown в блоки при обновлении:",
            this.localMarker.markdownContent
          );
          this.localMarker.blocks = this.markdownToBlocks(
            this.localMarker.markdownContent
          );
        } else if (
          !this.localMarker.blocks ||
          this.localMarker.blocks.length === 0
        ) {
          // Если ни markdownContent, ни blocks нет, создаем пустой блок
          this.localMarker.blocks = [{ type: "text", content: "" }];
        }

        // Обновляем все textarea после обновления данных
        this.$nextTick(() => {
          this.resizeAllTextareas();
        });
      },
      deep: true,
    },
  },
  updated() {
    // Вызываем resize при обновлении компонента
    this.$nextTick(() => {
      this.resizeAllTextareas();
    });
  },
  beforeUnmount() {
    document.removeEventListener("click", this.handleOutsideClick);
    clearTimeout(this.menuMouseLeaveTimeout);
    clearTimeout(this.contextMenuMouseLeaveTimeout);

    // Удаляем обработчики
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("resize", this.calculateMaxWidth);
  },
  methods: {
    handleTitleInput(event) {
      // Автоматически изменяем высоту поля заголовка при вводе
      this.autoGrow(event.target);
    },

    closeAllMenus() {
      this.showContextMenu = false;
      this.showBlockTypeMenu = false;
      clearTimeout(this.menuMouseLeaveTimeout);
      clearTimeout(this.contextMenuMouseLeaveTimeout);
    },

    handleOutsideClick(event) {
      // Закрываем контекстное меню при клике вне его
      if (this.showContextMenu) {
        const menu = document.querySelector(".context-menu");
        if (menu && !menu.contains(event.target)) {
          this.showContextMenu = false;
          clearTimeout(this.contextMenuMouseLeaveTimeout);
        }
      }

      // Закрываем меню типов блоков при клике вне его
      if (this.showBlockTypeMenu) {
        const menu = document.querySelector(".block-type-menu");
        if (menu && !menu.contains(event.target)) {
          this.showBlockTypeMenu = false;
          clearTimeout(this.menuMouseLeaveTimeout);
        }
      }
    },
    onBlockFocus(index) {
      // Сохраняем индекс активного блока
      this.hoveredBlockIndex = index;
      this.activeBlockIndex = index;

      // Находим textarea элемент и применяем autoGrow
      this.$nextTick(() => {
        const textareas = document.querySelectorAll(".content-block textarea");
        if (textareas[index]) {
          this.autoGrow(textareas[index]);
        }
      });

      // Если это последний блок и он не пустой, добавляем новый пустой блок
      if (index === this.localMarker.blocks.length - 1) {
        const block = this.localMarker.blocks[index];
        if (
          (block.type === "text" && block.content.trim() !== "") ||
          (block.type === "heading1" && block.content.trim() !== "") ||
          (block.type === "heading2" && block.content.trim() !== "") ||
          (block.type === "heading3" && block.content.trim() !== "") ||
          (block.type === "quote" && block.content.trim() !== "")
        ) {
          this.addNewBlock("text", index);
        }
      }
    },
    showAddBlockMenu(index, event) {
      event.stopPropagation();
      this.closeAllMenus(); // Закрываем все меню перед открытием нового

      this.blockTypeMenuIndex = index;
      this.showBlockTypeMenu = true;

      // Позиционируем меню рядом с кнопкой
      const rect = event.target.getBoundingClientRect();
      const menuHeight = 280; // Примерная высота меню
      const menuWidth = 200; // Примерная ширина меню

      // Проверяем, поместится ли меню снизу
      let top = rect.bottom + window.scrollY;
      let left = rect.left;

      // Если меню не помещается снизу, показываем его сверху
      if (top + menuHeight > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight;
      }

      // Если меню не помещается справа, показываем его слева
      if (left + menuWidth > window.innerWidth) {
        left = rect.right - menuWidth;
      }

      this.blockTypeMenuPosition = {
        top: `${top}px`,
        left: `${left}px`,
      };
    },
    addNewBlock(type, index) {
      // Создаем новый пустой блок
      const newBlock = {
        type,
        content: "",
      };

      // Переменная для хранения индекса нового блока
      let newIndex = index;

      // Если текущий блок пустой текстовый блок, заменяем его
      if (index < this.localMarker.blocks.length) {
        const currentBlock = this.localMarker.blocks[index];
        if (
          currentBlock.type === "text" &&
          currentBlock.content.trim() === ""
        ) {
          this.localMarker.blocks.splice(index, 1, newBlock);
        } else {
          this.localMarker.blocks.splice(index + 1, 0, newBlock);
          newIndex = index + 1;
        }
      } else {
        this.localMarker.blocks.push(newBlock);
        newIndex = this.localMarker.blocks.length - 1;
      }

      // Добавляем две пустые строки после разделителя, если он последний
      if (type === "divider") {
        // Проверяем, является ли разделитель последним блоком
        if (newIndex === this.localMarker.blocks.length - 1) {
          // Добавляем две пустые текстовые строки
          this.localMarker.blocks.push({ type: "text", content: "" });
          this.localMarker.blocks.push({ type: "text", content: "" });
        }
      }

      this.showBlockTypeMenu = false;

      // Фокусируемся на новом блоке и применяем autoGrow
      this.$nextTick(() => {
        // Получаем все текстовые поля
        const elements = document.querySelectorAll(
          ".content-block textarea, .content-block input"
        );

        // Определяем индекс элемента, на который нужно установить фокус
        let focusIndex;

        if (type === "divider") {
          // Если добавлен разделитель и он последний, фокусируемся на первой пустой строке после него
          if (newIndex === this.localMarker.blocks.length - 3) {
            focusIndex = this.localMarker.blocks.length - 3;
          } else {
            // Иначе фокусируемся на следующем за разделителем блоке, если он есть
            focusIndex =
              newIndex + 1 < this.localMarker.blocks.length
                ? newIndex + 1
                : newIndex;
          }
        } else {
          // Для всех остальных блоков устанавливаем фокус на сам добавленный блок
          focusIndex = newIndex;
        }

        // Устанавливаем фокус на нужный элемент, если он существует
        if (elements[focusIndex]) {
          elements[focusIndex].focus();
          if (elements[focusIndex].tagName === "TEXTAREA") {
            this.autoGrow(elements[focusIndex]);

            // Устанавливаем курсор в начало текстового поля
            elements[focusIndex].setSelectionRange(0, 0);
          }
        }
      });

      // Проверяем наличие пустого блока в конце
      this.ensureEmptyBlockAtEnd();
    },
    checkEmptyBlock(index) {
      const block = this.localMarker.blocks[index];

      // Проверяем, является ли блок последним
      if (index === this.localMarker.blocks.length - 1) {
        // Если последний блок не пустой, добавляем новый пустой блок
        if (
          (block.type === "text" && block.content.trim() !== "") ||
          (block.type === "heading1" && block.content.trim() !== "") ||
          (block.type === "heading2" && block.content.trim() !== "") ||
          (block.type === "heading3" && block.content.trim() !== "") ||
          (block.type === "quote" && block.content.trim() !== "")
        ) {
          this.addNewBlock("text", index);
        }
      }
    },
    handleKeyDown(event, index) {
      const block = this.localMarker.blocks[index];

      // Обработка стрелок для навигации между блоками
      if (
        ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)
      ) {
        const textarea = event.target;
        const cursorPosition = textarea.selectionStart;
        const contentLength = textarea.value.length;

        // Стрелка влево/вверх в начале блока - переход к концу предыдущего блока
        if (
          (event.key === "ArrowLeft" || event.key === "ArrowUp") &&
          cursorPosition === 0 &&
          index > 0
        ) {
          // Проверяем предыдущий блок
          const prevIndex = index - 1;
          const prevBlock = this.localMarker.blocks[prevIndex];

          // Если предыдущий блок - divider, пропускаем его
          if (prevBlock.type === "divider") {
            if (index > 1) {
              event.preventDefault();
              this.$nextTick(() => {
                const textareas = document.querySelectorAll(
                  ".content-block textarea"
                );
                if (textareas[index - 2]) {
                  textareas[index - 2].focus();
                  const len = textareas[index - 2].value.length;
                  textareas[index - 2].setSelectionRange(len, len);
                }
              });
            }
            return;
          }

          // Переход к предыдущему блоку
          // Проверяем, что предыдущий блок содержит текстовое поле
          const textTypes = [
            "text",
            "heading1",
            "heading2",
            "heading3",
            "quote",
            "list-item",
            "ordered-list-item",
            "task-item",
            "alert",
            "iframe",
          ];
          if (textTypes.includes(prevBlock.type)) {
            event.preventDefault();
            this.$nextTick(() => {
              // Используем правильный индекс для доступа к textarea
              const textareas = document.querySelectorAll(
                ".content-block textarea"
              );
              // Ищем textarea в предыдущем блоке
              let prevTextareaIndex = 0;
              let found = false;

              for (let i = 0; i < textareas.length; i++) {
                if (i > index) break;
                if (i === index - 1) {
                  prevTextareaIndex = i;
                  found = true;
                  break;
                }
              }

              if (found && textareas[prevTextareaIndex]) {
                textareas[prevTextareaIndex].focus();
                const len = textareas[prevTextareaIndex].value.length;
                textareas[prevTextareaIndex].setSelectionRange(len, len);
              }
            });
            return;
          }
        }

        // Стрелка вправо/вниз в конце блока - переход к началу следующего блока
        if (
          (event.key === "ArrowRight" || event.key === "ArrowDown") &&
          cursorPosition === contentLength &&
          index < this.localMarker.blocks.length - 1
        ) {
          // Проверяем следующий блок
          const nextIndex = index + 1;
          const nextBlock = this.localMarker.blocks[nextIndex];

          // Если следующий блок - divider, пропускаем его
          if (nextBlock.type === "divider") {
            if (index < this.localMarker.blocks.length - 2) {
              event.preventDefault();
              this.$nextTick(() => {
                const textareas = document.querySelectorAll(
                  ".content-block textarea"
                );
                if (textareas[index + 2]) {
                  textareas[index + 2].focus();
                  textareas[index + 2].setSelectionRange(0, 0);
                }
              });
            }
            return;
          }

          // Переход к следующему блоку
          const textTypes = [
            "text",
            "heading1",
            "heading2",
            "heading3",
            "quote",
            "list-item",
            "ordered-list-item",
            "task-item",
            "alert",
            "iframe",
          ];
          if (textTypes.includes(nextBlock.type)) {
            event.preventDefault();
            this.$nextTick(() => {
              const textareas = document.querySelectorAll(
                ".content-block textarea"
              );
              // Ищем textarea в следующем блоке
              let nextTextareaIndex = 0;
              let found = false;

              for (let i = 0; i < textareas.length; i++) {
                if (i > index) {
                  nextTextareaIndex = i;
                  found = true;
                  break;
                }
              }

              if (found && textareas[nextTextareaIndex]) {
                textareas[nextTextareaIndex].focus();
                textareas[nextTextareaIndex].setSelectionRange(0, 0);
              }
            });
            return;
          }
        }
      }

      // Обработка Backspace
      if (event.key === "Backspace") {
        const textarea = event.target;
        const cursorPosition = textarea.selectionStart;

        // Если курсор находится в начале текста (позиция 0) и есть предыдущий блок
        if (cursorPosition === 0 && index > 0) {
          const prevBlock = this.localMarker.blocks[index - 1];

          // Проверка, является ли предыдущий блок разделителем (divider)
          if (prevBlock.type === "divider") {
            event.preventDefault();

            // Просто удаляем divider
            this.localMarker.blocks.splice(index - 1, 1);

            // Обновляем автоматически высоту текущего блока
            this.$nextTick(() => {
              const textareas = document.querySelectorAll(
                ".content-block textarea"
              );
              if (textareas[index - 1]) {
                // Теперь индекс текущего блока уменьшился на 1
                this.autoGrow(textareas[index - 1]);
              }
            });

            return;
          }

          // Проверяем, что предыдущий блок может содержать текст
          if (
            [
              "text",
              "heading1",
              "heading2",
              "heading3",
              "quote",
              "list-item",
            ].includes(prevBlock.type)
          ) {
            event.preventDefault();

            // Сохраняем содержимое текущего блока
            const currentContent = block.content;
            // Сохраняем содержимое предыдущего блока
            const prevContent = prevBlock.content;
            // Определяем позицию курсора после объединения
            const newCursorPosition = prevContent.length;

            // Объединяем содержимое блоков
            prevBlock.content = prevContent + currentContent;

            // Удаляем текущий блок
            this.localMarker.blocks.splice(index, 1);

            // Переносим фокус на предыдущий блок и устанавливаем курсор в место объединения
            this.$nextTick(() => {
              const textareas = document.querySelectorAll(
                ".content-block textarea"
              );
              if (textareas[index - 1]) {
                textareas[index - 1].focus();
                textareas[index - 1].setSelectionRange(
                  newCursorPosition,
                  newCursorPosition
                );
                this.autoGrow(textareas[index - 1]);
              }
            });

            // Проверяем наличие пустого блока в конце
            this.ensureEmptyBlockAtEnd();
            return;
          }
        }

        // Обработка Backspace в пустом блоке (оставляем существующую логику)
        if (
          (block.type === "text" ||
            block.type === "heading1" ||
            block.type === "heading2" ||
            block.type === "heading3" ||
            block.type === "quote" ||
            block.type === "list-item") &&
          block.content.trim() === ""
        ) {
          // Не удаляем блок, если он единственный
          if (this.localMarker.blocks.length <= 1) {
            return;
          }

          event.preventDefault();

          // Запоминаем предыдущий индекс для переноса фокуса
          const prevIndex = Math.max(0, index - 1);

          // Удаляем текущий блок
          this.localMarker.blocks.splice(index, 1);

          // Переносим фокус на предыдущий блок
          this.$nextTick(() => {
            const textareas = document.querySelectorAll(
              ".content-block textarea"
            );
            if (textareas[prevIndex]) {
              textareas[prevIndex].focus();
              // Устанавливаем курсор в конец текста
              const len = textareas[prevIndex].value.length;
              textareas[prevIndex].setSelectionRange(len, len);
            }
          });

          // Проверяем наличие пустого блока в конце
          this.ensureEmptyBlockAtEnd();
          return;
        }
      }

      // Обработка Enter для создания нового блока
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        const textarea = event.target;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = block.content.substring(0, cursorPosition);
        const textAfterCursor = block.content.substring(cursorPosition);

        // Обновляем текст текущего блока
        block.content = textBeforeCursor;

        // Создаем новый блок с текстом после курсора
        // Если текущий блок - элемент списка, создаем еще один элемент списка
        const newBlockType = block.type === "list-item" ? "list-item" : "text";

        this.localMarker.blocks.splice(index + 1, 0, {
          type: newBlockType,
          content: textAfterCursor,
        });

        // Переносим фокус на новый блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll(
            ".content-block textarea"
          );
          if (textareas[index + 1]) {
            textareas[index + 1].focus();
            textareas[index + 1].setSelectionRange(0, 0);
            this.autoGrow(textareas[index + 1]);
          }
        });

        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
    },
    onDragStart(event, index) {
      this.draggingBlockIndex = index;
      event.dataTransfer.effectAllowed = "move";
    },
    onDragEnd() {
      if (this.draggingBlockIndex !== null && this.dragOverIndex !== null) {
        const block = this.localMarker.blocks[this.draggingBlockIndex];
        this.localMarker.blocks.splice(this.draggingBlockIndex, 1);
        this.localMarker.blocks.splice(this.dragOverIndex, 0, block);
      }
      this.draggingBlockIndex = null;
      this.dragOverIndex = null;
    },
    save() {
      // Обновляем markdown-контент перед сохранением
      this.updateMarkdownContent();

      // Создаем копию локального маркера для сохранения
      const markerToSave = {
        ...this.localMarker,
        name: this.localMarker.name || "Метка без названия", // Обеспечиваем наличие имени
        markdownContent: this.localMarker.markdownContent,
        blocks: this.localMarker.blocks,
      };

      console.log("Сохраняем маркер:", markerToSave);

      // Передаем данные родительскому компоненту
      this.$emit("save", markerToSave);
    },
    ensureEmptyBlockAtEnd() {
      const lastBlockIndex = this.localMarker.blocks.length - 1;
      if (lastBlockIndex >= 0) {
        const lastBlock = this.localMarker.blocks[lastBlockIndex];

        // Если последний блок не является пустым текстовым блоком,
        // добавляем новый пустой блок
        if (!(lastBlock.type === "text" && lastBlock.content.trim() === "")) {
          this.localMarker.blocks.push({ type: "text", content: "" });
        }
      } else {
        // Если блоков нет, добавляем первый пустой блок
        this.localMarker.blocks.push({ type: "text", content: "" });
      }
    },
    showBlockMenu(event, index) {
      event.stopPropagation();
      event.preventDefault();

      this.closeAllMenus(); // Закрываем все меню перед открытием нового

      this.showContextMenu = true;

      // Позиционируем контекстное меню
      const menuHeight = 100; // Примерная высота меню
      const menuWidth = 150; // Примерная ширина меню

      // Получаем координаты кнопки относительно контейнера
      const rect = event.target.getBoundingClientRect();
      const editorRect = this.$el.getBoundingClientRect();

      let top = rect.top - editorRect.top + rect.height;
      let left = rect.left - editorRect.left;

      // Если меню не помещается снизу, показываем его сверху
      if (top + menuHeight > editorRect.height) {
        top = rect.top - editorRect.top - menuHeight;
      }

      // Если меню не помещается справа, показываем его слева
      if (left + menuWidth > editorRect.width) {
        left = rect.right - editorRect.left - menuWidth;
      }

      this.menuPosition = {
        top: `${top}px`,
        left: `${left}px`,
      };

      this.contextActions = [
        { label: "Дублировать", action: "duplicateBlock" },
        { label: "Удалить", action: "deleteBlock", danger: true },
      ];

      this.activeItem = this.localMarker.blocks[index];
      this.activeItemIndex = index;
    },
    handleMenuMouseEnter(menuType) {
      if (menuType === "blockType") {
        clearTimeout(this.menuMouseLeaveTimeout);
      } else if (menuType === "context") {
        clearTimeout(this.contextMenuMouseLeaveTimeout);
      }
    },

    handleMenuMouseLeave(menuType) {
      if (menuType === "blockType") {
        this.menuMouseLeaveTimeout = setTimeout(() => {
          this.showBlockTypeMenu = false;
        }, 300);
      } else if (menuType === "context") {
        this.contextMenuMouseLeaveTimeout = setTimeout(() => {
          this.showContextMenu = false;
        }, 300);
      }
    },
    duplicateBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Создаем глубокую копию блока
        const blockCopy = JSON.parse(JSON.stringify(this.activeItem));

        // Вставляем копию после оригинала
        this.localMarker.blocks.splice(this.activeItemIndex + 1, 0, blockCopy);

        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
      this.showContextMenu = false;
    },
    deleteBlock() {
      if (this.activeItem && this.activeItemIndex !== null) {
        // Не удаляем блок, если он единственный
        if (this.localMarker.blocks.length <= 1) {
          return;
        }

        // Удаляем блок
        this.localMarker.blocks.splice(this.activeItemIndex, 1);

        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
      }
      this.showContextMenu = false;
    },
    executeAction(action) {
      if (action === "duplicateBlock") {
        this.duplicateBlock();
      } else if (action === "deleteBlock") {
        this.deleteBlock();
      }
    },
    // Преобразование блоков в Markdown
    updateMarkdownContent() {
      if (!this.localMarker.blocks || !this.localMarker.blocks.length) {
        this.markdownContent = "";
        this.localMarker.markdownContent = "";
        return;
      }

      // Преобразуем блоки в markdown
      const markdown = this.blocksToMarkdown(this.localMarker.blocks);

      // Сохраняем markdown в свойствах
      this.markdownContent = markdown;
      this.localMarker.markdownContent = markdown;

      console.log("Markdown обновлен:", markdown);
    },

    // Преобразование блоков в Markdown
    blocksToMarkdown(blocks) {
      if (!blocks || !blocks.length) return "";

      let result = [];
      let listMode = false;
      let listContents = [];

      blocks.forEach((block) => {
        if (block.type === "list-item") {
          // Накапливаем элементы списка
          listMode = true;
          if (block.content.trim() !== "") {
            listContents.push(`* ${block.content}`);
          }
        } else {
          // Если до этого был список, выводим его и сбрасываем режим списка
          if (listMode && listContents.length > 0) {
            result.push(listContents.join("\n"));
            listContents = [];
            listMode = false;
          }

          // Обрабатываем другие типы блоков
          switch (block.type) {
            case "text":
              if (block.content.trim() !== "") {
                result.push(block.content);
              }
              break;
            case "heading1":
              if (block.content.trim() !== "") {
                result.push(`# ${block.content}`);
              }
              break;
            case "heading2":
              if (block.content.trim() !== "") {
                result.push(`## ${block.content}`);
              }
              break;
            case "heading3":
              if (block.content.trim() !== "") {
                result.push(`### ${block.content}`);
              }
              break;
            case "quote":
              if (block.content.trim() !== "") {
                result.push(`> ${block.content}`);
              }
              break;
            case "divider":
              result.push("---");
              break;
            case "ordered-list-item": {
              if (block.content.trim() !== "") {
                result.push(`${block.order || 1}. ${block.content}`);
              }
              break;
            }
            case "task-item": {
              const checkboxText = block.completed ? "[x]" : "[ ]";
              if (block.content.trim() !== "") {
                result.push(`- ${checkboxText} ${block.content}`);
              }
              break;
            }
            case "alert":
              if (block.content.trim() !== "") {
                result.push(
                  `> [!${block.alertType.toUpperCase()}]\n> ${block.content}`
                );
              }
              break;
            case "iframe":
              if (block.content.trim() !== "") {
                result.push(`\`\`\`html\n${block.content}\n\`\`\``);
              }
              break;
          }
        }
      });

      // Не забываем про список в конце документа
      if (listMode && listContents.length > 0) {
        result.push(listContents.join("\n"));
      }

      return result.filter((content) => content !== "").join("\n\n");
    },

    // Преобразование Markdown в блоки
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

      return blocks;
    },

    // Экспорт содержимого в markdown файл
    exportMarkdown() {
      // Обновляем markdown-контент перед экспортом
      this.updateMarkdownContent();

      // Создаем файл для скачивания
      const fileName = `${this.localMarker.name.replace(/\s+/g, "_")}.md`;
      const blob = new Blob([this.markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);

      // Создаем ссылку и эмулируем клик
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Очищаем ресурсы
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    },
    // Новая улучшенная функция для изменения всех textarea
    resizeAllTextareas() {
      const textareas = document.querySelectorAll(".form-textarea");
      textareas.forEach((textarea) => {
        this.autoGrow(textarea);
      });
    },
    // Обработчик ввода в textarea
    handleTextareaInput(event, index) {
      this.autoGrow(event.target);
      this.checkEmptyBlock(index);
    },
    // Улучшенная функция autoGrow
    autoGrow(element) {
      if (!element) return;

      // Сохраняем положение скролла
      const scrollPos =
        window.pageYOffset || document.documentElement.scrollTop;

      // Клонируем стили для точного расчета
      const computedStyle = window.getComputedStyle(element);
      const lineHeight =
        parseFloat(computedStyle.lineHeight) ||
        parseInt(computedStyle.fontSize) * 1.2;

      // Сначала сбрасываем высоту
      element.style.height = "0";

      // Вычисляем высоту на основе содержимого
      // Учитываем только высоту текста и минимальную высоту строки
      const textHeight = element.scrollHeight;

      // Подсчитываем количество строк (приблизительно)
      const lines = element.value.split("\n").length;

      // Рассчитываем точную высоту на основе количества строк и высоты строки
      // Добавляем небольшой отступ для предотвращения обрезания текста
      const calculatedHeight = lines * lineHeight + 8;

      // Используем большее из вычисленных значений для надежности
      const newHeight = Math.max(textHeight, calculatedHeight);

      // Устанавливаем высоту
      element.style.height = `${newHeight}px`;

      // Восстанавливаем положение скролла
      window.scrollTo(0, scrollPos);
    },
    handleTextareaBlur(index) {
      // Снимаем метку активного блока
      if (this.activeBlockIndex === index) {
        this.activeBlockIndex = null;
      }
    },
    addAlertBlock(type, index) {
      this.showAlertTypesMenu = false;
      this.showBlockTypeMenu = false;

      // Создаем новый блок уведомления
      const newBlock = {
        type,
        content: "",
      };

      // Вставляем блок
      let newIndex = index;
      if (index < this.localMarker.blocks.length) {
        const currentBlock = this.localMarker.blocks[index];
        if (
          currentBlock.type === "text" &&
          currentBlock.content.trim() === ""
        ) {
          this.localMarker.blocks.splice(index, 1, newBlock);
        } else {
          this.localMarker.blocks.splice(index + 1, 0, newBlock);
          newIndex = index + 1;
        }
      } else {
        this.localMarker.blocks.push(newBlock);
        newIndex = this.localMarker.blocks.length - 1;
      }

      // Фокусируемся на новом блоке
      this.$nextTick(() => {
        const textareas = document.querySelectorAll(".content-block textarea");
        if (textareas[newIndex]) {
          textareas[newIndex].focus();
          textareas[newIndex].setSelectionRange(0, 0);
          this.autoGrow(textareas[newIndex]);
        }
      });

      // Проверяем наличие пустого блока в конце
      this.ensureEmptyBlockAtEnd();
    },
    showEmbedDialog(service, index) {
      this.showBlockTypeMenu = false;

      this.embedService = service;
      this.embedUrl = "";
      this.embedCaption = "";
      this.embedTargetIndex = index;

      this.showEmbed = true;
    },
    cancelEmbedDialog() {
      this.showEmbed = false;
    },
    insertEmbed() {
      if (!this.embedUrl.trim()) {
        this.$alert.error("Пожалуйста, введите URL или ID");
        return;
      }

      // Извлекаем ID из URL, если это полный URL
      let serviceId = this.embedUrl;

      if (
        this.embedService === "youtube" &&
        this.embedUrl.includes("youtube.com")
      ) {
        // Извлекаем ID из YouTube URL
        const match = this.embedUrl.match(
          /(?:\/|v=)([a-zA-Z0-9_-]{11})(?:\/|&|$)/
        );
        if (match) {
          serviceId = match[1];
        }
      }

      // Создаем блок встраиваемого контента
      const embedBlock = {
        type: "embed",
        service: this.embedService,
        serviceId: serviceId,
        caption: this.embedCaption,
      };

      // Вставляем блок
      if (this.embedTargetIndex < this.localMarker.blocks.length) {
        this.localMarker.blocks.splice(
          this.embedTargetIndex + 1,
          0,
          embedBlock
        );
      } else {
        this.localMarker.blocks.push(embedBlock);
      }

      this.showEmbed = false;

      // Проверяем наличие пустого блока в конце
      this.ensureEmptyBlockAtEnd();
    },
    editEmbed(index) {
      const block = this.localMarker.blocks[index];
      if (block.type === "embed") {
        this.embedService = block.service;
        this.embedUrl = block.serviceId;
        this.embedCaption = block.caption || "";
        this.embedTargetIndex = index;
        this.showEmbed = true;
      }
    },
    getOrderNumber(index) {
      // Начинаем с 1 для первого элемента или продолжаем после предыдущего нумерованного списка
      let order = 1;
      for (let i = 0; i < index; i++) {
        if (this.localMarker.blocks[i].type === "ordered-list-item") {
          if (i === index - 1 || this.isConsecutiveOrderedListItem(i, index)) {
            order = (this.localMarker.blocks[i].order || 1) + 1;
          }
        } else {
          // Сбрасываем, если между элементами есть другие типы блоков
          order = 1;
        }
      }
      // Обновляем порядковый номер в блоке
      this.localMarker.blocks[index].order = order;
      return order;
    },
    isConsecutiveOrderedListItem(firstIndex, secondIndex) {
      for (let i = firstIndex + 1; i < secondIndex; i++) {
        if (this.localMarker.blocks[i].type !== "ordered-list-item") {
          return false;
        }
      }
      return true;
    },
    handleOrderedListKeyDown(event, index) {
      // Базовая обработка как в handleKeyDown
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        const textarea = event.target;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = this.localMarker.blocks[
          index
        ].content.substring(0, cursorPosition);
        const textAfterCursor =
          this.localMarker.blocks[index].content.substring(cursorPosition);

        // Обновляем текущий блок
        this.localMarker.blocks[index].content = textBeforeCursor;

        // Создаем новый блок с типом ordered-list-item
        this.localMarker.blocks.splice(index + 1, 0, {
          type: "ordered-list-item",
          content: textAfterCursor,
          order: (this.localMarker.blocks[index].order || 1) + 1, // Увеличиваем порядковый номер
        });

        // Обновляем порядковые номера для всех последующих элементов нумерованного списка
        this.updateOrderedListNumbers(index + 2);

        // Устанавливаем фокус на новый блок
        this.$nextTick(() => {
          const textareas = document.querySelectorAll(
            ".content-block textarea"
          );
          if (textareas[index + 1]) {
            textareas[index + 1].focus();
            textareas[index + 1].setSelectionRange(0, 0);
            this.autoGrow(textareas[index + 1]);
          }
        });

        // Проверяем наличие пустого блока в конце
        this.ensureEmptyBlockAtEnd();
        return;
      }

      // Делегируем остальную обработку стандартному обработчику
      this.handleKeyDown(event, index);
    },
    updateOrderedListNumbers(startIndex) {
      let currentOrder = 1;
      let lastListItemIndex = -1;

      for (let i = 0; i < this.localMarker.blocks.length; i++) {
        if (this.localMarker.blocks[i].type === "ordered-list-item") {
          if (lastListItemIndex === -1 || i - lastListItemIndex > 1) {
            // Начало нового списка
            currentOrder = 1;
          } else {
            // Продолжение существующего списка
            currentOrder++;
          }

          if (i >= startIndex) {
            this.localMarker.blocks[i].order = currentOrder;
          }

          lastListItemIndex = i;
        }
      }
    },
    toggleTaskCompletion(index) {
      const block = this.localMarker.blocks[index];
      if (block.type === "task-item") {
        block.completed = !block.completed;
      }
    },
    getAlertPlaceholder(alertType) {
      switch (alertType) {
        case "info":
          return "Информационное сообщение";
        case "warning":
          return "Предупреждение";
        case "error":
          return "Сообщение об ошибке";
        case "success":
          return "Сообщение об успехе";
        default:
          return "Уведомление";
      }
    },
    handleSubmenuMouseEnter(type) {
      clearTimeout(this.submenuTimeout);

      if (type === "alert") {
        this.showAlertTypesMenu = true;
      }
    },

    handleSubmenuMouseLeave(type) {
      this.submenuTimeout = setTimeout(() => {
        if (type === "alert") {
          this.showAlertTypesMenu = false;
        }
      }, 300);
    },
    getSanitizedHtml(html) {
      // Обрабатываем случай с iframe
      if (html.includes("<iframe")) {
        try {
          // Убираем фиксированные размеры из iframe
          let modified = html
            .replace(/width\s*=\s*["'].*?["']/gi, 'width="100%"')
            .replace(/height\s*=\s*["'].*?["']/gi, "")
            .replace(/style\s*=\s*["'](.*?)["']/gi, function () {
              // Сохраняем только нужные стили и добавляем width: 100%
              return 'style="width: 100%; max-width: 100%;"';
            });
          return modified;
        } catch (e) {
          console.error("Ошибка при обработке HTML:", e);
          return html;
        }
      }
      return html;
    },
    // Методы для изменения размера панели
    startResize(e) {
      this.isResizing = true;
      this.startX = e.clientX;
      this.startWidth = this.editorWidth;
      e.preventDefault();
    },

    handleMouseMove(e) {
      if (!this.isResizing) return;

      const maxWidth = this.calculateMaxWidth();
      const minWidth = 400;

      // Вычисляем новую ширину
      const width = this.startWidth - (e.clientX - this.startX);

      // Ограничиваем ширину минимальным и максимальным значением
      this.editorWidth = Math.min(Math.max(width, minWidth), maxWidth);
    },

    handleMouseUp() {
      this.isResizing = false;
    },

    calculateMaxWidth() {
      // Получаем ширину родительского контейнера (map-view)
      let parentWidth = this.parentWidth;
      return Math.max(parentWidth * 0.9 - 300, 800); // 90% от ширины родителя или минимум 800px
    },
    getAlertTypeLabel(alertType) {
      switch (alertType) {
        case "info":
          return "Информация";
        case "warning":
          return "Предупреждение";
        case "error":
          return "Ошибка";
        case "success":
          return "Успех";
        default:
          return "Уведомление";
      }
    },
  },
};
</script>



<style scoped src="@/assets/css/components/MarkerEditor.css">
</style>