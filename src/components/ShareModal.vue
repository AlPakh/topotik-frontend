<template>
  <div class="share-modal-overlay" @click.self="close">
    <div class="share-modal">
      <div class="share-modal-header">
        <h2>Поделиться</h2>
        <button class="close-button" @click="close">&times;</button>
      </div>

      <div class="share-modal-content">
        <div class="share-invite-form">
          <input
            type="text"
            v-model="newInviteEmail"
            placeholder="Добавьте людей по email"
            @keyup.enter="addSharing"
          />
          <button
            class="invite-button"
            @click="addSharing"
            :disabled="!newInviteEmail"
          >
            Добавить
          </button>
        </div>

        <!-- Секция с текущими правами доступа -->
        <div class="share-access-section">
          <div class="share-access-header">
            <span>{{ accessListTitle }}</span>
          </div>
          <div class="share-access-list-container">
            <!-- Владелец -->
            <div class="share-access-item owner">
              <div class="user-avatar">{{ getInitials(owner?.username) }}</div>
              <div class="user-info">
                <div class="user-name">
                  {{ owner?.username || "Вы" }} (владелец)
                </div>
                <div class="user-email">{{ owner?.email }}</div>
              </div>
            </div>

            <!-- Список пользователей с доступом -->
            <div v-if="sharingList.length > 0" class="share-access-list">
              <div
                v-for="share in sharingList"
                :key="share.sharing_id"
                class="share-access-item"
              >
                <div class="user-avatar">
                  {{
                    getInitials(
                      share.user_id
                        ? getUserName(share.user_id)
                        : share.is_embed
                        ? "Виджет"
                        : "Ссылка"
                    )
                  }}
                </div>
                <div class="user-info">
                  <div class="user-name">
                    {{
                      share.user_id
                        ? getUserName(share.user_id)
                        : share.slug
                        ? "Ссылка"
                        : share.is_embed
                        ? "Виджет"
                        : "Доступ"
                    }}
                  </div>
                  <div v-if="share.user_id" class="user-email">
                    {{ getUserEmail(share.user_id) }}
                  </div>
                </div>
                <div class="access-controls">
                  <select
                    v-if="share.user_id"
                    v-model="share.access_level"
                    @change="updateAccessLevel(share)"
                    class="access-level-select"
                  >
                    <option value="view">Просмотр</option>
                    <option value="edit">Редактирование</option>
                  </select>
                  <button
                    class="revoke-button"
                    @click="revokeAccess(share.sharing_id)"
                  >
                    <span class="revoke-icon">⨯</span>
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="no-shared-users">
              Ресурс не используется совместно
            </div>
          </div>
        </div>

        <!-- Секция для встраиваемого виджета -->
        <div class="share-embed-section" v-if="embedEnabled">
          <div class="share-embed-header">
            <span>Встраиваемый виджет</span>
            <div class="toggle-switch">
              <input
                type="checkbox"
                id="embed-toggle"
                v-model="isEmbedActive"
                @change="toggleEmbed"
              />
              <label for="embed-toggle"></label>
            </div>
          </div>

          <div v-if="isEmbedActive && embedCode" class="embed-code-container">
            <div class="embed-code-scroll">
              <input
                type="text"
                readonly
                ref="embedCodeArea"
                v-model="embedCode"
                @click="selectAndCopyEmbedCode"
                class="embed-code-input"
              />
            </div>
            <button class="copy-button" @click="copyEmbedCode">
              {{ copyButtonText }}
            </button>
          </div>

          <div v-if="isEmbedActive && !embedCode" class="embed-code-loading">
            Генерация кода встраивания...
          </div>
        </div>
      </div>

      <div class="share-modal-footer">
        <!-- Кнопка для копирования ссылки доступа -->
        <div class="share-link-section">
          <button class="create-link-button" @click="copyOrCreateShareLink">
            {{ shareLink ? "Копировать ссылку" : "Создать ссылку" }}
          </button>
        </div>

        <button class="cancel-button" @click="close">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script>
import { sharingService } from "@/services/sharing";
import { showError } from "@/services/alertService";

