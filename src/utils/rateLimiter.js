// src/utils/rateLimiter.js

import getConfig from '../env';
import kvRead from '../kvManager/kvRead';
import kvWrite from '../kvManager/kvWrite';

/**
 * 记录用户操作的时间戳到 KV 存储。
 * @param {KVNamespace} kvNamespace - Cloudflare Workers KV Namespace 绑定。
 * @param {string} key - 用于存储时间戳的 KV 键名（例如，用户 ID）。
 * @param {number} timestamp - 要记录的时间戳（毫秒）。
 * @returns {Promise<void>}
 */
async function recordTimestamp(kvNamespace, key, timestamp) {
	// KV 存储的值必须是字符串或 ArrayBuffer
	await kvWrite(kvNamespace, key, timestamp.toString());
}

/**
 * 从 KV 存储获取用户上次操作的时间戳。
 * @param {KVNamespace} kvNamespace - Cloudflare Workers KV Namespace 绑定。
 * @param {string} key - 用于存储时间戳的 KV 键名。
 * @returns {Promise<number|null>} - 返回时间戳（毫秒）或 null（如果不存在或无效）。
 */
async function getTimestamp(kvNamespace, key) {
	const timestampStr = await kvRead(kvNamespace, key);
	if (timestampStr) {
		const timestamp = parseInt(timestampStr, 10);
		// 检查解析结果是否是有效的数字
		if (!isNaN(timestamp)) {
			return timestamp;
		} else {
			// 如果 KV 中存储的值不是有效的数字，记录警告并视为不存在时间戳
			console.warn(`KV 中键 ${key} 存储了无效的时间戳: ${timestampStr}`);
			return null;
		}
	}
	return null;
}

/**
 * 检查自上次操作以来是否已间隔指定的分钟数，并返回是否可以继续操作以及（如果不能）冷却剩余秒数。
 * @param {object} env - Workers 环境对象，包含 KV 绑定。
 * @param {string} chatId - 用于标识用户的唯一 ID。
 * @param {number} [intervalMinutes=1.0] - 需要间隔的分钟数。
 * @returns {Promise<{canProceed: boolean, retryAfterSeconds?: number}>} - 返回一个对象，包含 canProceed 状态和（如果 canProceed 为 false）冷却剩余秒数。
 */
async function rateLimiterCheck(env, chatId) {
	const config = getConfig(env);
	const kvNamespace = config.apiRateLimit;
	const intervalMinutes = config.apiRequestInterval || 0.5;

	if (!kvNamespace) {
		// 如果 KV 绑定未找到，记录错误并拒绝请求，提供默认重试时间
		console.error(`KV 绑定 "${config.apiRateLimit}" 未找到。无法执行限流检查。`);
		throw new Error('KV 绑定未找到。无法执行限流检查。');
	}

	const key = `rate_limit_${chatId}`; // 使用更具描述性的键前缀
	const now = Date.now();
	const intervalMilliseconds = intervalMinutes * 60 * 1000;

	try {
		const lastTimestamp = await getTimestamp(kvNamespace, key);

		if (lastTimestamp === null || now - lastTimestamp >= intervalMilliseconds) {
			// 如果是首次操作或已间隔足够时间，则记录当前时间戳并允许操作
			await recordTimestamp(kvNamespace, key, now);
			return { canProceed: true };
		} else {
			// 计算冷却剩余秒数
			const elapsedMilliseconds = now - lastTimestamp;
			const remainingMilliseconds = intervalMilliseconds - elapsedMilliseconds;
			// 确保剩余时间不为负数，避免潜在的时间漂移问题
			const safeRemainingMilliseconds = Math.max(0, remainingMilliseconds);
			// 将剩余毫秒数转换为秒数并向上取整
			const retryAfterSeconds = Math.ceil(safeRemainingMilliseconds / 1000);

			return { canProceed: false, retryAfterSeconds: retryAfterSeconds };
		}
	} catch (error) {
		// 捕获 KV 操作中可能出现的错误
		console.error(`限流器错误 (键: ${key}):`, error);
		// 如果发生错误，拒绝请求并提供默认重试时间，以防止在 KV 服务中断时被滥用
		throw error;
	}
}

export default rateLimiterCheck;
