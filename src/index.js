// src/index.js

import { DurableObject } from 'cloudflare:workers';
import webhookHandler from './handlers/webhookHandler';
import processScheduledTask from './utils/taskProcess';

export default {
	/**
	 * 主要的 fetch 事件处理函数
	 * @param {Request} request - 传入的 Request 对象
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 * @param {object} ctx - Worker 的执行上下文
	 * @returns {Promise<Response>} 处理结果的 Response 对象
	 */
	async fetch(request, env, ctx) {
		const requestHeaders = Object.fromEntries(request.headers);
		console.log('Request headers:', JSON.stringify(requestHeaders, null, 2));
		const url = new URL(request.url);
		try {
			if (url.pathname === '/webhook') {
				return await webhookHandler(request, env, ctx);
			} else if (url.pathname === '/' || url.pathname === '') {
				return new Response('This is Working...', { status: 200 });
			} else if (url.pathname === '/robots.txt') {
				return new Response('User-agent: *\nDisallow: /', {
					headers: {
						'Content-Type': 'text/plain',
					},
					status: 200,
				});
			}
			try {
				await fetch('https://widxkmkowqet.us-east-1.clawcloudrun.com');
			} finally {
			}
		} catch (error) {
			console.error('Error:', error.message || error);
			return new Response('Internal Server Error', { status: 500 });
		}

		return new Response('Not Found', { status: 404 });
	},

	/**
	 * 处理定时任务事件
	 * @param {object} event - 定时任务事件对象
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 * @param {object} ctx - Worker 的执行上下文
	 */
	async scheduled(event, env, ctx) {
		console.log('Received scheduled event:', event.scheduledTime);
		// 将定时任务事件交给 scheduler 模块处理（如果需要）
		// await handleScheduledEvent(event, env, ctx);
	},
};

// TimerDO 类保持不变，用于处理 Durable Object 的定时任务
export class TimerDO extends DurableObject {
	constructor(ctx, env) {
		super(ctx, env);
		this.state = ctx.storage;
		this.env = env;
	}

	/**
	 * 接收调度请求：{ action, params, delayMs }
	 * - action: 字符串，表示要执行的任务类型
	 * - params: 任意对象，包含执行所需参数
	 * - delayMs: 延迟毫秒数，默认 60000（1 分钟）
	 */
	async fetch(request) {
		const { action, params, delayMs = 60 * 1_000 } = await request.json();
		// 持久化任务信息
		await this.state.put('task', { action, params });
		// 计算绝对触发时间并设置 Alarm
		const runAt = Date.now() + delayMs;
		await this.state.setAlarm(runAt);
		return new Response(JSON.stringify({ status: 'scheduled', runAt }), { status: 200 });
	}

	/** Alarm 触发后调用此方法，执行对应 action */
	async alarm() {
		const task = await this.state.get('task');
		if (!task) return;

		try {
			await processScheduledTask(task, this.env);
		} catch (error) {
			console.error('Error in alarm:', e);
		} finally {
			// 清理存储，下次可复用或删除实例
			await this.state.delete('task');
		}
	}
}
