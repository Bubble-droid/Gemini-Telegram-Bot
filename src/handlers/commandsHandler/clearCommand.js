// src/handlers/commandsHandler/clearCommand.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import clearChatContents from '../../chatContents/clearChatContents';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理 /clear 命令
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<void>}
 */
async function handleClearCommand(message, env) {
	console.log('处理 /clear 命令');
	const config = getConfig(env);
	const bot = new TelegramBot(env);

	const {
		chat: { id: chatId },
		message_id: replyToMessageId,
		from: { id: userId },
	} = message;

	try {
		if (chatId && userId && replyToMessageId) {
			const { message_id: clearMessageId } = await bot.sendMessage({
				chat_id: chatId,
				text: 'Clearing...',
				reply_to_message_id: replyToMessageId,
			});

			await clearChatContents(env, chatId, userId);

			if (clearMessageId) {
				await bot.deleteMessage({
					chat_id: chatId,
					message_id: clearMessageId,
				});
			}

			const { message_id: successMessageId } = await bot.sendMessage({
				chat_id: chatId,
				text: 'Chat contents cleared successfully.',
				reply_to_message_id: replyToMessageId,
			});

			if (successMessageId) {
				await scheduleDeletion(env, chatId, successMessageId, 10 * 1_000);
			}

			await scheduleDeletion(env, chatId, replyToMessageId, 10 * 1_000);
		}
	} catch (error) {
		console.error('处理 /clear 命令时出错：', error);
		throw error;
	}
}

export default handleClearCommand;
