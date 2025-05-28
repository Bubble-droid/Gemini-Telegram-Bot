// src/handlers/filesHandler/imageHandler.js

import getConfig from '../../env';
import uploadFileToGemini from './geminiFileProcessor'; // Import the new processor

/**
 * 处理接收到的图片文件消息
 * @param {object[]} photos - Telegram PhotoSize 对象数组
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<object|null>} 成功上传到 Gemini 的文件对象，如果处理失败则返回 null
 */
async function handleImage(photos, env) {
	console.log('Handling image message');
	const config = getConfig(env);

	if (!photos || photos.length === 0) {
		console.log('Invalid photos array or empty.');
		return null;
	}

	// Get the largest photo size
	const image = photos[photos.length - 1] || photos;

	if (!image || !image.file_id) {
		console.log('Invalid image object or missing file_id.');
		return null;
	}

	try {
		const uploadedFile = await uploadFileToGemini(image.file_id, image.file_name || `image_${image.file_unique_id}`, 'image/jpeg', env);

		return uploadedFile;
	} catch (error) {
		console.error('Error handling image:', error);
		throw error;
	}
}

export default handleImage;
