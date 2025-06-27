// src/chatHistoryHandler/updateChatHistory.js

import getConfig from '../env';
import kvWrite from '../kvManager/kvWrite';
import getChatContents from './getChatContents';

/**
 * 更新指定键的对话历史，并限制历史记录的数量。
 * 使用 'history_${chatId}' 作为键。
 *
 * @param {Object} env - Cloudflare Worker 环境变量
 * @param {number} chatId - 聊天ID
 * @param {object} message - 要添加到对话历史的新消息对象。
 * @returns {Promise<void>}
 */
async function updateChatContents(env, chatId, userId, message) {
	const config = getConfig(env);
	const kvExpirationTtl = config.kvExpirationTtl || 7 * 24 * 60 * 60;
	const maxContentsLength = config.maxContentsLength || 10;
	const kvNamespace = config.chatContentsKv;
	const key = `contents_${chatId}_${userId}`;

	try {
		// 尝试从 KV 读取对话历史
		let contents = await getChatContents(env, chatId, userId);

		// console.log(`在 updateChatContents 中获取到的 Chat contents: ${JSON.stringify(contents, null, 2)}`);

		// 将新的消息对象添加到历史记录数组的末尾
		contents = Array.isArray(message) ? [...contents, ...message] : [...contents, message];

		// 如果历史记录长度超过最大限制，则从开头删除最旧的消息
		if (contents.length > maxContentsLength) {
			contents = contents.slice(contents.length - maxContentsLength);
		}
		await kvWrite(kvNamespace, key, JSON.stringify(contents), { expirationTtl: kvExpirationTtl });
		// console.log(`更新后的 Chat contents: ${JSON.stringify(contents, null, 2)}`);
		console.log(`${key}: 对话内容更新成功，当前长度 ${contents.length}`);
	} catch (error) {
		// 记录详细错误信息并重新抛出
		console.error(`Error updating chat contents for ${key}:`, error);
		throw new Error(`更新对话内容时发生错误 (Key: ${key}): ${error.message}`);
	}
}

export default updateChatContents;