export default {
  name: "ShareModal",
  props: {
    resourceType: {
      type: String,
      required: true,
      validator: (value) => ["map", "collection"].includes(value),
    },
    resourceId: {
      type: String,
      required: true,
    },
    owner: {
      type: Object,
      default: null,
    },
    // Опциональные пропсы
    showEmbedOption: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      sharingList: [],
      newInviteEmail: "",
      newAccessLevel: "view",
      isEmbedActive: false,
      embedCode: null,
      embedSharingId: null,
      shareLink: null,
      shareLinkSharingId: null,
      loading: false,
      copyButtonText: "Копировать",
      copyLinkButtonText: "Копировать ссылку",
      error: null,
      // Словарь для хранения данных пользователей
      userCache: {},
    };
  },
  computed: {
    accessListTitle() {
      return this.sharingList.length > 0 ? "Пользователи с доступом" : "Доступ";
    },
    embedEnabled() {
      return this.showEmbedOption && this.resourceType === "map";
    },
  },
  mounted() {
    this.fetchSharingList().then(() => {
      // Если ссылки нет, создаем её автоматически
      if (!this.shareLink) {
        this.createShareLink();
      }

      // Инициализируем виджет при открытии модального окна
      if (this.embedEnabled && !this.isEmbedActive && !this.embedCode) {
        this.isEmbedActive = true;
        this.toggleEmbed();
      }
    });
  },
  methods: {
    // Функция для загрузки информации о пользователях
    async fetchUserInfo() {
      try {
        // Получаем все уникальные ID пользователей из списка шеринга
        const userIds = this.sharingList
          .filter((share) => share.user_id)
          .map((share) => share.user_id);

        if (userIds.length === 0) return;

        // Загружаем информацию о каждом пользователе
        const { getUserById } = await import("@/services/users");

        for (const userId of userIds) {
          try {
            const userData = await getUserById(userId);
            // Сохраняем данные пользователя в кэш
            this.userCache[userId] = userData;
          } catch (error) {
            console.error(`Ошибка при загрузке пользователя ${userId}:`, error);
          }
        }
      } catch (error) {
        console.error("Ошибка при загрузке информации о пользователях:", error);
      }
    },

    // Получить имя пользователя по ID
    getUserName(userId) {
      // Если в кэше есть пользователь, возвращаем его имя или email
      if (this.userCache[userId]) {
        return (
          this.userCache[userId].username ||
          this.userCache[userId].email ||
          userId.substring(0, 8)
        );
      }

      // Если пользователя нет в кэше, возвращаем часть ID
      return userId.substring(0, 8);
    },

    // Получить email пользователя по ID
    getUserEmail(userId) {
      if (this.userCache[userId]) {
        return this.userCache[userId].email || "";
      }
      return "";
    },

    async fetchSharingList() {
      try {
        this.loading = true;
        this.sharingList = await sharingService.getResourceSharing(
          this.resourceType,
          this.resourceId
        );

        console.log("Получен список шеринга:", this.sharingList);

        // Проверяем, есть ли активный embedded виджет
        const embedSharing = this.sharingList.find(
          (share) => share.is_public && share.is_active && share.is_embed
        );
        if (embedSharing) {
          this.isEmbedActive = true;
          this.embedSharingId = embedSharing.sharing_id;
          await this.fetchEmbedCode(embedSharing.sharing_id);
        }

        // Проверяем есть ли уже созданная ссылка доступа
        const linkSharing = this.sharingList.find((share) => share.slug);
        if (linkSharing) {
          this.shareLinkSharingId = linkSharing.sharing_id;
          this.shareLink = this.generateShareLink(linkSharing);
        }

        // Загружаем информацию о пользователях
        await this.fetchUserInfo();
      } catch (error) {
        console.error("Ошибка при загрузке информации о доступе:", error);
        this.error = "Не удалось загрузить информацию о доступе";
      } finally {
        this.loading = false;
      }
    },

    async addSharing() {
      if (!this.newInviteEmail || !this.newInviteEmail.trim()) return;

      try {
        const email = this.newInviteEmail.trim();

        // Проверка, не добавлен ли уже этот email
        if (
          this.sharingList.some(
            (share) =>
              this.userCache[share.user_id] &&
              this.userCache[share.user_id].email === email
          )
        ) {
          this.$notify?.warning("Этот email уже имеет доступ");
          return;
        }

        // Создаем новую запись о доступе с правом просмотра по умолчанию
        await sharingService.createSharing(this.resourceType, this.resourceId, {
          user_email: email,
          accessLevel: "view", // По умолчанию даем право только на просмотр
          isActive: true,
        });

        // Обновляем список шеринга после успешного добавления
        await this.fetchSharingList();

        // Запрашиваем информацию о пользователях
        await this.fetchUserInfo();

        this.newInviteEmail = "";
        this.$notify?.success("Доступ предоставлен");
      } catch (error) {
        console.error("Ошибка при добавлении доступа:", error);

        // Проверяем наличие текста ошибки о ненайденном пользователе
        if (error.response && error.response.data) {
          const errorMessage = error.response.data.detail || "";
          if (errorMessage.includes("не найден") && this.newInviteEmail) {
            // Показываем специализированное сообщение для ненайденного пользователя
            this.$notify?.warning(
              `Пользователь ${this.newInviteEmail} не зарегистрирован в системе`
            );
            // Если компонент уведомлений не зарегистрирован, используем alertService
            if (!this.$notify) {
              showError(
                `Пользователь ${this.newInviteEmail} не зарегистрирован в системе`
              );
            }
            return;
          }
        }

        // Для всех остальных ошибок
        this.$notify?.error("Не удалось предоставить доступ");
        if (!this.$notify) {
          showError("Не удалось предоставить доступ");
        }
      }
    },

    async updateAccessLevel(sharing) {
      try {
        await sharingService.updateSharing(sharing.sharing_id, {
          access_level: sharing.access_level,
        });
        this.$notify?.success("Уровень доступа изменен");
      } catch (error) {
        console.error("Ошибка при обновлении уровня доступа:", error);
        this.$notify?.error("Не удалось обновить уровень доступа");
        // Откатываем изменение в случае ошибки
        await this.fetchSharingList();
      }
    },

    async revokeAccess(sharingId) {
      try {
        if (!sharingId) {
          console.error("ID шеринга не определен");
          return;
        }

        await sharingService.revokeSharing(sharingId);

        // Если это был embed или ссылка, сбрасываем соответствующие флаги
        if (sharingId === this.embedSharingId) {
          this.isEmbedActive = false;
          this.embedSharingId = null;
          this.embedCode = null;
        }

        if (sharingId === this.shareLinkSharingId) {
          this.shareLinkSharingId = null;
          this.shareLink = null;
        }

        // Обновляем список шеринга
        await this.fetchSharingList();

        this.$notify?.success("Доступ отозван");
      } catch (error) {
        console.error("Ошибка при отзыве доступа:", error);
        this.$notify?.error("Не удалось отозвать доступ");
      }
    },

    async createShareLink() {
      try {
        // Если ссылка уже существует, повторно используем её
        if (this.shareLink) {
          return;
        }

        // Создаем новую запись шеринга для ссылки
        const linkSharing = await sharingService.createSharing(
          this.resourceType,
          this.resourceId,
          {
            isPublic: false,
            isActive: true,
            generateSlug: true,
          }
        );

        this.shareLinkSharingId = linkSharing.sharing_id;
        this.shareLink = this.generateShareLink(linkSharing);

        // Обновляем список шеринга
        await this.fetchSharingList();
      } catch (error) {
        console.error("Ошибка при создании ссылки:", error);
        this.$notify?.error("Не удалось создать ссылку для доступа");
      }
    },

    generateShareLink(sharing) {
      // Формируем ссылку на основе slug или access_token
      const baseUrl = window.location.origin;
      if (sharing.slug) {
        return `${baseUrl}/share/${sharing.slug}`;
      } else if (sharing.access_token) {
        return `${baseUrl}/share?token=${sharing.access_token}`;
      }
      return null;
    },

    copyShareLink() {
      if (!this.shareLink) return;

      try {
        navigator.clipboard.writeText(this.shareLink);
        this.copyLinkButtonText = "Скопировано!";
        setTimeout(() => {
          this.copyLinkButtonText = "Копировать ссылку";
        }, 2000);
      } catch (err) {
        console.error("Не удалось скопировать ссылку:", err);
        // Запасной метод копирования
        const tempInput = document.createElement("input");
        document.body.appendChild(tempInput);
        tempInput.value = this.shareLink;
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        this.copyLinkButtonText = "Скопировано!";
        setTimeout(() => {
          this.copyLinkButtonText = "Копировать ссылку";
        }, 2000);
      }
    },

    async toggleEmbed() {
      if (this.isEmbedActive) {
        try {
          // Если embed уже существует, активируем его, иначе создаем новый
          if (this.embedSharingId) {
            await sharingService.updateSharing(this.embedSharingId, {
              is_active: true,
            });
            await this.fetchEmbedCode(this.embedSharingId);
          } else {
            console.log("Создание нового embed sharing");
            const embedSharing = await sharingService.createSharing(
              this.resourceType,
              this.resourceId,
              {
                isPublic: true,
                isActive: true,
                is_embed: true,
              }
            );

            console.log("Создан embed sharing:", embedSharing);
            this.embedSharingId = embedSharing.sharing_id;

            // Обновляем список шеринга
            await this.fetchSharingList();

            // Получаем код встраивания
            await this.fetchEmbedCode(embedSharing.sharing_id);
          }
        } catch (error) {
          console.error("Ошибка при активации встраиваемого виджета:", error);
          this.$notify?.error("Не удалось создать встраиваемый виджет");
          this.isEmbedActive = false;
        }
      } else if (this.embedSharingId) {
        try {
          // Деактивируем embed, но не удаляем запись
          await sharingService.updateSharing(this.embedSharingId, {
            is_active: false,
          });
          this.embedCode = null;
        } catch (error) {
          console.error("Ошибка при деактивации встраиваемого виджета:", error);
          this.$notify?.error("Не удалось отключить встраиваемый виджет");
          this.isEmbedActive = true;
        }
      }
    },

    async fetchEmbedCode(sharingId) {
      try {
        if (!sharingId) {
          console.error("ID шеринга для получения кода не определен");
          return;
        }

        const response = await sharingService.getEmbedCode(sharingId);
        this.embedCode = response.embed_code;
      } catch (error) {
        console.error("Ошибка при получении кода встраивания:", error);
        this.embedCode = null;
      }
    },

    copyEmbedCode() {
      if (!this.embedCode) return;

      try {
        navigator.clipboard.writeText(this.embedCode);
        this.copyButtonText = "Скопировано!";
        setTimeout(() => {
          this.copyButtonText = "Копировать";
        }, 2000);
      } catch (err) {
        console.error("Не удалось скопировать код:", err);
        this.selectAndCopyEmbedCode();
      }
    },

    selectAndCopyEmbedCode() {
      if (!this.embedCode || !this.$refs.embedCodeArea) return;

      this.$refs.embedCodeArea.select();
      try {
        document.execCommand("copy");
        this.copyButtonText = "Скопировано!";
        setTimeout(() => {
          this.copyButtonText = "Копировать";
        }, 2000);
      } catch (err) {
        console.error("Ошибка копирования:", err);
      }
    },

    getInitials(text) {
      if (!text) return "?";
      const parts = text.split("@")[0].split(/[._-]/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return text.substring(0, 2).toUpperCase();
    },

    close() {
      this.$emit("close");
    },

    /**
     * Копирует ссылку или создает новую, если она еще не существует
     */
    async copyOrCreateShareLink() {
      try {
        // Если ссылка еще не создана, создаем её
        if (!this.shareLink) {
          await this.createShareLink();
        }

        // Копируем ссылку в буфер обмена
        this.copyShareLink();
      } catch (error) {
        console.error("Ошибка при работе с ссылкой:", error);
        this.$notify?.error("Не удалось скопировать ссылку");
      }
    },
  },
};
</script>

