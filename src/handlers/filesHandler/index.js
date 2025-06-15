// src/handlers/filesHandler/index.js

import getConfig from '../../env';
import handleVideo from './videoHandler';
import handleImage from './imageHandler';
import handleDocument from './documentHandler';

/**
 * 处理接收到的包含文件的 Telegram 消息 (如照片, 视频, 文档等)
 * @param {object} message - Telegram Message 对象 (包含文件信息)
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<object|null>} 处理后得到的数据，如果没有文件或处理失败则返回 null
 */
async function filesHandler(message, env) {
	try {
		if (message.photo || message.document?.mime_type === 'image/png') {
			// 处理照片，调用 imageHandler
			const imageFile = await handleImage(message.photo || message.document, env);

			// 检查 imageHandler 的返回结果
			if (imageFile && imageFile.uri && imageFile.mimeType) {
				console.log('imageHandler successfully processed image.');
				// 如果成功，返回指定格式的数据
				return {
					fileData: {
						fileUri: imageFile.uri,
						mimeType: imageFile.mimeType,
					},
				};
			} else {
				console.log('imageHandler failed to process image or returned invalid data.');
				// 处理失败情况
				return null;
			}
		} else if (message.video || message.document?.mime_type === 'video/mp4') {
			// 处理视频，调用 videoHandler
			const videoFile = await handleVideo(message.video || message.document, env);

			// 检查 videoHandler 的返回结果
			if (videoFile && videoFile.uri && videoFile.mimeType) {
				console.log('videoHandler successfully processed video.');
				// 如果成功，返回指定格式的数据
				return {
					fileData: {
						fileUri: videoFile.uri,
						mimeType: videoFile.mimeType,
					},
				};
			} else {
				console.log('videoHandler failed to process video or returned invalid data.');
				// 处理失败情况
				return null;
			}
		} else if (message.document) {
			// 处理文档，调用 documentHandler
			const documentFile = await handleDocument(message.document, env);

			// 检查 documentHandler 的返回结果
			if (documentFile && documentFile.uri && documentFile.mimeType) {
				console.log('documentHandler successfully processed document.');
				// 如果成功，返回指定格式的数据
				return {
					fileData: {
						fileUri: documentFile.uri,
						mimeType: documentFile.mimeType,
					},
				};
			} else {
				console.log('documentHandler failed to process document or returned invalid data.');
				// 处理失败情况
				return null;
			}
		}

		// 如果没有支持的文件类型被处理
		console.log('No supported file type found in message.');
		return null;
	} catch (error) {
		console.error('Error in filesHandler');
		throw error; // Re-throw the error
	}
}

export default filesHandler;
