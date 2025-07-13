// src/handlers/commandsHandler/startCommand.js

import getConfig from '../../env';
import TelegramBot from '../../api/TelegramBot';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理 /start 命令
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<void>}
 */
async function handleStartCommand(message, env) {
	console.log('处理 /start 命令');
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	const modelName = config.modelName;

	const {
		chat: { id: chatId },
		message_id: replyToMessageId,
	} = message;

	try {
		if (chatId && replyToMessageId) {
			const { message_id: startMessageId } = await bot.sendMessage({
				chat_id: chatId,
				text: [
					`🤖 当前使用模型：\`${modelName}\``,
					'✨ @ 我或者回复我的消息，也可以回复某条消息并 @ 我，\n    即可向我提问，可以是图片、视频、文件或者文本',
					'👍 由 Cloudflare Workers 和 Gemini API 提供支持',
				].join('\n\n'),

				reply_to_message_id: replyToMessageId,
			});

			if (startMessageId) {
				await scheduleDeletion(env, chatId, startMessageId, 3 * 60 * 1_000);
			}

			await scheduleDeletion(env, chatId, replyToMessageId, 3 * 60 * 1_000);
		}
	} catch (error) {
		console.error('处理 /start 命令时出错：', error);
		throw error;
	}
}

export default handleStartCommand;
