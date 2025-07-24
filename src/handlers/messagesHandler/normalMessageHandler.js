// src/handlers/messagesHandler/normalMessageHandler.js

import handleMentionMessage from './mentionMessageHandler';
import getConfig from '../../env';

/**
 * 处理普通消息（非提及、非命令）
 * @param {object} message - Telegram 消息对象
 * @param {object} env - Cloudflare Worker 环境变量
 * @returns {Promise<void>}
 */
async function handleNormalMessage(message, env) {
	console.log('Handling normal message...');
	if (!message?.reply_to_message?.from?.is_bot) return;

	try {
		const config = getConfig(env);
		const botName = config.botName.replace('@', '').trim();
		if (message.reply_to_message.from.username === botName) {
			message.reply_to_message.text = message.reply_to_message.text
				.replace('⚠️ AI 的回答无法保证百分百准确，请自行判断！', '')
				.trim();
			await handleMentionMessage(message, env, true);
		}
	} catch (error) {
		console.error('Error handling normal message');
		throw error;
	}
}

export default handleNormalMessage;
