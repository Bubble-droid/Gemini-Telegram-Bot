// src/utils/errorNotification.js

import getConfig from '../env';
import TelegramBot from '../api/TelegramBot';
import { getCurrentTime } from './helpers';

/**
 * 发送错误通知给维护人员
 * @param {object} env Cloudflare Worker environment
 * @param {Error} error 错误对象
 * @param {string} context  错误发生的上下文描述 (例如函数名)
 * @returns {Promise<void>}
 */
async function sendErrorNotification(env, error = new Error(''), context = '') {
	const config = getConfig(env);
	const bot = new TelegramBot(env);
	try {
		const adminId = config.adminId;
		const currentTime = getCurrentTime();

		if (adminId) {
			// Use the 'error' parameter consistently
			const errorMessage = `
			**[错误告警]**

			发生时间: \`${currentTime || '未知时间'}\`

			错误上下文: \`${context}\`

			错误信息: \`${error.message || error}\`

			堆栈追踪:
			\`\`\`javascript
			${error.stack || 'N/A'}
			\`\`\`
			`;

			await bot.sendMessage({
				chat_id: adminId,
				text: errorMessage,
			});
		} else {
			console.warn(
				'未配置管理 ID，无法发送错误通知:',
				context,
				'-',
				error.message
			);
		}
	} catch (handlerError) {
		console.error('发送错误通知时发生内部错误:', handlerError);
	}
}

export default sendErrorNotification;
