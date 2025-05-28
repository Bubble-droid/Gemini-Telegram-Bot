// src/fileHandlers/fileDownloader.js

/**
 * Downloads a file from a given URL and returns it as a Blob.
 * @param {string} url - The URL of the file to download.
 * @returns {Promise<Blob>} A Promise that resolves with the downloaded Blob.
 * @throws {Error} If the download fails (e.g., network error, non-2xx status).
 */
async function downloadFileAsArrayBuffer(url) {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to download file: ${response.statusText} (${response.status})`);
		}

		const arrayBuffer = await response.arrayBuffer();

		const fileSizeInBytes = arrayBuffer.byteLength;
		let displaySize;
		let displayUnit;

		if (fileSizeInBytes >= 1024 * 1024) {
			displaySize = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
			displayUnit = 'MB';
		} else {
			displaySize = (fileSizeInBytes / 1024).toFixed(2);
			displayUnit = 'KB';
		}

		console.log(`Successfully downloaded file. Size: ${displaySize} ${displayUnit}`);

		return arrayBuffer;
	} catch (error) {
		console.error(`Error downloading file from ${url}:`, error);
		throw error; // Re-throw the error after logging
	}
}

export default downloadFileAsArrayBuffer;
