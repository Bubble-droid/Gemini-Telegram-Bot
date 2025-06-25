// src/api/GeminiAPI/toolExecutors.js

import uploadFileToGemini from '../../handlers/filesHandler/geminiFileProcessor';

/**
 * 执行工具的映射对象
 * 键是工具名称 (functionDeclarations 中的 name)，值是对应的执行函数
 */
const toolExecutors = {
	/**
	 * 执行 getOnlineMediaFile 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { fileUrl: '...', fileName: '...', mimeType: '...' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 fileData 字段，用于直接作为 Gemini 的文件内容。
	 */
	getOnlineMediaFile: async (args) => {
		console.log('执行工具: getOnlineMediaFile, 参数:', args);
		const { fileUrl, fileName, mimeType } = args;

		if (!fileUrl || !fileName || !mimeType) {
			console.warn('getOnlineMediaFile 工具调用参数无效: 缺少 fileUrl, fileName 或 mimeType。');
			return { error: 'getOnlineMediaFile 工具调用参数无效，缺少必要参数。' };
		}

		try {
			// 调用 uploadFileToGemini 上传文件，并标记为工具执行
			const mediaFile = await uploadFileToGemini(null, null, null, toolExecutors.env, true, {
				fileUrl,
				fileName,
				mimeType,
			});
			if (mediaFile && mediaFile.uri && mediaFile.mimeType) {
				console.log(`在线媒体文件 ${fileName} 上传成功，URI: ${mediaFile.uri}`);
				// 返回符合 Gemini API 期望的 fileData 格式
				return {
					fileData: {
						fileUri: mediaFile.uri,
						mimeType: mediaFile.mimeType,
					},
				};
			} else {
				console.warn('上传在线媒体文件到 Gemini 失败。');
				return { error: '上传在线媒体文件到 Gemini 失败。' };
			}
		} catch (error) {
			console.warn(`执行 getOnlineMediaFile 失败: ${error.message}`);
			return { error: `执行 getOnlineMediaFile 失败 - ${error.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 getAssetsContent 工具
	 * @param {object} args  工具调用时传递的参数对象，例如 { assetsPath: ['path1', 'path2'] }
	 * @returns {Promise<{ assets: Array<{ path: string, content: string, identifier: string }> }>}  工具执行结果对象，包含 assets 字段，assets 是一个包含文件路径、内容和标识符的对象数组
	 */
	getAssetsContent: async (args) => {
		console.log('执行工具: getAssetsContent, 参数:', args);
		const assetsUrlPrefix = 'https://raw.githubusercontent.com';
		const githubToken = toolExecutors.githubToken;
		const assetsContent = []; // 修改为存储对象数组
		if (args && args.assetsPath && Array.isArray(args.assetsPath)) {
			for (const asset of args.assetsPath) {
				if (typeof asset === 'string') {
					const completeassetUrl = `${assetsUrlPrefix}/${asset}`;
					// 从路径中提取 repo/branch/file.ext 作为文档名称的简写
					const assetNameParts = asset.split('/');
					const repoName = assetNameParts[1]; // 例如 'Meta-assets'
					const branchName = assetNameParts[3]; // 例如 'main'
					const fileName = assetNameParts
						.slice(4)
						.join('_')
						.replace(/\.[^/.]+$/, ''); // 移除文件后缀
					const assetIdentifier = `${repoName}_${branchName}_${fileName}`;

					try {
						console.log(`尝试获取文件: ${completeassetUrl}`);
						const response = await fetch(completeassetUrl, {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${githubToken}`,
								'User-Agent': 'Gemini-Telegram-Bot',
							},
						});

						if (!response.ok) {
							console.warn(`获取文件失败，状态码: ${response.status}, URL: ${completeassetUrl}`);
							assetsContent.push({
								path: asset,
								content: `错误：无法获取文件内容 (状态码: ${response.status})`,
								identifier: assetIdentifier,
							});
							continue; // 继续处理下一个文档
						}

						const assetContent = await response.text();
						assetsContent.push({
							path: asset,
							content: assetContent,
							identifier: assetIdentifier,
						});
					} catch (fetchError) {
						console.error(`获取文件时发生网络错误: ${fetchError}, URL: ${completeassetUrl}`);
						assetsContent.push({
							path: asset,
							content: `错误：获取文件时发生网络错误 - ${fetchError.message || '未知错误'}`,
							identifier: assetIdentifier,
						});
					}
				}
			}
		} else {
			console.warn('getAssetsContent 工具调用参数无效:', args);
			// 当参数无效时，返回一个包含错误信息的对象
			return { assets: [{ path: '', content: '错误：getAssetsContent 工具调用参数无效，未提供文件路径。', identifier: 'invalid_args' }] };
		}
		console.log('getAssetsContent 工具执行完毕，结果数量:', assetsContent.length);
		return { assets: assetsContent }; // 返回包含结果的对象，使用 assets 字段
	},
	/**
	 * 执行 searchGitHubRepositoryFilesByKeyword 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'resolve', owner: 'SagerNet', repo: 'sing-box', path: 'assets/', branch: 'main' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是找到的文件路径列表
	 */
	searchGitHubRepositoryFilesByKeyword: async (args) => {
		console.log('执行工具: searchGitHubRepositoryFilesByKeyword, 参数:', args);
		const { keyword, owner, repo, path = '', branch = '' } = args; // 默认分支为 'main'
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!keyword || !owner || !repo) {
			console.warn('searchGitHubRepositoryFilesByKeyword 工具调用参数无效:', args);
			return { error: 'searchGitHubRepositoryFilesByKeyword 工具调用参数无效，缺少关键词、仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API 搜索。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API 搜索。' };
		}

		// 构建 GitHub API 搜索 URL，包含 branch 参数
		// q=Keywords+in:file+repo:Owner/Repo+path:PATH/TO&ref:Branch
		const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(keyword)}+in:file+repo:${encodeURIComponent(
			`${owner}/${repo}`
		)}${path ? `+path:${path}` : ''}${branch ? `&ref=${encodeURIComponent(branch)}` : ''}`;

		try {
			console.log(`尝试通过 GitHub API 搜索文件: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot', // GitHub API 要求 User-Agent
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 搜索文件失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { error: `GitHub API 搜索文件失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const foundFiles = [];

			if (data.items && Array.isArray(data.items)) {
				for (const item of data.items) {
					// 构建完整的文档路径，格式为 "owner/repo/refs/heads/branch/path/to/asset.md"
					const repoFullName = item.repository.full_name;
					// item.path 已经是相对于仓库根目录的路径
					foundFiles.push(`${repoFullName}/refs/heads/${branch}/${item.path}`);
				}
			}
			console.log(`searchGitHubRepositoryFilesByKeyword 工具执行完毕，找到 ${foundFiles.length} 个文件。`);
			return { foundFiles };
		} catch (fetchError) {
			console.error(`GitHub API 搜索文件时发生网络错误: ${fetchError}, URL: ${apiUrl}`);
			return { error: `GitHub API 搜索文件时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubDirectoryContents 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件和目录列表
	 */
	listGitHubDirectoryContents: async (args) => {
		console.log('执行工具: listGitHubDirectoryContents, 参数:', args);
		const { owner, repo, path = '', branch = '' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listGitHubDirectoryContents 工具调用参数无效:', args);
			return { error: 'listGitHubDirectoryContents 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		// 确保 path 不以斜杠开头，如果 path 为空则不需要处理
		const cleanedPath = path.startsWith('/') ? path.substring(1) : path;
		const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanedPath}${
			branch ? `?ref=${encodeURIComponent(branch)}` : ''
		}`;

		try {
			console.log(`尝试通过 GitHub API 列出目录内容: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot', // GitHub API 要求 User-Agent
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 列出目录内容失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { error: `GitHub API 列出目录内容失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const fileList = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					// 构建完整的 GitHub 文件路径，格式为 "owner/repo/refs/heads/branch/path/to/file.ext"
					// item.path 已经是相对于仓库根目录的路径
					const fullPath = `${owner}/${repo}/refs/heads/${branch}/${item.path}`;
					fileList.push({
						name: item.name,
						path: fullPath,
						type: item.type, // 'file' or 'dir'
					});
				}
			}
			console.log(`listGitHubDirectoryContents 工具执行完毕，找到 ${fileList.length} 个文件/目录。`);
			return { fileList };
		} catch (fetchError) {
			console.error(`GitHub API 列出目录内容时发生网络错误: ${fetchError}, URL: ${apiUrl}`);
			return { error: `GitHub API 列出目录内容时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubRepositoryTree 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listGitHubRepositoryTree: async (args) => {
		console.log('执行工具: listGitHubRepositoryTree, 参数:', args);
		const { owner, repo, branch = '' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listGitHubRepositoryTree 工具调用参数无效:', args);
			return { error: 'listGitHubRepositoryTree 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		try {
			// 1. 获取分支的最新 commit SHA
			const branchApiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${
				branch ? `${encodeURIComponent(branch)}` : ''
			}`;
			console.log(`尝试获取分支信息: ${branchApiUrl}`);
			const branchResponse = await fetch(branchApiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!branchResponse.ok) {
				const errorText = await branchResponse.text();
				console.warn(`获取分支信息失败，状态码: ${branchResponse.status}, 错误: ${errorText}, URL: ${branchApiUrl}`);
				return { error: `获取分支信息失败 (状态码: ${branchResponse.status}) - ${errorText}` };
			}
			const branchData = await branchResponse.json();
			const treeSha = branchData.commit.sha;
			console.log(`获取到分支 ${branch} 的 tree SHA: ${treeSha}`);

			// 2. 使用 tree SHA 递归获取仓库文件树
			const treeApiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
				repo
			)}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`;
			console.log(`尝试递归获取仓库文件树: ${treeApiUrl}`);
			const treeResponse = await fetch(treeApiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!treeResponse.ok) {
				const errorText = await treeResponse.text();
				console.warn(`递归获取仓库文件树失败，状态码: ${treeResponse.status}, 错误: ${errorText}, URL: ${treeApiUrl}`);
				return { error: `递归获取仓库文件树失败 (状态码: ${treeResponse.status}) - ${errorText}` };
			}

			const treeData = await treeResponse.json();
			const fileList = [];

			if (treeData.tree && Array.isArray(treeData.tree)) {
				for (const item of treeData.tree) {
					// 构建完整的 GitHub 路径，保留原始类型
					const fullPath = `${owner}/${repo}/refs/heads/${branch}/${item.path}`;
					fileList.push({
						name: item.path.split('/').pop(), // 文件名或目录名
						path: fullPath,
						type: item.type === 'blob' ? 'file' : 'tree', // 'blob' 表示文件，'tree' 表示目录
					});
				}
			}
			console.log(`listGitHubRepositoryTree 工具执行完毕，找到 ${fileList.length} 个文件。`);
			return { fileList };
		} catch (fetchError) {
			console.error(`GitHub API 列出仓库文件树时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { error: `GitHub API 列出仓库文件树时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 listGitHubRepositoryDirectories 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是目录列表
	 */
	listGitHubRepositoryDirectories: async (args) => {
		console.log('执行工具: listGitHubRepositoryDirectories, 参数:', args);
		const { owner, repo, branch = '' } = args;

		// 调用 listGitHubRepositoryTree 获取完整的仓库树
		const treeResult = await toolExecutors.listGitHubRepositoryTree({ owner, repo, branch });

		if (treeResult.fileList && Array.isArray(treeResult.fileList)) {
			// 检查 treeResult.fileList
			// 筛选出所有类型为 'tree' 的项（即目录）
			const directories = treeResult.fileList.filter((item) => item.type === 'tree'); // 使用 treeResult.fileList
			console.log(`listGitHubRepositoryDirectories 工具执行完毕，找到 ${directories.length} 个目录。`);
			return { directories };
		} else {
			console.warn('listGitHubRepositoryDirectories 无法获取有效的仓库树数据。');
			return { error: '无法获取仓库目录列表。' };
		}
	},

	/**
	 * 执行 listGitHubRepositoryFilesInPath 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listGitHubRepositoryFilesInPath: async (args) => {
		console.log('执行工具: listGitHubRepositoryFilesInPath, 参数:', args);
		const { owner, repo, path, branch = '' } = args;

		if (!path) {
			console.warn('listGitHubRepositoryFilesInPath 工具调用参数无效: 缺少 path。');
			return { error: 'listGitHubRepositoryFilesInPath 工具调用参数无效，缺少路径参数。' };
		}

		// 确保 path 以斜杠结尾，以便正确匹配目录下的文件
		const cleanedPath = path.endsWith('/') ? path : `${path}/`;

		// 调用 listGitHubRepositoryTree 获取完整的仓库树
		const treeResult = await toolExecutors.listGitHubRepositoryTree({ owner, repo, branch });

		if (treeResult.fileList && Array.isArray(treeResult.fileList)) {
			// 检查 treeResult.fileList
			// 筛选出类型为 'file'（文件）且其在仓库中的相对路径以指定 path 开头的项
			const filesInPath = treeResult.fileList.filter((item) => {
				// 使用 treeResult.fileList
				if (item.type !== 'file') {
					return false;
				}
				// 从完整的 item.path 中提取相对于仓库根目录的路径
				// item.path 格式为 "owner/repo/refs/heads/branch/relative/path/to/file.ext"
				const parts = item.path.split('/');
				// 确保路径至少有 5 部分（owner, repo, refs, heads, branch）
				if (parts.length < 5) {
					return false;
				}
				const relativePathInRepo = parts.slice(5).join('/');
				return relativePathInRepo.startsWith(cleanedPath);
			});
			console.log(`listGitHubRepositoryFilesInPath 工具执行完毕，找到 ${filesInPath.length} 个文件。`);
			return { filesInPath };
		} else {
			console.warn('listGitHubRepositoryFilesInPath 无法获取有效的仓库树数据。');
			return { error: '无法获取指定路径下的文件列表。' };
		}
	},

	/**
	 * 执行 listGitHubRepositoryCommits 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next', path: 'docs/', per_page: 50, page: 1 }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是提交记录列表
	 */
	listGitHubRepositoryCommits: async (args) => {
		console.log('执行工具: listGitHubRepositoryCommits, 参数:', args);
		const { owner, repo, branch = '', path = '', per_page = 10, page = 1 } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn('listGitHubRepositoryCommits 工具调用参数无效: 缺少仓库所有者或仓库名称。');
			return { error: 'listGitHubRepositoryCommits 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		// 构建 GitHub API 提交记录 URL
		let apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${
			branch ? `sha=${encodeURIComponent(branch)}&` : ''
		}${path ? `path=${path}&` : ''}per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 获取提交记录: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 获取提交记录失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { error: `GitHub API 获取提交记录失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			const commits = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					commits.push({
						sha: item.sha,
						message: item.commit.message,
						author: item.commit.author.name,
						date: item.commit.author.date,
						url: item.html_url,
					});
				}
			}
			console.log(`listGitHubRepositoryCommits 工具执行完毕，找到 ${commits.length} 条提交记录。`);
			return { commits };
		} catch (fetchError) {
			console.error(`GitHub API 获取提交记录时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { error: `GitHub API 获取提交记录时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 getGitHubRepositoryReleases 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是最新稳定发布版本和最新预发布版本信息
	 */
	getGitHubRepositoryReleases: async (args) => {
		console.log('执行工具: getGitHubRepositoryReleases, 参数:', args);
		const { owner, repo } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn('getGitHubRepositoryReleases 工具调用参数无效: 缺少仓库所有者或仓库名称。');
			return { error: 'getGitHubRepositoryReleases 工具调用参数无效，缺少仓库所有者或仓库名称。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;

		try {
			console.log(`尝试通过 GitHub API 获取所有发布版本: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 获取发布版本失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { error: `GitHub API 获取发布版本失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();
			let latestRelease = null;
			let latestPreRelease = null;

			for (const release of data) {
				if (!release.draft) {
					if (!release.prerelease) {
						// 找到第一个非预发布版本，即为最新稳定版
						if (!latestRelease) {
							latestRelease = {
								tag_name: release.tag_name,
								name: release.name,
								published_at: release.published_at,
								html_url: release.html_url,
							};
						}
					} else {
						// 找到第一个预发布版本，即为最新预发布版
						if (!latestPreRelease) {
							latestPreRelease = {
								tag_name: release.tag_name,
								name: release.name,
								published_at: release.published_at,
								html_url: release.html_url,
							};
						}
					}
				}
				// 如果都找到了，则可以提前退出循环
				if (latestRelease && latestPreRelease) {
					break;
				}
			}

			console.log(`getGitHubRepositoryReleases 工具执行完毕。`);
			return {
				latestRelease: latestRelease,
				latestPreRelease: latestPreRelease,
			};
		} catch (fetchError) {
			console.error(`GitHub API 获取发布版本时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { error: `GitHub API 获取发布版本时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},

	/**
	 * 执行 getGitHubCommitDetails 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', commit_sha: '2464ced48c504eb0dee616c6d474813621779afc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含提交的关键详细信息
	 */
	getGitHubCommitDetails: async (args) => {
		console.log('执行工具: getGitHubCommitDetails, 参数:', args);
		const { owner, repo, commit_sha } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo || !commit_sha) {
			console.warn('getGitHubCommitDetails 工具调用参数无效: 缺少仓库所有者、仓库名称或提交 SHA。');
			return { error: 'getGitHubCommitDetails 工具调用参数无效，缺少仓库所有者、仓库名称或提交 SHA。' };
		}

		if (!githubToken) {
			console.error('GITHUB_TOKEN 未配置，无法执行 GitHub API。');
			return { error: 'GITHUB_TOKEN 未配置，无法执行 GitHub API。' };
		}

		const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(
			commit_sha
		)}`;

		try {
			console.log(`尝试通过 GitHub API 获取提交详情: ${apiUrl}`);
			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`GitHub API 获取提交详情失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`);
				return { error: `GitHub API 获取提交详情失败 (状态码: ${response.status}) - ${errorText}` };
			}

			const data = await response.json();

			// 提取必要内容
			const commitDetails = {
				sha: data.sha,
				author: {
					name: data.commit.author.name,
					email: data.commit.author.email,
					date: data.commit.author.date,
				},
				message: data.commit.message,
				html_url: data.html_url,
				stats: data.stats, // 包含 total, additions, deletions
				files: data.files.map((file) => ({
					filename: file.filename,
					status: file.status,
					additions: file.additions,
					deletions: file.deletions,
					changes: file.changes,
					patch: file.patch, // 包含 diff 信息
				})),
			};

			console.log(`getGitHubCommitDetails 工具执行完毕，获取到提交 ${commit_sha} 的关键详细信息。`);
			return { commitDetails };
		} catch (fetchError) {
			console.error(`GitHub API 获取提交详情时发生网络错误: ${fetchError}, URL: ${fetchError.url || '未知'}`);
			return { error: `GitHub API 获取提交详情时发生网络错误 - ${fetchError.message || '未知错误'}` };
		}
	},
};

export default toolExecutors;
