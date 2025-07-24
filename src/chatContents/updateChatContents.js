// src/chatHistoryHandler/updateChatHistory.js

import getConfig from '../env';
import kvRead from '../kvManager/kvRead';
import kvWrite from '../kvManager/kvWrite';
import getChatContents from './getChatContents';

/**
 * 更新指定键的对话历史，并限制历史记录的数量。
 * 使用 'history_${chatId}' 作为键。
 *
 * @param {Object} env - Cloudflare Worker 环境变量
 * @param {number} chatId - 聊天ID
 * @param {Array} askContents - 要添加到对话历史的新消息对象。
 * @returns {Promise<void>}
 */
async function updateChatContents(env, chatId, userId, askContents) {
	const config = getConfig(env);
	const kvNamespace = config.chatContentsKv;
	const key = `contents_${chatId}_${userId}`;
	const keyCompress = `contents_${chatId}_${userId}_compress`;

	try {
		// 尝试从 KV 读取对话历史
		let contents = JSON.parse(await kvRead(kvNamespace, key)) || [];
		let compressContents =
			JSON.parse(await kvRead(kvNamespace, keyCompress)) || [];
		contents.push(...askContents);
		// 如果历史记录长度超过最大限制，则从开头删除最旧的消息
		if (contents.length > config.maxContentsLength) {
			const compressed = contents.map((c) => {
				const texts = c.parts
					.map((cc) => {
						if (cc.fileData) {
							return '[文件]';
						} else if (cc.thought) {
							return '[想法]';
						} else if (cc.thoughtSignature) {
							return '';
						} else if (cc.text) {
							return cc.text;
						}
					})
					.join(' ');
				if (c.role === 'user') {
					return `用户：${texts}`;
				} else {
					return `助手：${texts}`;
				}
			});
			contents = [];
			compressContents.push(compressed);
			if (compressContents.length > config.maxCompressLength) {
				compressContents = compressContents.slice(-config.maxCompressLength);
			}
			await kvWrite(
				kvNamespace,
				keyCompress,
				JSON.stringify(compressContents),
				{
					expirationTtl: config.kvExpirationTtl,
				}
			);
		}
		await kvWrite(kvNamespace, key, JSON.stringify(contents), {
			expirationTtl: config.kvExpirationTtl,
		});
		// console.log(`更新后的 Chat contents: ${JSON.stringify(contents, null, 2)}`);
		console.log(
			`${key}: 对话内容更新成功，当前长度 ${
				compressContents.length + contents.length
			}`
		);
	} catch (error) {
		// 记录详细错误信息并重新抛出
		console.error(`Error updating chat contents for ${key}:`, error);
		throw new Error(`更新对话内容时发生错误 (Key: ${key}): ${error.message}`);
	}
}

export default updateChatContents;
