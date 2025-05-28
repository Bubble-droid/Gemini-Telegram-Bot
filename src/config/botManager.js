// src/config/botManager.js

import { getConfig } from '../env';

/**
 * Bot 管理和访问控制模块
 * 负责加载配置（如管理员ID、允许的群组ID）并提供权限检查方法。
 */
class BotManager {
	/**
	 * @param {object} env - Cloudflare Worker 的环境变量对象
	 */
	constructor(env) {
		const config = getConfig(this.env);
		this.adminId = config.adminId;
		this.env = env;
		this.allowedGroupIds = this._loadAllowedGroupIds();
		// this.blockedUserIds = this._loadBlockedUserIds(); // 潜在的黑名单功能
	}

	/**
	 * 从配置中加载允许的群组 ID 列表（白名单）。
	 * 期望配置中有一个 allowedGroupIds 字段，其值为逗号分隔的字符串。
	 * @returns {Array<number>} 允许的群组 ID 列表
	 * @private
	 */
	_loadAllowedGroupIds() {
		const config = getConfig(this.env);
		const groupIdsString = config.allowedGroupIds;
		// 将逗号分隔的字符串转换为数字数组，并过滤掉无效的数字
		return groupIdsString
			? groupIdsString
					.split(',')
					.map((id) => Number(id.trim()))
					.filter((id) => !isNaN(id))
			: [];
	}

	/**
	 * 从配置中加载黑名单用户 ID 列表。
	 * 期望配置中有一个 blockedUserIds 字段，其值为逗号分隔的字符串。
	 * (当前代码中被注释掉，表示这是一个潜在的功能)
	 * @returns {Array<number>} 黑名单用户 ID 列表
	 * @private
	 */
	// _loadBlockedUserIds() {
	// 	const config = getConfig(this.env);
	// 	const blockedIdsString = config.blockedUserIds; // 假设 getConfig 也能获取此字段
	// 	return blockedIdsString
	// 		? blockedIdsString
	// 				.split(',')
	// 				.map((id) => Number(id.trim()))
	// 				.filter((id) => !isNaN(id))
	// 		: [];
	// }

	/**
	 * 检查用户是否为管理员。
	 * @param {number} userId - 用户 ID
	 * @returns {boolean} 是否为管理员
	 */
	isAdmin(userId) {
		return this.adminId === userId;
	}

	/**
	 * 检查群组是否在允许的列表中（白名单）。
	 * 如果允许的群组列表为空，则允许所有群组。
	 * @param {number} groupId - 群组 ID
	 * @returns {boolean} 是否在白名单中
	 */
	isGroupAllowed(groupId) {
		// 如果白名单为空，则允许所有群组
		if (this.allowedGroupIds.length === 0) {
			return true;
		}
		return this.allowedGroupIds.includes(groupId);
	}

	/**
	 * 检查用户是否在黑名单中。
	 * (当前代码中被注释掉，表示这是一个潜在的功能)
	 * @param {number} userId - 用户 ID
	 * @returns {boolean} 是否在黑名单中
	 */
	// isUserBlocked(userId) {
	// 	// return this.blockedUserIds.includes(userId);
	// 	return false; // 默认不阻止任何用户，除非实现黑名单功能
	// }

	// 可以添加其他管理相关的方法，如动态更新白名单/黑名单等，但这可能需要 KV 或 Durable Objects 来持久化状态。
}

export default BotManager;
