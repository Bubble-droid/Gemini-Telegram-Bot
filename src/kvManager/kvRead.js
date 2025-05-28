// src/kvManager/kvRead.js

/**
 * 从 Cloudflare KV 读取数据
 * @param {KVNamespace} kvNamespace - KV Namespace 绑定
 * @param {string} key - 要读取的键
 * @param {string} [type='text'] - 读取的数据类型 ('text', 'json', 'arrayBuffer', 'stream')
 * @returns {Promise<any>} 读取到的数据，如果键不存在则返回 null
 */
async function kvRead(kvNamespace, key) {
	if (!kvNamespace) {
		console.error('KV Namespace binding is missing.');
		return null;
	}
	if (!key) {
		console.error('Key is required for KV read operation.');
		return null;
	}

	try {
		const data = await kvNamespace.get(key);
		// console.log(`Read from KV - Key: ${key}, Options:`, options);
		return data;
	} catch (error) {
		console.error(`Error reading from KV for ${key}:`, error);
		throw error;
	}
}

export default kvRead;
