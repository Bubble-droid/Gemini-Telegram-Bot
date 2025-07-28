// src/api/GeminiAPI/toolExecutors.js

import uploadFileToGemini from '../../handlers/filesHandler/geminiFileProcessor';
import { getCurrentTime } from '../../utils/helpers';

/**
 * 执行工具的映射对象
 * 键是工具名称 (functionDeclarations 中的 name)，值是对应的执行函数
 */
const toolExecutors = {
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
					const branchName = assetNameParts[4]; // 例如 'main'
					const fileName = assetNameParts
						.slice(5)
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
							console.warn(
								`获取文件失败，状态码: ${response.status}, URL: ${completeassetUrl}`
							);
							assetsContent.push({
								path: asset,
								error: `无法获取文件内容 (状态码: ${response.status})`,
								identifier: assetIdentifier,
							});
							continue; // 继续处理下一个文档
						}

						const assetContent = await response.text();
						const MAX_CHUNK_LENGTH = 1024; // 定义每个文本块的最大长度
						const chunkedContent = [];

						for (let i = 0; i < assetContent.length; i += MAX_CHUNK_LENGTH) {
							chunkedContent.push({
								text: assetContent.slice(i, i + MAX_CHUNK_LENGTH),
							});
						}

						assetsContent.push({
							path: asset,
							content: chunkedContent, // 存储分割后的内容数组
							identifier: assetIdentifier,
						});
					} catch (fetchError) {
						console.error(
							`获取文件时发生网络错误: ${fetchError}, URL: ${completeassetUrl}`
						);
						assetsContent.push({
							path: asset,
							error: `获取文件时发生网络错误 - ${
								fetchError.message || '未知错误'
							}`,
							identifier: assetIdentifier,
						});
					}
				}
			}
		} else {
			console.warn('getAssetsContent 工具调用参数无效:', args);
			// 当参数无效时，返回一个包含错误信息的对象
			return {
				assets: [
					{
						path: '',
						error: '错误：getAssetsContent 工具调用参数无效，未提供文件路径。',
						identifier: 'invalid_args',
					},
				],
			};
		}
		console.log(
			'getAssetsContent 工具执行完毕，结果数量:',
			assetsContent.length
		);
		return { assets: assetsContent }; // 返回包含结果的对象，使用 assets 字段
	},

	/**
	 * 执行 searchFilesByKeyword 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'resolve', owner: 'SagerNet', repo: 'sing-box', path: 'assets/', branch: 'main' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是找到的文件路径列表
	 */
	searchFilesByKeyword: async (args) => {
		console.log('执行工具: searchFilesByKeyword, 参数:', args);
		const { keyword, owner, repo, path = '', branch = 'main' } = args; // 默认分支为 'main'
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!keyword || !owner || !repo) {
			console.warn('searchFilesByKeyword 工具调用参数无效:', args);
			return {
				error:
					'searchFilesByKeyword 工具调用参数无效，缺少关键词、仓库所有者或仓库名称。',
			};
		}

		// 构建 GitHub API 搜索 URL，包含 branch 参数
		// q=Keywords+in:file+repo:Owner/Repo+path:PATH/TO&ref:Branch
		const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(
			keyword
		)}+in:file+repo:${`${owner}/${repo}`}${path ? `+path:${path}` : ''}${
			branch ? `&ref=${branch}` : ''
		}`;

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
				console.warn(
					`GitHub API 搜索文件失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 搜索文件失败 (状态码: ${response.status}) - ${errorText}`,
				};
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
			console.log(
				`searchFilesByKeyword 工具执行完毕，找到 ${foundFiles.length} 个文件。`
			);
			return { foundFiles };
		} catch (fetchError) {
			console.error(
				`GitHub API 搜索文件时发生网络错误: ${fetchError}, URL: ${apiUrl}`
			);
			return {
				error: `GitHub API 搜索文件时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 listDirContents 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件和目录列表
	 */
	listDirContents: async (args) => {
		console.log('执行工具: listDirContents, 参数:', args);
		const { owner, repo, path = '', branch = 'main' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listDirContents 工具调用参数无效:', args);
			return {
				error: 'listDirContents 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		// 确保 path 不以斜杠开头，如果 path 为空则不需要处理
		const cleanedPath = path.startsWith('/') ? path.substring(1) : path;
		const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanedPath}${
			branch ? `?ref=${branch}` : ''
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
				console.warn(
					`GitHub API 列出目录内容失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 列出目录内容失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const fileList = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					// item.path 已经是相对于仓库根目录的路径
					const fullPath = `${owner}/${repo}/refs/heads/${branch}/${item.path}`;
					fileList.push({
						name: item.name,
						path: fullPath,
						type: item.type, // 'file' or 'dir'
					});
				}
			}
			console.log(
				`listDirContents 工具执行完毕，找到 ${fileList.length} 个文件/目录。`
			);
			return { fileList };
		} catch (fetchError) {
			console.error(
				`GitHub API 列出目录内容时发生网络错误: ${fetchError}, URL: ${apiUrl}`
			);
			return {
				error: `GitHub API 列出目录内容时发生网络错误 - ${
					fetchError.message || fetchError
				}`,
			};
		}
	},

	/**
	 * 执行 listRepoTree 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listRepoTree: async (args) => {
		console.log('执行工具: listRepoTree, 参数:', args);
		const { owner, repo, branch = 'main' } = args;
		const githubToken = toolExecutors.githubToken; // 从 toolExecutors 获取 githubToken

		if (!owner || !repo) {
			console.warn('listRepoTree 工具调用参数无效:', args);
			return {
				error: 'listRepoTree 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		try {
			// 1. 获取分支的最新 commit SHA
			const branchApiUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${
				branch ? `${branch}` : ''
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
				console.warn(
					`获取分支信息失败，状态码: ${branchResponse.status}, 错误: ${errorText}, URL: ${branchApiUrl}`
				);
				return {
					error: `获取分支信息失败 (状态码: ${branchResponse.status}) - ${errorText}`,
				};
			}
			const branchData = await branchResponse.json();
			const treeSha = branchData.commit.sha;
			console.log(`获取到分支 ${branch} 的 tree SHA: ${treeSha}`);

			// 2. 使用 tree SHA 递归获取仓库文件树
			const treeApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
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
				console.warn(
					`递归获取仓库文件树失败，状态码: ${treeResponse.status}, 错误: ${errorText}, URL: ${treeApiUrl}`
				);
				return {
					error: `递归获取仓库文件树失败 (状态码: ${treeResponse.status}) - ${errorText}`,
				};
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
			console.log(
				`listRepoTree 工具执行完毕，找到 ${fileList.length} 个文件。`
			);
			return { fileList };
		} catch (fetchError) {
			console.error(
				`GitHub API 列出仓库文件树时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 列出仓库文件树时发生网络错误 - ${
					fetchError.message || fetchError
				}`,
			};
		}
	},

	/**
	 * 执行 listRepoDirs 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是目录列表
	 */
	listRepoDirs: async (args) => {
		console.log('执行工具: listRepoDirs, 参数:', args);
		const { owner, repo, branch = 'main' } = args;

		// 调用 listRepoTree 获取完整的仓库树
		const treeResult = await toolExecutors.listRepoTree({
			owner,
			repo,
			branch,
		});

		if (treeResult.fileList && Array.isArray(treeResult.fileList)) {
			// 检查 treeResult.fileList
			// 筛选出所有类型为 'tree' 的项（即目录）
			const directories = treeResult.fileList.filter(
				(item) => item.type === 'tree'
			); // 使用 treeResult.fileList
			console.log(
				`listRepoDirs 工具执行完毕，找到 ${directories.length} 个目录。`
			);
			return { directories };
		} else {
			console.warn('listRepoDirs 无法获取有效的仓库树数据。');
			return { error: '无法获取仓库目录列表。' };
		}
	},

	/**
	 * 执行 listRepoFilesInPath 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', path: 'docs/', branch: 'dev-next' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是文件列表
	 */
	listRepoFilesInPath: async (args) => {
		console.log('执行工具: listRepoFilesInPath, 参数:', args);
		const { owner, repo, path, branch = 'main' } = args;

		if (!path) {
			console.warn('listRepoFilesInPath 工具调用参数无效: 缺少 path。');
			return { error: 'listRepoFilesInPath 工具调用参数无效，缺少路径参数。' };
		}

		// 确保 path 以斜杠结尾，以便正确匹配目录下的文件
		const cleanedPath = path.endsWith('/') ? path : `${path}/`;

		// 调用 listRepoTree 获取完整的仓库树
		const treeResult = await toolExecutors.listRepoTree({
			owner,
			repo,
			branch,
		});

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
			console.log(
				`listRepoFilesInPath 工具执行完毕，找到 ${filesInPath.length} 个文件。`
			);
			return { filesInPath };
		} else {
			console.warn('listRepoFilesInPath 无法获取有效的仓库树数据。');
			return { error: '无法获取指定路径下的文件列表。' };
		}
	},

	/**
	 * 执行 listRepoCommits 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', branch: 'dev-next', path: 'docs/', per_page: 50, page: 1 }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 output 字段，output 是提交记录列表
	 */
	listRepoCommits: async (args) => {
		console.log('执行工具: listRepoCommits, 参数:', args);
		const {
			owner,
			repo,
			branch = 'main',
			path = '',
			per_page = 20,
			page = 1,
		} = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn(
				'listRepoCommits 工具调用参数无效: 缺少仓库所有者或仓库名称。'
			);
			return {
				error: 'listRepoCommits 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		// 构建 GitHub API 提交记录 URL
		let apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?${
			branch ? `sha=${branch}&` : ''
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
				console.warn(
					`GitHub API 获取提交记录失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取提交记录失败 (状态码: ${response.status}) - ${errorText}`,
				};
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
			console.log(
				`listRepoCommits 工具执行完毕，找到 ${commits.length} 条提交记录。`
			);
			return { commits };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取提交记录时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取提交记录时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 getRepoReleases 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', per_page: 10, page: 1 }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 releases 字段，releases 是发布版本列表
	 */
	getRepoReleases: async (args) => {
		console.log('执行工具: getRepoReleases, 参数:', args);
		const { owner, repo, per_page = 10, page = 1 } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn(
				'getRepoReleases 工具调用参数无效: 缺少仓库所有者或仓库名称。'
			);
			return {
				error: 'getRepoReleases 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		// 构建 GitHub API 发布版本 URL，包含 per_page 和 page 参数
		const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 获取发布版本: ${apiUrl}`);
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
				console.warn(
					`GitHub API 获取发布版本失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取发布版本失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const releases = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					releases.push({
						id: item.id,
						tag_name: item.tag_name,
						name: item.name,
						body: item.body,
						author_login: item.author.login,
						author_type: item.author.type,
						published_at: item.published_at,
						html_url: item.html_url,
						prerelease: item.prerelease,
						draft: item.draft,
					});
				}
			}

			console.log(
				`getRepoReleases 工具执行完毕，找到 ${releases.length} 个发布版本。`
			);
			return { releases };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取发布版本时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取发布版本时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 getReleaseDetails 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'GUI-for-Cores', repo: 'GUI.for.SingBox', release_id: 227541695 } 或 { owner: 'GUI-for-Cores', repo: 'GUI.for.SingBox', tag_name: 'rolling-release-alpha' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 releaseDetails 字段，releaseDetails 是发布版本的详细信息
	 */
	getReleaseDetails: async (args) => {
		console.log('执行工具: getReleaseDetails, 参数:', args);
		const { owner, repo, release_id, tag_name } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn(
				'getReleaseDetails 工具调用参数无效: 缺少仓库所有者或仓库名称。'
			);
			return {
				error: 'getReleaseDetails 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		if (!release_id && !tag_name) {
			console.warn(
				'getReleaseDetails 工具调用参数无效: 必须提供 release_id 或 tag_name。'
			);
			return {
				error:
					'getReleaseDetails 工具调用参数无效，必须提供 release_id 或 tag_name。',
			};
		}

		let apiUrl = '';
		let fetchError = null;
		let releaseData = null;

		// 优先尝试使用 release_id
		if (release_id) {
			apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/${release_id}`;
			console.log(`尝试通过 GitHub API 获取发布版本详情 (按 ID): ${apiUrl}`);
			try {
				const response = await fetch(apiUrl, {
					method: 'GET',
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: `Bearer ${githubToken}`,
						'User-Agent': 'Gemini-Telegram-Bot',
					},
				});

				if (response.ok) {
					releaseData = await response.json();
				} else {
					const errorText = await response.text();
					console.warn(
						`GitHub API 获取发布版本详情 (按 ID) 失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
					);
					fetchError = `GitHub API 获取发布版本详情 (按 ID) 失败 (状态码: ${response.status}) - ${errorText}`;
				}
			} catch (error) {
				console.error(
					`GitHub API 获取发布版本详情 (按 ID) 时发生网络错误: ${error}, URL: ${apiUrl}`
				);
				fetchError = `GitHub API 获取发布版本详情 (按 ID) 时发生网络错误 - ${
					error.message || '未知错误'
				}`;
			}
		}

		// 如果通过 release_id 未获取到数据或发生错误，并且提供了 tag_name，则尝试使用 tag_name
		if (!releaseData && tag_name) {
			apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag_name}`;
			console.log(`尝试通过 GitHub API 获取发布版本详情 (按 Tag): ${apiUrl}`);
			try {
				const response = await fetch(apiUrl, {
					method: 'GET',
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: `Bearer ${githubToken}`,
						'User-Agent': 'Gemini-Telegram-Bot',
					},
				});

				if (response.ok) {
					releaseData = await response.json();
					fetchError = null; // 成功获取，清除之前的错误
				} else {
					const errorText = await response.text();
					console.warn(
						`GitHub API 获取发布版本详情 (按 Tag) 失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
					);
					// 如果 ID 和 Tag 都失败，保留最后一个错误信息
					fetchError = `GitHub API 获取发布版本详情 (按 Tag) 失败 (状态码: ${response.status}) - ${errorText}`;
				}
			} catch (error) {
				console.error(
					`GitHub API 获取发布版本详情 (按 Tag) 时发生网络错误: ${error}, URL: ${apiUrl}`
				);
				// 如果 ID 和 Tag 都失败，保留最后一个错误信息
				fetchError = `GitHub API 获取发布版本详情 (按 Tag) 时发生网络错误 - ${
					error.message || '未知错误'
				}`;
			}
		}

		if (!releaseData) {
			return { error: fetchError || '未能获取到发布版本详细信息。' };
		}

		// 提取并格式化所需的发布版本详细信息
		const releaseDetails = {
			id: releaseData.id,
			tag_name: releaseData.tag_name,
			name: releaseData.name,
			body: releaseData.body,
			author_login: releaseData.author ? releaseData.author.login : '未知',
			published_at: releaseData.published_at,
			html_url: releaseData.html_url,
			prerelease: releaseData.prerelease,
			draft: releaseData.draft,
			assets: releaseData.assets.map((asset) => ({
				id: asset.id,
				name: asset.name,
				browser_download_url: asset.browser_download_url,
				size: asset.size,
				download_count: asset.download_count,
				created_at: asset.created_at,
				updated_at: asset.updated_at,
			})),
		};

		console.log(
			`getReleaseDetails 工具执行完毕，获取到发布版本 ${
				release_id || tag_name
			} 的详细信息。`
		);
		return { releaseDetails };
	},

	/**
	 * 执行 getCommitDetails 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', commit_sha: '2464ced48c504eb0dee616c6d474813621779afc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含提交的关键详细信息
	 */
	getCommitDetails: async (args) => {
		console.log('执行工具: getCommitDetails, 参数:', args);
		const { owner, repo, commit_sha } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo || !commit_sha) {
			console.warn(
				'getCommitDetails 工具调用参数无效: 缺少仓库所有者、仓库名称或提交 SHA。'
			);
			return {
				error:
					'getCommitDetails 工具调用参数无效，缺少仓库所有者、仓库名称或提交 SHA。',
			};
		}

		const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commit_sha}`;

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
				console.warn(
					`GitHub API 获取提交详情失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取提交详情失败 (状态码: ${response.status}) - ${errorText}`,
				};
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

			console.log(
				`getCommitDetails 工具执行完毕，获取到提交 ${commit_sha} 的关键详细信息。`
			);
			return { commitDetails };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取提交详情时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取提交详情时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 getOnlineFile 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { fileUrl: '...', fileName: '...', mimeType: '...' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 fileData 字段，用于直接作为 Gemini 的文件内容。
	 */
	getOnlineFile: async (args) => {
		console.log('执行工具: getOnlineFile, 参数:', args);
		const { fileUrl, fileName, mimeType } = args;

		if (!fileUrl || !fileName || !mimeType) {
			console.warn(
				'getOnlineFile 工具调用参数无效: 缺少 fileUrl, fileName 或 mimeType。'
			);
			return { error: 'getOnlineFile 工具调用参数无效，缺少必要参数。' };
		}

		try {
			// 调用 uploadFileToGemini 上传文件，并标记为工具执行
			const mediaFile = await uploadFileToGemini(
				null,
				null,
				null,
				toolExecutors.env,
				true,
				{
					fileUrl,
					fileName,
					mimeType,
				}
			);
			if (mediaFile && mediaFile.uri && mediaFile.mimeType) {
				console.log(`在线文件 ${fileName} 上传成功，URI: ${mediaFile.uri}`);
				// 返回符合 Gemini API 期望的 fileData 格式
				return {
					fileData: {
						fileUri: mediaFile.uri,
						mimeType: mediaFile.mimeType,
					},
				};
			} else {
				console.warn('上传在线文件到 Gemini 失败。');
				return { error: '上传在线文件到 Gemini 失败。' };
			}
		} catch (error) {
			console.warn(`执行 getOnlineFile 失败: ${error.message}`);
			return {
				error: `执行 getOnlineFile 失败 - ${error.message || '未知错误'}`,
			};
		}
	},

	/**
	 * 执行 getYoutubeVideoLink 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { videoUrl: 'https://www.youtube.com/watch?v=...' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 fileData 字段，用于直接作为 Gemini 的文件内容。
	 */
	getYoutubeVideoLink: async (args) => {
		console.log('执行工具: getYoutubeVideoLink, 参数:', args);
		const { videoUrl } = args;

		// 简单的 YouTube 链接验证，实际应用中可能需要更复杂的正则
		const youtubeRegex =
			/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|)([\w-]{11})(.*)?$/;

		if (!videoUrl || !youtubeRegex.test(videoUrl)) {
			console.warn(
				'getYoutubeVideoLink 工具调用参数无效: 缺少有效的 videoUrl。'
			);
			return {
				error:
					'getYoutubeVideoLink 工具调用参数无效，请提供有效的 YouTube 视频链接。',
			};
		}

		try {
			console.log(`YouTube 视频链接 ${videoUrl} 已验证。`);
			// 返回符合 Gemini API 期望的 fileData 格式
			return {
				fileData: {
					fileUri: videoUrl,
				},
			};
		} catch (error) {
			console.warn(`执行 getYoutubeVideoLink 失败: ${error.message}`);
			return {
				error: `执行 getYoutubeVideoLink 失败 - ${error.message || '未知错误'}`,
			};
		}
	},

	/**
	 * 执行 listUserOrOrgRepos 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { userOrOrg: 'SagerNet', type: 'all', sort: 'updated', direction: 'desc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 repos 字段，repos 是仓库列表
	 */
	listUserOrOrgRepos: async (args) => {
		console.log('执行工具: listUserOrOrgRepos, 参数:', args);
		const {
			userOrOrg,
			type = 'all',
			sort = 'updated',
			direction = 'desc',
		} = args;
		const githubToken = toolExecutors.githubToken;

		if (!userOrOrg) {
			console.warn('listUserOrOrgRepos 工具调用参数无效: 缺少 userOrOrg。');
			return {
				error: 'listUserOrOrgRepos 工具调用参数无效，缺少用户名或组织名称。',
			};
		}

		// 构建 GitHub API URL，根据 userOrOrg 是用户还是组织来确定前缀
		const apiUrl = `https://api.github.com/users/${userOrOrg}/repos?type=${type}&sort=${sort}&direction=${direction}`;

		try {
			console.log(`尝试通过 GitHub API 获取仓库列表: ${apiUrl}`);
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
				console.warn(
					`GitHub API 获取仓库列表失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取仓库列表失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const repos = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					repos.push({
						id: item.id,
						name: item.name,
						full_name: item.full_name,
						private: item.private,
						owner_login: item.owner.login,
						html_url: item.html_url,
						description: item.description,
						fork: item.fork,
						stargazers_count: item.stargazers_count,
						watchers_count: item.watchers_count,
						language: item.language,
						forks_count: item.forks_count,
						open_issues_count: item.open_issues_count,
						default_branch: item.default_branch,
					});
				}
			}
			console.log(
				`listUserOrOrgRepos 工具执行完毕，找到 ${repos.length} 个仓库。`
			);
			return { repos };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取仓库列表时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取仓库列表时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},
	/**
	 * 执行 listRepoBranches 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 branches 字段，branches 是分支列表
	 */
	listRepoBranches: async (args) => {
		console.log('执行工具: listRepoBranches, 参数:', args);
		const { owner, repo } = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo) {
			console.warn(
				'listRepoBranches 工具调用参数无效: 缺少仓库所有者或仓库名称。'
			);
			return {
				error: 'listRepoBranches 工具调用参数无效，缺少仓库所有者或仓库名称。',
			};
		}

		const apiUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;

		try {
			console.log(`尝试通过 GitHub API 获取分支列表: ${apiUrl}`);
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
				console.warn(
					`GitHub API 获取分支列表失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取分支列表失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const branches = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					branches.push({
						name: item.name,
						commit_sha: item.commit.sha,
						commit_url: item.commit.url,
						protected: item.protected,
					});
				}
			}
			console.log(
				`listRepoBranches 工具执行完毕，找到 ${branches.length} 个分支。`
			);
			return { branches };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取分支列表时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取分支列表时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 searchGithubRepos工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'free node', sort: 'updated', order: 'desc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 repositories 字段，repositories 是仓库列表
	 */
	searchGithubRepos: async (args) => {
		console.log('执行工具: searchGithubRepos, 参数:', args);
		const { keyword, sort = 'best match', order = 'desc' } = args;
		const githubToken = toolExecutors.githubToken;

		if (!keyword) {
			console.warn('searchGithubRepos 工具调用参数无效: 缺少 keyword。');
			return {
				error: 'searchGithubRepos 工具调用参数无效，缺少关键词。',
			};
		}

		// 构建 GitHub API 搜索仓库 URL
		const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
			keyword
		)}${
			sort !== 'best match' ? `&sort=${encodeURIComponent(sort)}` : ''
		}&order=${order}`;

		try {
			console.log(`尝试通过 GitHub API 搜索仓库: ${apiUrl}`);
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
				console.warn(
					`GitHub API 搜索仓库失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 搜索仓库失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const repositories = [];

			if (data.items && Array.isArray(data.items)) {
				for (const item of data.items) {
					repositories.push({
						id: item.id,
						name: item.name,
						full_name: item.full_name,
						private: item.private,
						owner_login: item.owner.login,
						html_url: item.html_url,
						description: item.description,
						fork: item.fork,
						stargazers_count: item.stargazers_count,
						watchers_count: item.watchers_count,
						language: item.language,
						forks_count: item.forks_count,
						open_issues_count: item.open_issues_count,
						default_branch: item.default_branch,
						updated_at: item.updated_at,
					});
				}
			}
			console.log(
				`searchGithubRepos 工具执行完毕，找到 ${repositories.length} 个仓库。`
			);
			return { repositories };
		} catch (fetchError) {
			console.error(
				`GitHub API 搜索仓库时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 搜索仓库时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 getCurrentTime 工具
	 * @returns {object} 工具执行结果对象，包含 currentTime 字段
	 */
	getCurrentTime: () => {
		console.log('执行工具: getCurrentTime');
		const currentTime = getCurrentTime(); // 调用 utils/helpers.js 中的 getCurrentTime 函数
		console.log('getCurrentTime 工具执行完毕，当前时间:', currentTime);
		return { currentTime };
	},

	/**
	 * 执行 searchGlobalIssuesByKeyword 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'tun error', state: 'all', sort: 'created', order: 'desc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 issues 字段（Issue 列表）和 total_count 字段（总数）
	 */
	searchGlobalIssuesByKeyword: async (args) => {
		console.log('执行工具: searchGlobalIssuesByKeyword, 参数:', args);
		const {
			keyword,
			state = 'all', // 默认状态为 all
			sort = 'created', // 默认按创建时间排序
			order = 'desc', // 默认降序
			per_page = 30, // 默认每页 30 个
			page = 1, // 默认页码 1
		} = args;
		const githubToken = toolExecutors.githubToken;

		if (!keyword) {
			console.warn(
				'searchGlobalIssuesByKeyword 工具调用参数无效: 缺少关键词。'
			);
			return {
				error: 'searchGlobalIssuesByKeyword 工具调用参数无效，缺少关键词。',
			};
		}

		// 构建 GitHub API 搜索 Issue 的 URL (全局搜索)
		// q=keyword+is:issue
		const query = `${encodeURIComponent(keyword)}+is:issue`;

		const apiUrl = `https://api.github.com/search/issues?q=${query}&state=${state}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 全局搜索 Issue: ${apiUrl}`);
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
				console.warn(
					`GitHub API 全局搜索 Issue 失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 全局搜索 Issue 失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const issues = [];

			if (data.items && Array.isArray(data.items)) {
				for (const item of data.items) {
					issues.push({
						id: item.id,
						number: item.number,
						html_url: item.html_url,
						title: item.title,
						state: item.state,
						created_at: item.created_at,
						updated_at: item.updated_at,
						comments: item.comments,
						author_login: item.user ? item.user.login : '未知', // 确保 user 存在
						labels: item.labels ? item.labels.map((label) => label.name) : [], // 提取标签名称
						body: item.body,
						repository_url: item.repository_url,
					});
				}
			}
			console.log(
				`searchGlobalIssuesByKeyword 工具执行完毕，找到 ${issues.length} 个 Issue，总数 ${data.total_count}。`
			);
			return { issues, total_count: data.total_count };
		} catch (fetchError) {
			console.error(
				`GitHub API 全局搜索 Issue 时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 全局搜索 Issue 时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 searchIssuesInRepo 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { keyword: 'tun error', owner: 'SagerNet', repo: 'sing-box', state: 'all', sort: 'created', order: 'desc' }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 issues 字段（Issue 列表）和 total_count 字段（总数）
	 */
	searchIssuesInRepo: async (args) => {
		console.log('执行工具: searchIssuesInRepo, 参数:', args);
		const {
			keyword,
			owner,
			repo,
			state = 'all', // 默认状态为 all
			sort = 'created', // 默认按创建时间排序
			order = 'desc', // 默认降序
			per_page = 30, // 默认每页 10 个
			page = 1, // 默认页码 1
		} = args;
		const githubToken = toolExecutors.githubToken;

		if (!keyword || !owner || !repo) {
			console.warn(
				'searchIssuesInRepo 工具调用参数无效: 缺少关键词、仓库所有者或仓库名称。'
			);
			return {
				error:
					'searchIssuesInRepo 工具调用参数无效，缺少关键词、仓库所有者或仓库名称。',
			};
		}

		// 构建 GitHub API 搜索 Issue 的 URL
		// q=keyword+repo:owner/repo+is:issue
		const query = `${encodeURIComponent(
			keyword
		)}+repo:${`${owner}/${repo}`}+is:issue`;

		const apiUrl = `https://api.github.com/search/issues?q=${query}&state=${state}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 搜索 Issue: ${apiUrl}`);
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
				console.warn(
					`GitHub API 搜索 Issue 失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 搜索 Issue 失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const issues = [];

			if (data.items && Array.isArray(data.items)) {
				for (const item of data.items) {
					issues.push({
						id: item.id,
						number: item.number,
						html_url: item.html_url,
						title: item.title,
						state: item.state,
						created_at: item.created_at,
						updated_at: item.updated_at,
						comments: item.comments,
						author_login: item.user ? item.user.login : '未知', // 确保 user 存在
						labels: item.labels ? item.labels.map((label) => label.name) : [], // 提取标签名称
						body: item.body,
					});
				}
			}
			console.log(
				`searchIssuesInRepo 工具执行完毕，找到 ${issues.length} 个 Issue，总数 ${data.total_count}。`
			);
			return { issues, total_count: data.total_count };
		} catch (fetchError) {
			console.error(
				`GitHub API 搜索 Issue 时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 搜索 Issue 时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 getIssueComments 工具
	 * @param {object} args - 工具调用时传递的参数对象，例如 { owner: 'SagerNet', repo: 'sing-box', issue_number: 3202, per_page: 30, page: 1 }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 comments 字段（评论列表）
	 */
	getIssueComments: async (args) => {
		console.log('执行工具: getIssueComments, 参数:', args);
		const {
			owner,
			repo,
			issue_number,
			per_page = 30, // 默认每页 30 个
			page = 1, // 默认页码 1
		} = args;
		const githubToken = toolExecutors.githubToken;

		if (!owner || !repo || !issue_number) {
			console.warn(
				'getIssueComments 工具调用参数无效: 缺少仓库所有者、仓库名称或 Issue 编号。'
			);
			return {
				error:
					'getIssueComments 工具调用参数无效，缺少仓库所有者、仓库名称或 Issue 编号。',
			};
		}

		// 构建 GitHub API 获取 Issue 评论的 URL
		const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments?per_page=${per_page}&page=${page}`;

		try {
			console.log(`尝试通过 GitHub API 获取 Issue 评论: ${apiUrl}`);
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
				console.warn(
					`GitHub API 获取 Issue 评论失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 获取 Issue 评论失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const data = await response.json();
			const comments = [];

			if (Array.isArray(data)) {
				for (const item of data) {
					comments.push({
						id: item.id,
						html_url: item.html_url,
						user_login: item.user ? item.user.login : '未知', // 确保 user 存在
						created_at: item.created_at,
						updated_at: item.updated_at,
						body: item.body,
					});
				}
			}
			console.log(
				`getIssueComments 工具执行完毕，找到 ${comments.length} 条评论。`
			);
			return { comments };
		} catch (fetchError) {
			console.error(
				`GitHub API 获取 Issue 评论时发生网络错误: ${fetchError}, URL: ${
					fetchError.url || '未知'
				}`
			);
			return {
				error: `GitHub API 获取 Issue 评论时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},

	/**
	 * 执行 callGithubApi 工具
	 * 调用 GitHub 已知存在但工具中未声明的 API 方法，让模型自行拼接准确的调用 URL。
	 * @param {object} args - 工具调用时传递的参数对象，例如 { path: 'repos/owner/repo/releases/tags/tag', queryParams: { per_page: 10 }, method: 'GET', body: { ... } }
	 * @returns {Promise<object>} - 工具执行结果对象，包含 apiResponse 字段，apiResponse 是 GitHub API 的完整响应内容
	 */
	callGithubApi: async (args) => {
		console.log('执行工具: callGithubApi, 参数:', args);
		const {
			path,
			queryParams,
			method = 'GET',
			body,
			userGithubToken = null,
		} = args;
		const githubToken = userGithubToken
			? userGithubToken
			: toolExecutors.githubToken;

		const GITHUB_API_PREFIX = 'https://api.github.com';

		if (!path) {
			console.warn('callGithubApi 工具调用参数无效: 缺少 path。');
			return { error: 'callGithubApi 工具调用参数无效，缺少 API 路径。' };
		}

		// 构建完整的 API URL，确保 path 不以斜杠开头
		let apiUrl = `${GITHUB_API_PREFIX}/${
			path.startsWith('/') ? path.substring(1) : path
		}`;

		// 拼接查询参数
		if (queryParams && Object.keys(queryParams).length > 0) {
			const queryString = new URLSearchParams(queryParams).toString();
			apiUrl = `${apiUrl}?${queryString}`;
		}

		try {
			console.log(
				`尝试通过 GitHub API 调用: ${method.toUpperCase()} ${apiUrl}`
			);
			const fetchOptions = {
				method: method.toUpperCase(), // 确保方法为大写
				headers: {
					Accept: 'application/vnd.github+json', // 推荐使用此 Accept 头
					Authorization: `Bearer ${githubToken}`,
					'User-Agent': 'Gemini-Telegram-Bot', // GitHub API 要求 User-Agent
				},
			};

			// 如果是 POST, PUT, PATCH 请求，添加 Content-Type 和请求体
			if (
				body &&
				(method.toUpperCase() === 'POST' ||
					method.toUpperCase() === 'PUT' ||
					method.toUpperCase() === 'PATCH')
			) {
				fetchOptions.headers['Content-Type'] = 'application/json';
				fetchOptions.body = JSON.stringify(body); // 将请求体转换为 JSON 字符串
			}

			const response = await fetch(apiUrl, fetchOptions);

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(
					`GitHub API 调用失败，状态码: ${response.status}, 错误: ${errorText}, URL: ${apiUrl}`
				);
				return {
					error: `GitHub API 调用失败 (状态码: ${response.status}) - ${errorText}`,
				};
			}

			const apiResponse = await response.json();
			console.log(`callGithubApi 工具执行完毕，成功获取 API 响应。`);
			return { apiResponse };
		} catch (fetchError) {
			console.error(
				`GitHub API 调用时发生网络错误: ${fetchError}, URL: ${apiUrl}`
			);
			return {
				error: `GitHub API 调用时发生网络错误 - ${
					fetchError.message || '未知错误'
				}`,
			};
		}
	},
};

export default toolExecutors;
