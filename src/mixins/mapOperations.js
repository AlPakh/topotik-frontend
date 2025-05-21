// src/mixins/mapOperations.js
// Миксин с общей логикой для карт (OSM и пользовательских)
import Cookies from 'js-cookie';
import { API_URL } from '@/api';

export const mapOperationsMixin = {
    methods: {
        // Загрузка данных карты по ID
        async getMapById(mapId) {
            try {
                const response = await fetch(
                    `${API_URL}/maps/${mapId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Cookies.get("access_token")}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Ошибка при получении карты: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error("Ошибка при получении данных карты:", error);
                throw error;
            }
        },

        // Загрузка коллекций маркеров для карты
        async loadCollectionsFromServer(mapId) {
            try {
                const response = await fetch(
                    `${API_URL}/collections?map_id=${mapId}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Cookies.get("access_token")}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Ошибка при загрузке коллекций: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error("Ошибка при загрузке коллекций для карты:", error);
                throw error;
            }
        },

        // Конвертер блоков в markdown
        blocksToMarkdown(blocks) {
            if (!blocks || !blocks.length) return "";

            return blocks
                .map((block) => {
                    switch (block.type) {
                        case "text":
                            return block.content;
                        case "heading1":
                            return `# ${block.content}`;
                        case "heading2":
                            return `## ${block.content}`;
                        case "heading3":
                            return `### ${block.content}`;
                        case "quote":
                            return `> ${block.content}`;
                        case "list":
                            if (block.items && block.items.length) {
                                return block.items.map((item) => `* ${item}`).join("\n");
                            }
                            return "";
                        case "divider":
                            return "---";
                        default:
                            return "";
                    }
                })
                .filter((content) => content !== "")
                .join("\n\n");
        },

        // Конвертер markdown в блоки
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

                // Элемент маркированного списка
                if (line.startsWith("- ") || line.startsWith("* ")) {
                    blocks.push({
                        type: "list-item",
                        content: line.substring(2).trim(),
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
                        nextLine === "---" ||
                        nextLine.startsWith("> ")
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
        }
    }
}; 