// src/handlers/updateHandler.js

import messagesHandler from './messagesHandler'; // 假设 messagesHandler 模块存在

/**
 * 处理接收到的 Telegram Bot API Update
 * @param {object} update - Telegram Bot API Update 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 */
async function updateHandler(update, env) {
	// console.log('Received update:', JSON.stringify(update, null, 2));
	console.log('Handling update...');

	if (!update.message) return;

	try {
		await messagesHandler(update.message, env);
	} catch (error) {
		console.error('Error handling update:', error);
	}

	// 根据 Update 类型分发处理
	// if (update.message) {
	// 	await messagesHandler(update.message, env);
	// } else if (update.callback_query) {
	// 	// 处理回调查询
	// 	console.log('Handling callback query:', update.callback_query);
	// 	// TODO: Implement callback query handling
	// } else if (update.inline_query) {
	// 	// 处理内联查询
	// 	console.log('Handling inline query:', update.inline_query);
	// 	// TODO: Implement inline query handling
	// }
}

export default updateHandler;