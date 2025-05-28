// src/kvManager/kvDelete.js

/**
 * 从 Cloudflare KV 删除数据
 * @param {KVNamespace} kvNamespace - KV Namespace 绑定
 * @param {string} key - 要删除的键
 * @returns {Promise<void>}
 */
async function kvDelete(kvNamespace, key) {
	if (!kvNamespace) {
		console.error('KV Namespace binding is missing.');
		return;
	}
	if (!key) {
		console.error('Key is required for KV delete operation.');
		return;
	}

	try {
		await kvNamespace.delete(key);
		console.log(`Deleted from KV - Key: ${key}`);
	} catch (error) {
		console.error(`Error deleting from KV for key ${key}:`, error);
		throw error; // Re-throw the error for upstream handling
	}
}

export default kvDelete;
