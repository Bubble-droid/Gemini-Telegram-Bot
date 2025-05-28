// src/utils/taskScheduler.js

import getConfig from '../env';
import TelegramBot from '../api/TelegramBot';

/**
 * 处理计划任务（由 alarm 触发）
 * @param {object} task - 任务对象，包含 action 和 params
 * @param {string} task.action - 任务类型
 * @param {object} task.params - 任务参数
 */
async function processScheduledTask({ action, params }, env) {
	console.log(`Processing scheduled task: ${action} with params:`, params);

	const bot = new TelegramBot(env);

	try {
		switch (action) {
			// TODO: 根据不同的 action 实现具体的任务处理逻辑
			case 'deleteMessage':
				await bot.deleteMessage(params);
				break;
			default:
				console.warn(`未知任务类型: ${action}`);
				break;
		}
	} catch (error) {
		console.error('Error processing scheduled task:', error);
		throw error;
	}
}

export default processScheduledTask;
