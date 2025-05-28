// src/chatContentsHandler/clearChatContents.js

import getConfig from '../env';
import kvDelete from '../kvManager/kvDelete';

/**
 * 清理指定键的对话内容。
 * 使用 'contents_${chatId}_${userId}' 作为键。
 *
 * @param {Object} env - Cloudflare Worker 环境变量
 * @param {number} chatId - 聊天ID
 * @param {number} userId - 用户ID
 * @returns {Promise<void>}
 */
async function clearChatContents(env, chatId, userId) {
	const config = getConfig(env);
	const kvNamespace = config.chatContentsKv;
	const key = `contents_${chatId}_${userId}`;

	try {
		await kvDelete(kvNamespace, key);
		console.log(`${key}: 对话内容清理成功`);
	} catch (error) {
		// 记录详细错误信息并重新抛出
		console.error(`Error clearing chat contents for ${key}:`, error);
		throw new Error(`清理对话内容时发生错误 (Key: ${key}): ${error.message}`);
	}
}

export default clearChatContents;
