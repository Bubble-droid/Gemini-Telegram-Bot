// src/handlers/commandsHandler/debug_outCommand.js

import TelegramBot from '../../api/TelegramBot';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理 /debug_out 命令
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<void>}
 */
async function handleDebugOutCommand(message, env) {
	console.log('处理 /debug_out 命令');
	const bot = new TelegramBot(env);

	try {
		const {
			chat: { id: chatId },
			message_id: replyToMessageId,
		} = message;

		if (chatId && replyToMessageId) {
			const { message_id: debugOutMessageId } = await bot.sendMessage({
				chat_id: chatId,
				text: 'Debug_out command received.', // 可以根据需要修改此消息
				reply_to_message_id: replyToMessageId,
			});

			if (debugOutMessageId) {
				await scheduleDeletion(env, chatId, debugOutMessageId, 3 * 60 * 1_000);
			}

			await scheduleDeletion(env, chatId, replyToMessageId, 3 * 60 * 1_000);
		}
	} catch (error) {
		console.error('处理 /debug_out 命令时出错：', error);
		throw error;
	}
}

export default handleDebugOutCommand;
