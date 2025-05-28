// src/handlers/messagesHandler/index.js

import TelegramBot from '../../api/TelegramBot';
import { scheduleDeletion } from '../../utils/scheduler';
import commandsHandler from '../commandsHandler';
import mentionMessageHandler from './mentionMessageHandler';
import normalMessageHandler from './normalMessageHandler';
import sendErrorNotification from '../../utils/errorNotification';
import newChatMemberHandler from './newChatMemberHandler';

/**
 * 处理接收到的 Telegram 消息
 * 根据消息类型（命令、提及、普通消息）分派到相应的处理函数
 * @param {object} message - Telegram Message 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 */
async function messagesHandler(message, env) {
	// if (message.chat.id === -1002033703290) return;

	if (message.chat?.type === 'private' || message.sticker) {
		return;
	}

	if (message.new_chat_member) {
		return newChatMemberHandler(message, env);
	}

	try {
		// 获取消息中的实体，用于识别命令、提及等特殊格式
		// 使用 || 运算符处理 entities 或 caption_entities 可能不存在的情况
		let messageFullyHandled = false; // 标记消息是否已被特定处理器完全处理

		if (message.entities || message.caption_entities) {
			const entities = message.entities || message.caption_entities;

			// 检查消息是否包含实体，并根据第一个实体的类型进行分派
			if (entities && entities.length > 0) {
				const firstEntity = entities[0];

				// 根据第一个实体的类型分派到相应的处理函数
				// 如果相应的处理器返回 true，则认为消息已被完全处理
				if (firstEntity.type === 'bot_command') {
					messageFullyHandled = await commandsHandler(message, env);
				} else if (firstEntity.type === 'mention') {
					messageFullyHandled = await mentionMessageHandler(message, env);
				}
				// 如果第一个实体是其他类型，messageFullyHandled 保持 false，将作为普通消息处理
			}
		}

		// 如果消息未被命令或提及处理器完全处理，则作为普通消息处理
		// 这确保了所有未被特殊处理的消息都能得到默认处理
		if (!messageFullyHandled) {
			await normalMessageHandler(message, env);
		}
	} catch (error) {
		console.error(`处理消息时发生错误 (消息ID: ${message?.message_id}, 对话ID: ${message?.chat?.id}):\n`, error);
		// 将 error 转换为字符串

		if (!error.toString().includes('不支持的文件类型')) {
			await sendErrorNotification(env, error, 'messages processing error');
		}

		const bot = new TelegramBot(env);
		const { message_id } = await bot.sendMessage({
			chat_id: message?.chat?.id,
			text: `❌ ${error.message || error}`,
			reply_to_message_id: message?.message_id,
		});

		if (message_id) {
			await scheduleDeletion(env, message.chat.id, message_id, 3 * 60 * 1_000);
		}
	}
}

export default messagesHandler;
