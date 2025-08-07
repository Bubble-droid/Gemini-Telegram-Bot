// src/kvManager/kvWrite.js

/**
 * 向 Cloudflare KV 写入数据
 * @param {KVNamespace} kvNamespace - KV Namespace 绑定
 * @param {string} key - 要写入的键
 * @param {any} value - 要写入的值
 * @param {object} options - 可选参数，如 TTL
 * @returns {Promise<void>}
 */
async function kvWrite(kvNamespace, key, value, options = {}) {
	if (!kvNamespace) {
		console.error('KV Namespace binding is missing.');
		return;
	}
	if (!key) {
		console.error('Key is required for KV write operation.');
		return;
	}
	// Value can be null or undefined to delete the key, but we have a dedicated delete function for clarity.
	// If value is explicitly null or undefined, log a warning or throw an error if needed.

	try {
		await kvNamespace.put(key, value, options);
		// console.log(`Written to KV - Key: ${key}, Options:`, options);
	} catch (error) {
		console.error(`Error writing to KV for key ${key}:`, error);
		throw error; // Re-throw the error for upstream handling
	}
}

export default kvWrite;
