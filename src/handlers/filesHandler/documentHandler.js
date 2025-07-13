// src/handlers/filesHandler/documentHandler.js

import getConfig from '../../env';
import uploadFileToGemini from './geminiFileProcessor'; // Import the new processor

/**
 * 处理接收到的文档文件消息
 * @param {object} document - Telegram Document 对象
 * @param {object} env - Cloudflare Worker 的环境变量对象
 * @returns {Promise<object|null>} 成功上传到 Gemini 的文件对象，如果处理失败则返回 null
 */
async function handleDocument(document, env) {
	console.log('Handling document message');
	const config = getConfig(env);

	if (!document || !document.file_id) {
		console.log('Invalid document object or missing file_id.');
		return null;
	}

	// 允许处理的文档 MIME 类型列表
	const allowedMimeTypes = [
		'application/json',
		'application/yaml',
		'text/javascript',
		'text/plain',
		'text/markdown',
		'application/x-shellscript',
	];

	try {
		// 检查文档的 MIME 类型是否在允许列表中
		if (!document.mime_type || (!allowedMimeTypes.includes(document.mime_type) && !document.mime_type.startsWith('text/'))) {
			console.error(`Unsupported document MIME type: ${document.mime_type}`);
			let errorMessage = `不支持的文件类型 ${document.mime_type}，目前只支持处理以下文件类型:\n`;
			allowedMimeTypes.forEach((mimeType) => {
				errorMessage += `  - ${mimeType}\n`;
			});
			errorMessage += `  - text/*`;
			throw new Error(errorMessage);
		}

		const uploadedFile = await uploadFileToGemini(
			document.file_id,
			document.file_name || `document_${document.file_unique_id}`,
			'text/plain',
			env
		);

		return uploadedFile;
	} catch (error) {
		console.error('Error handling document');
		throw error;
	}
}

export default handleDocument;
