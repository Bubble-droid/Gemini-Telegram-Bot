// src/handlers/commandsHandler/toolsCommand.js

import tools from '../../api/GeminiAPI/toolDeclarations';
import TelegramBot from '../../api/TelegramBot';
import { scheduleDeletion } from '../../utils/scheduler';

/**
 * 处理 /tools 命令
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<void>}
 */
async function handleToolsCommand(message, env) {
	console.log('处理 /tools 命令');
	const bot = new TelegramBot(env);

	const {
		chat: { id: chatId },
		message_id: replyToMessageId,
	} = message;

	try {
		const toolList = tools[0].functionDeclarations.map((tool) => ` - \`${tool.name}\`: ${tool.description}`).join('\n');
		const { message_id: toolsMessageId } = await bot.sendMessage({
			chat_id: chatId,
			text: `🛠  模型可用工具列表：\n\n${toolList}`,
			reply_to_message_id: replyToMessageId,
		});

		if (toolsMessageId) {
			await scheduleDeletion(env, chatId, toolsMessageId, 10 * 60 * 1_000);
		}

		await scheduleDeletion(env, chatId, replyToMessageId, 10 * 60 * 1_000);
	} catch (error) {
		console.error('处理 /tools 命令时出错：', error);
		throw error;
	}
}

export default handleToolsCommand;
