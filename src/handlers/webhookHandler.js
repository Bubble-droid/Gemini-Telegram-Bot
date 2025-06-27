// src/handlers/webhookHandler.js

import getConfig from '../env';
import updateHandler from './updateHandler';

/**
 * 处理来自 Telegram Bot API 的 Webhook 请求
 * @param {Request} request - 传入的 Request 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<Response>} 处理结果的 Response 对象
 */
async function webhookHandler(request, env, ctx) {
	const config = getConfig(env);

	// 验证请求方法
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 200 });
	}

	// 验证 Secret Token
	const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
	if (!secretToken || secretToken !== config.secretToken) {
		return new Response('Unauthorized', { status: 200 });
	}

	try {
		const update = await request.json();
		// 立即返回 200 响应
		const response = new Response('OK', { status: 200 });

		// 将验证通过的 Update 交给 updateHandler 处理，不阻塞响应
		ctx.waitUntil(updateHandler(update, env));

		return response;
	} catch (error) {
		console.error('Error processing webhook:', error);
		return new Response('Error processing webhook request', { status: 200 });
	}
}

export default webhookHandler;
