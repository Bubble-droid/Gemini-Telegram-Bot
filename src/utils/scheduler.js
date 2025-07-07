// src/utils/scheduler.js

/**
 * 调度任意任务
 * @param {env} env - Cloudflare Worker 的环境变量对象
 * @param {string} action - 任务类型，如 'deleteMessage'
 * @param {object} params - 任务参数对象
 * @param {number} delayMs - 延迟毫秒数
 */
async function scheduleTask(env, action, params, delayMs = 60 * 1_000) {
	// 以 action+目标唯一标识构造实例名，确保幂等和隔离
	const name = `${action}-${JSON.stringify(params)}`;
	const id = env.TIMER_DO.idFromName(name);
	const stub = env.TIMER_DO.get(id);
	// POST 调度请求
	const res = await stub.fetch(
		new Request('https://scheduler', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, params, delayMs }),
		})
	);
	console.log(
		`Registering scheduled task with name: ${name}, execute after after ${
			delayMs / 60
		} s`
	);
	return res.json();
}

/**
 * 专用：延迟删除 Telegram 消息
 */
async function scheduleDeletion(env, chat_id, message_id, delayMs = 60 * 1_000) {
	return scheduleTask(env, 'deleteMessage', { chat_id, message_id }, delayMs);
}

export { scheduleDeletion };
