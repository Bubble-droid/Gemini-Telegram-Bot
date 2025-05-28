// src/kvManager/kvCounter.js

import getConfig from '../env';
import kvRead from './kvRead';
import kvWrite from './kvWrite';

/**
 * 使用 KV 存储实现一个计数器。
 * 每次调用时计数加一。
 * 如果计数大于 5，返回 true 并将计数重置为 0。
 * 否则，返回 false 并更新计数。
 *
 * @param {Object} env - Cloudflare Worker 环境变量
 * @param {Number} chatId - 聊天 ID
 * @returns {Promise<boolean>} - 如果计数大于 5 并已重置，返回 true；否则返回 false。
 */
async function incrementCounter(env, chatId) {
	const config = getConfig(env);
	const kvNamespace = config.botConfigKv;
	const key = `counter_${chatId}`;

	const COUNTER_THRESHOLD = 3;
	const RESET_VALUE = 0;

	try {
		// 从 KV 读取当前计数，如果不存在或非数字则默认为 RESET_VALUE
		const currentCountStr = await kvRead(kvNamespace, key);
		let currentCount = parseInt(currentCountStr, 10);

		if (isNaN(currentCount)) {
			currentCount = RESET_VALUE;
		}

		// 计数加一
		currentCount++;

		// 检查计数是否大于阈值
		if (currentCount >= COUNTER_THRESHOLD) {
			// 大于阈值，重置计数并返回 true
			await kvWrite(kvNamespace, key, RESET_VALUE.toString());
			return true;
		} else {
			// 小于等于阈值，更新计数并返回 false
			await kvWrite(kvNamespace, key, currentCount.toString());
			return false;
		}
	} catch (error) {
		console.error(`处理 KV 计数器时发生错误，键: ${key}`, error);
		return false;
	}
}

export default incrementCounter;