<style scoped>
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.share-modal {
  background: white;
  border-radius: 8px;
  width: 480px;
  max-width: 95%;
  max-height: 90vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.share-modal-header {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.share-modal-header .close-button {
  padding: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.share-modal-content {
  padding: 16px 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.share-access-section,
.share-invite-section,
.share-embed-section {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  overflow: hidden;
}

.share-access-header,
.share-invite-header,
.share-embed-header {
  background-color: #f9f9f9;
  padding: 10px 16px;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-access-list-container {
  max-height: 200px;
  overflow-y: auto;
}

.share-access-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.share-access-item:last-child {
  border-bottom: none;
}

.share-access-item.owner {
  background-color: #f9f9f9;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background-color: #4a90e2;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.user-email {
  font-size: 0.8em;
  color: #666;
  margin-top: 2px;
}

.access-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.access-level-select {
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.revoke-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 18px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.revoke-button:hover {
  color: #f44336;
}

.share-invite-form {
  display: flex;
  margin-bottom: 16px;
  gap: 8px;
}

.share-invite-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.share-invite-form .invite-button {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 0 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.share-invite-form .invite-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.share-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-link-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.create-link-button {
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-button {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  color: #333;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 20px;
  transition: 0.3s;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + label {
  background-color: #4a90e2;
}

.toggle-switch input:checked + label:before {
  transform: translateX(16px);
}

.embed-code-container {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.embed-code-scroll {
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.embed-code-input {
  width: 100%;
  padding: 8px;
  border: none;
  outline: none;
  font-family: monospace;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.embed-code-loading {
  padding: 8px 16px;
  font-style: italic;
  color: #666;
}

.copy-button {
  white-space: nowrap;
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.no-shared-users {
  color: #666;
  padding: 16px;
  font-style: italic;
  text-align: center;
}
</style> 