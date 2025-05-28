// src/handlers/webhookHandler.js

import getConfig from '../env';
import updateHandler from './updateHandler';

/**
 * 处理来自 Telegram Bot API 的 Webhook 请求
 * @param {Request} request - 传入的 Request 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<Response>} 处理结果的 Response 对象
 */
async function webhookHandler(request, env) {
	const config = getConfig(env);

	// 验证请求方法
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	// 验证 Secret Token
	const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
	if (!secretToken || secretToken !== config.secretToken) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const update = await request.json();
		// 将验证通过的 Update 交给 updateHandler 处理
		await updateHandler(update, env);
		return new Response('OK', { status: 200 });
	} catch (error) {
		console.error('Error processing webhook:', error);
		return new Response('Error processing webhook request', { status: 500 });
	}
}

export default webhookHandler;