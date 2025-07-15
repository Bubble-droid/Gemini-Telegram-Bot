// src/chatHistoryHandler/getChatHistory.js

import getConfig from '../env.js';
import kvRead from '../kvManager/kvRead.js';

/**
 * 从KV命名空间中异步读取聊天历史记录。
 * 使用 'history_${chatId}' 作为键。
 *
 * @param {Object} env - Cloudflare Worker 环境变量
 * @param {number} chatId - 聊天ID
 * @returns {Promise<Array<object>|null>} 返回解析后的聊天历史数组。如果读取失败或键不存在，则返回null。
 */
async function getChatContents(env, chatId, userId) {
	const config = getConfig(env);
	const kvNamespace = config.chatContentsKv;
	// 确保键格式与 updateChatHistory.js 一致
	const key = `contents_${chatId}_${userId}`;
	const keyCompress = `contents_${chatId}_${userId}_compress`;
	try {
		// kvRead 已经处理了键不存在的情况，返回 null
		let contents = JSON.parse(await kvRead(kvNamespace, key)) || [];
		let compressContents =
			JSON.parse(await kvRead(kvNamespace, keyCompress)) || [];
		if (compressContents.length > 0) {
			const formatCompressContents = compressContents.map((c) => ({
				role: 'user',
				parts: [{ text: JSON.stringify(c) }],
			}));
			contents = formatCompressContents.concat(contents);
		}

		// console.log(`Getting chat contents: ${JSON.stringify(contents)}`);
		// console.log(`Chat ID ${chatId}: 获取聊天历史成功。`);
		return contents;
	} catch (error) {
		console.error(`Error reading chat contents for ${key}:`, error);
		throw error;
	}
}

export default getChatContents;
