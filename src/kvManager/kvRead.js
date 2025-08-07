// src/kvManager/kvRead.js

/**
 * 从 Cloudflare KV 读取数据
 * @param {KVNamespace} kvNamespace - KV Namespace 绑定
 * @param {string} key - 要读取的键
 * @param {object} options - 可选参数，如 { type: 'json' }
 * @returns {Promise<any>} 读取到的数据，如果键不存在则返回 null
 */
async function kvRead(kvNamespace, key, options = {}) {
	if (!kvNamespace) {
		console.error('KV Namespace binding is missing.');
		return null;
	}
	if (!key) {
		console.error('Key is required for KV read operation.');
		return null;
	}

	try {
		const data = await kvNamespace.get(key, options);
		// console.log(`Read from KV - Key: ${key}, Options:`, options);
		return data;
	} catch (error) {
		console.error(`Error reading from KV for ${key}:`, error);
		throw error;
	}
}

export default kvRead;
