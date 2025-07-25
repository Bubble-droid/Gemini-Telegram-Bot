// src/api/GeminiAPI/toolDeclarations.js

import { Type } from '@google/genai';

const tools = [
	{
		functionDeclarations: [
			{
				name: 'getAssetsContent',
				description: '根据提供的 GitHub 仓库文件路径列表，获取文件的原始内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Assets Content Parameters',
					properties: {
						assetsPath: {
							type: Type.ARRAY,
							description:
								'需要查询的文件路径列表，例如 ["MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md", "SagerNet/sing-box/refs/heads/dev-next/src/main.go", ...]',
							items: {
								type: Type.STRING,
								title: 'Asset Path Item',
								description:
									'单个文件的完整路径，格式为 "owner/repo/refs/heads/branch/path/to/file.ext"',
								example:
									'MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md',
							},
							minItems: 4,
							example: [
								'MetaCubeX/Meta-docs/refs/heads/main/docs/api/index.md',
								'SagerNet/sing-box/refs/heads/dev-next/src/main.go',
							],
						},
					},
					required: ['assetsPath'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Assets Content Response',
					properties: {
						assets: {
							type: Type.ARRAY,
							description: '获取到的文件内容列表。',
							items: {
								type: Type.OBJECT,
								title: 'Asset Content Item',
								properties: {
									path: {
										type: Type.STRING,
										description: '文件的完整路径。',
									},
									content: {
										type: Type.ARRAY,
										description:
											'文件的分割内容列表，每个元素是一个包含 "text" 字段的对象。',
										items: {
											type: Type.OBJECT,
											properties: {
												text: {
													type: Type.STRING,
													description: '分割后的文本内容。',
												},
											},
											required: ['text'],
										},
									},
									identifier: {
										type: Type.STRING,
										description: '文件的唯一标识符。',
									},
								},
								required: ['path', 'content', 'identifier'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'searchFilesByKeyword',
				description:
					'根据关键词在指定的 GitHub 仓库、分支和特定路径下搜索文件内容，以获取相关文件路径。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Search GitHub Repository Files By Keyword Parameters',
					properties: {
						keyword: {
							type: Type.STRING,
							description:
								'用于搜索文件内容的关键词，多个关键词请用空格分隔，例如 "路由 DNS"。',
							example: '路由 DNS',
						},
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description:
								'在仓库中搜索的路径，默认为仓库根目录。例如 "docs/" 或 "frontend/src/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/',
						},
						branch: {
							type: Type.STRING,
							description:
								'要搜索的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['keyword', 'owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Search GitHub Repository Files By Keyword Response',
					properties: {
						foundFiles: {
							type: Type.ARRAY,
							description: '根据关键词找到的文件路径列表。',
							items: {
								type: Type.STRING,
								title: 'Found File Path',
								description: '单个文件的完整路径。',
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listDirContents',
				description:
					'列出指定 GitHub 仓库、指定目录内的所有文件和子目录（只包含顶层内容）。此工具旨在辅助探索仓库指定目录的文件结构。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Directory Contents Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description:
								'要列出文件和子目录的路径，默认为仓库根目录。例如 "docs/configuration/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/configuration/',
						},
						branch: {
							type: Type.STRING,
							description:
								'要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Directory Contents Response',
					properties: {
						fileList: {
							type: Type.ARRAY,
							description: '指定目录内的文件和子目录列表。',
							items: {
								type: Type.OBJECT,
								title: 'File or Directory Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件或目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件或目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，"file" 或 "dir"。',
										enum: ['file', 'dir'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoTree',
				description:
					'递归列出指定 GitHub 仓库和分支下的所有文件及其完整路径。此工具旨在辅助获取仓库的完整文件结构，用于深度分析。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Tree Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description:
								'要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Tree Response',
					properties: {
						fileList: {
							type: Type.ARRAY,
							description: '仓库中的所有文件和目录的递归列表。',
							items: {
								type: Type.OBJECT,
								title: 'Tree Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件或目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件或目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，"file" 或 "tree" (目录)。',
										enum: ['file', 'tree'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoDirs',
				description:
					'递归列出指定 GitHub 仓库和分支下的所有目录及其完整路径。此工具旨在辅助获取仓库的目录结构，用于深度分析。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Directories Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description:
								'要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Directories Response',
					properties: {
						directories: {
							type: Type.ARRAY,
							description: '仓库中的所有目录的递归列表。',
							items: {
								type: Type.OBJECT,
								title: 'Directory Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '目录的名称。',
									},
									path: {
										type: Type.STRING,
										description: '目录的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，始终为 "tree"。',
										enum: ['tree'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoFilesInPath',
				description:
					'递归列出指定 GitHub 仓库、分支和特定路径下的所有文件及其完整路径。此工具旨在辅助获取特定目录下的文件列表。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Files In Path Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						path: {
							type: Type.STRING,
							description:
								'要筛选文件的相对路径，例如 "docs/configuration/"。此路径应相对于仓库根目录。',
							example: 'docs/configuration/',
						},
						branch: {
							type: Type.STRING,
							description:
								'要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
					},
					required: ['owner', 'repo', 'path'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Files In Path Response',
					properties: {
						filesInPath: {
							type: Type.ARRAY,
							description: '指定路径下的文件列表。',
							items: {
								type: Type.OBJECT,
								title: 'File Item In Path',
								properties: {
									name: {
										type: Type.STRING,
										description: '文件的名称。',
									},
									path: {
										type: Type.STRING,
										description: '文件的完整路径。',
									},
									type: {
										type: Type.STRING,
										description: '类型，始终为 "file"。',
										enum: ['file'],
									},
								},
								required: ['name', 'path', 'type'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoCommits',
				description: '获取指定 GitHub 仓库的最近指定次数的提交记录。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Commits Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						branch: {
							type: Type.STRING,
							description:
								'要查询的仓库分支，默认为仓库默认分支（如 main 或 master）。',
							default: 'main',
							example: 'main',
						},
						path: {
							type: Type.STRING,
							description:
								'筛选提交记录的路径，只返回涉及该路径的提交。例如 "docs/"。此路径应相对于仓库根目录。',
							default: '',
							example: 'docs/',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的提交数量，默认为 10，最大 100。',
							default: 10,
							minimum: 1,
							maximum: 100,
							example: 10,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Commits Response',
					properties: {
						commits: {
							type: Type.ARRAY,
							description: '提交记录列表。',
							items: {
								type: Type.OBJECT,
								title: 'Commit Item',
								properties: {
									sha: {
										type: Type.STRING,
										description: '提交的 SHA 值。',
									},
									message: {
										type: Type.STRING,
										description: '提交信息。',
									},
									author: {
										type: Type.STRING,
										description: '提交作者。',
									},
									date: {
										type: Type.STRING,
										format: 'date-time',
										description: '提交日期。',
									},
									url: {
										type: Type.STRING,
										description: '提交的 HTML URL。',
									},
								},
								required: ['sha', 'message', 'author', 'date', 'url'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getCommitDetails',
				description: '获取指定 GitHub 仓库中某个提交的详细信息。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Commit Details Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						commit_sha: {
							type: Type.STRING,
							description:
								'要查询的提交的 SHA 值，例如 "2464ced48c504eb0dee616c6d474813621779afc"。',
							example: '2464ced48c504eb0dee616c6d474813621779afc',
						},
					},
					required: ['owner', 'repo', 'commit_sha'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Commit Details Response',
					properties: {
						commitDetails: {
							type: Type.OBJECT,
							description: '提交的详细信息。',
							properties: {
								sha: {
									type: Type.STRING,
									description: '提交的 SHA 值。',
								},
								author: {
									type: Type.OBJECT,
									properties: {
										name: {
											type: Type.STRING,
											description: '作者名称。',
										},
										email: {
											type: Type.STRING,
											description: '作者邮箱。',
										},
										date: {
											type: Type.STRING,
											format: 'date-time',
											description: '提交日期。',
										},
									},
									required: ['name', 'email', 'date'],
								},
								message: {
									type: Type.STRING,
									description: '提交信息。',
								},
								html_url: {
									type: Type.STRING,
									description: '提交的 HTML URL。',
								},
								stats: {
									type: Type.OBJECT,
									properties: {
										total: {
											type: Type.NUMBER,
											description: '总更改行数。',
										},
										additions: {
											type: Type.NUMBER,
											description: '新增行数。',
										},
										deletions: {
											type: Type.NUMBER,
											description: '删除行数。',
										},
									},
									required: ['total', 'additions', 'deletions'],
								},
								files: {
									type: Type.ARRAY,
									description: '更改的文件列表。',
									items: {
										type: Type.OBJECT,
										properties: {
											filename: {
												type: Type.STRING,
												description: '文件名。',
											},
											status: {
												type: Type.STRING,
												description:
													'文件状态（例如 "added", "modified", "removed"）。',
											},
											additions: {
												type: Type.NUMBER,
												description: '文件新增行数。',
											},
											deletions: {
												type: Type.NUMBER,
												description: '文件删除行数。',
											},
											changes: {
												type: Type.NUMBER,
												description: '文件总更改行数。',
											},
											patch: {
												type: Type.STRING,
												description: '文件的 diff 信息。',
											},
										},
										required: [
											'filename',
											'status',
											'additions',
											'deletions',
											'changes',
										],
									},
								},
							},
							required: [
								'sha',
								'author',
								'message',
								'html_url',
								'stats',
								'files',
							],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getRepoReleases',
				description: '获取指定 GitHub 仓库的最近指定数量的发布版本。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Repository Releases Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的发布版本数量，默认为 10，最大 100。',
							default: 10,
							minimum: 1,
							maximum: 100,
							example: 10,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Repository Releases Response',
					properties: {
						releases: {
							type: Type.ARRAY,
							description: '发布版本列表。',
							items: {
								type: Type.OBJECT,
								title: 'Release Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: '发布版本 ID。',
									},
									tag_name: {
										type: Type.STRING,
										description: '发布版本的标签名称。',
									},
									name: {
										type: Type.STRING,
										description: '发布版本的名称。',
									},
									body: {
										type: Type.STRING,
										description: '发布版本的描述。',
									},
									author_login: {
										type: Type.STRING,
										description: '发布版本的作者登录名称。',
									},
									author_type: {
										type: Type.STRING,
										description: '发布版本的作者类型。',
									},
									published_at: {
										type: Type.STRING,
										format: 'date-time',
										description: '发布时间。',
									},
									html_url: {
										type: Type.STRING,
										description: '发布版本的 HTML URL。',
									},
									prerelease: {
										type: Type.BOOLEAN,
										description: '是否为预发布版本。',
									},
									draft: {
										type: Type.BOOLEAN,
										description: '是否为草稿版本。',
									},
								},
								required: [
									'tag_name',
									'name',
									'body',
									'author_login',
									'author_type',
									'published_at',
									'html_url',
									'prerelease',
									'draft',
								],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getReleaseDetails',
				description:
					'获取指定 GitHub 仓库中某个发布版本的详细信息，包括所有资产。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Release Details Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "GUI-for-Cores"。',
							example: 'GUI-for-Cores',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "GUI.for.SingBox"。',
							example: 'GUI.for.SingBox',
						},
						release_id: {
							type: Type.NUMBER,
							description:
								'发布版本的 ID，例如 227541695。如果提供，将优先使用此 ID。',
							example: 227541695,
							nullable: true,
						},
						tag_name: {
							type: Type.STRING,
							description:
								'发布版本的标签名称，例如 "rolling-release-alpha"。如果未提供 release_id 或其查询失败，将尝试使用此标签名称。',
							example: 'rolling-release-alpha',
							nullable: true,
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Release Details Response',
					properties: {
						releaseDetails: {
							type: Type.OBJECT,
							description: '发布版本的详细信息。',
							properties: {
								id: {
									type: Type.NUMBER,
									description: '发布版本 ID。',
								},
								tag_name: {
									type: Type.STRING,
									description: '发布版本的标签名称。',
								},
								name: {
									type: Type.STRING,
									description: '发布版本的名称。',
								},
								body: {
									type: Type.STRING,
									description: '发布版本的描述。',
									nullable: true,
								},
								author_login: {
									type: Type.STRING,
									description: '发布版本的作者登录名称。',
								},
								published_at: {
									type: Type.STRING,
									format: 'date-time',
									description: '发布时间。',
								},
								html_url: {
									type: Type.STRING,
									description: '发布版本的 HTML URL。',
								},
								prerelease: {
									type: Type.BOOLEAN,
									description: '是否为预发布版本。',
								},
								draft: {
									type: Type.BOOLEAN,
									description: '是否为草稿版本。',
								},
								assets: {
									type: Type.ARRAY,
									description: '发布版本包含的资产列表。',
									items: {
										type: Type.OBJECT,
										title: 'Release Asset Item',
										properties: {
											id: {
												type: Type.NUMBER,
												description: '资产 ID。',
											},
											name: {
												type: Type.STRING,
												description: '资产的文件名。',
											},
											browser_download_url: {
												type: Type.STRING,
												description: '资产的下载 URL。',
											},
											size: {
												type: Type.NUMBER,
												description: '资产的文件大小（字节）。',
											},
											download_count: {
												type: Type.NUMBER,
												description: '资产的下载次数。',
											},
											created_at: {
												type: Type.STRING,
												format: 'date-time',
												description: '资产创建时间。',
											},
											updated_at: {
												type: Type.STRING,
												format: 'date-time',
												description: '资产最近更新时间。',
											},
										},
										required: [
											'id',
											'name',
											'browser_download_url',
											'size',
											'download_count',
											'created_at',
											'updated_at',
										],
									},
								},
							},
							required: [
								'id',
								'tag_name',
								'name',
								'author_login',
								'published_at',
								'html_url',
								'prerelease',
								'draft',
								'assets',
							],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getYoutubeVideoLink',
				description: '解析 YouTube 视频链接，并识别视频内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Youtube Video Link Parameters',
					properties: {
						videoUrl: {
							type: Type.STRING,
							description:
								'YouTube 视频的完整 URL，例如 "https://www.youtube.com/watch?v=9hE5-98ZeCg"。',
							example: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
						},
					},
					required: ['videoUrl'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Youtube Video Link Response',
					properties: {
						fileData: {
							type: Type.OBJECT,
							description: '用于识别的视频数据',
							properties: {
								fileUri: {
									type: Type.STRING,
									description: 'YouTube 视频的 URI。',
								},
							},
							required: ['fileUri'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getOnlineFile',
				description:
					'解析在线文件（例如图片、视频、文档等）链接，并识别文件内容。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get Online Media File Parameters',
					properties: {
						fileUrl: {
							type: Type.STRING,
							description:
								'在线文件的完整 URL，例如 "https://example.com/image.jpg"。',
							example: 'https://example.com/image.jpg',
						},
						fileName: {
							type: Type.STRING,
							description: '文件的名称，例如 "my_image.jpg"。',
							example: 'my_image.jpg',
						},
						mimeType: {
							type: Type.STRING,
							description:
								'文件的MIME类型，图片类文件统一为 "image/jpeg"，视频和动态图片类文件统一为 "video/mp4"，可直接读取内容的文本类文件统一为 "text/plain"',
							example: 'image/jpeg',
							enum: ['image/jpeg', 'video/mp4', 'text/plain'],
						},
					},
					required: ['fileUrl', 'fileName', 'mimeType'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get Online Media File Response',
					properties: {
						fileData: {
							type: Type.OBJECT,
							description: '用于识别的文件数据。',
							properties: {
								fileUri: {
									type: Type.STRING,
									description: '在线文件的 URI。',
								},
								mimeType: {
									type: Type.STRING,
									description: '在线文件的 MIME 类型。',
								},
							},
							required: ['fileUri', 'mimeType'],
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listUserOrOrgRepos',
				description: '列出指定用户或组织下的所有仓库。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List User or Organization Repositories Parameters',
					properties: {
						userOrOrg: {
							type: Type.STRING,
							description: 'GitHub 用户名或组织名称，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						type: {
							type: Type.STRING,
							description: '仓库类型，例如 "all"。',
							default: 'all',
							example: 'all',
						},
						sort: {
							type: Type.STRING,
							description:
								'排序方式，例如 "created", "updated", "pushed", "full_name" 等，默认为 "updated"。',
							default: 'updated',
							enum: ['created', 'updated', 'pushed', 'full_name'],
							example: 'updated',
						},
						direction: {
							type: Type.STRING,
							description: '排序方向，"asc" 或 "desc"，默认为 "desc"。',
							default: 'desc',
							enum: ['asc', 'desc'],
							example: 'desc',
						},
					},
					required: ['userOrOrg'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List User or Organization Repositories Response',
					properties: {
						repos: {
							type: Type.ARRAY,
							description: '获取到的仓库列表。',
							items: {
								type: Type.OBJECT,
								title: 'Repository Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: '仓库 ID。',
									},
									name: {
										type: Type.STRING,
										description: '仓库名称。',
									},
									full_name: {
										type: Type.STRING,
										description: '仓库完整名称（owner/repo）。',
									},
									private: {
										type: Type.BOOLEAN,
										description: '是否为私有仓库。',
									},
									owner_login: {
										type: Type.STRING,
										description: '所有者登录名。',
									},
									html_url: {
										type: Type.STRING,
										description: '仓库的 HTML URL。',
									},
									description: {
										type: Type.STRING,
										description: '仓库描述。',
										nullable: true,
									},
									fork: {
										type: Type.BOOLEAN,
										description: '是否为 Fork 仓库。',
									},
									stargazers_count: {
										type: Type.NUMBER,
										description: '星标数量。',
									},
									watchers_count: {
										type: Type.NUMBER,
										description: '关注者数量。',
									},
									language: {
										type: Type.STRING,
										description: '主要编程语言。',
										nullable: true,
									},
									forks_count: {
										type: Type.NUMBER,
										description: 'Fork 数量。',
									},
									open_issues_count: {
										type: Type.NUMBER,
										description: '开放 Issue 数量。',
									},
									default_branch: {
										type: Type.STRING,
										description: '默认分支名称。',
									},
								},
								required: [
									'id',
									'name',
									'full_name',
									'private',
									'owner_login',
									'html_url',
									'fork',
									'stargazers_count',
									'watchers_count',
									'forks_count',
									'open_issues_count',
									'default_branch',
								],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'listRepoBranches',
				description: '列出指定 GitHub 仓库的所有分支。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Branches Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
					},
					required: ['owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'List GitHub Repository Branches Response',
					properties: {
						branches: {
							type: Type.ARRAY,
							description: '获取到的分支列表。',
							items: {
								type: Type.OBJECT,
								title: 'Branch Item',
								properties: {
									name: {
										type: Type.STRING,
										description: '分支名称。',
									},
									commit_sha: {
										type: Type.STRING,
										description: '最新提交的 SHA 值。',
									},
									commit_url: {
										type: Type.STRING,
										description: '最新提交的 API URL。',
									},
									protected: {
										type: Type.BOOLEAN,
										description: '分支是否受保护。',
									},
								},
								required: ['name', 'commit_sha', 'commit_url', 'protected'],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'searchGithubRepos',
				description:
					'搜索 GitHub 仓库，并根据关键词、排序方式和排序方向返回匹配的仓库列表。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Search GitHub Repositories Parameters',
					properties: {
						keyword: {
							type: Type.STRING,
							description:
								'用于搜索仓库的关键词，多个关键词请用空格分隔，例如 "free node"。',
							example: 'free node',
						},
						sort: {
							type: Type.STRING,
							description:
								'排序方式，例如 "stars", "forks", "help-wanted-issues", "updated" 等，默认为 "best match"。',
							default: 'best match',
							enum: [
								'stars',
								'forks',
								'help-wanted-issues',
								'updated',
								'best match',
							],
							example: 'updated',
						},
						order: {
							type: Type.STRING,
							description: '排序方向，"asc" 或 "desc"，默认为 "desc"。',
							default: 'desc',
							enum: ['asc', 'desc'],
							example: 'desc',
						},
					},
					required: ['keyword'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Search GitHub Repositories Response',
					properties: {
						repositories: {
							type: Type.ARRAY,
							description: '获取到的仓库列表。',
							items: {
								type: Type.OBJECT,
								title: 'Repository Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: '仓库 ID。',
									},
									name: {
										type: Type.STRING,
										description: '仓库名称。',
									},
									full_name: {
										type: Type.STRING,
										description: '仓库完整名称（owner/repo）。',
									},
									private: {
										type: Type.BOOLEAN,
										description: '是否为私有仓库。',
									},
									owner_login: {
										type: Type.STRING,
										description: '所有者登录名。',
									},
									html_url: {
										type: Type.STRING,
										description: '仓库的 HTML URL。',
									},
									description: {
										type: Type.STRING,
										description: '仓库描述。',
										nullable: true,
									},
									fork: {
										type: Type.BOOLEAN,
										description: '是否为 Fork 仓库。',
									},
									stargazers_count: {
										type: Type.NUMBER,
										description: '星标数量。',
									},
									watchers_count: {
										type: Type.NUMBER,
										description: '关注者数量。',
									},
									language: {
										type: Type.STRING,
										description: '主要编程语言。',
										nullable: true,
									},
									forks_count: {
										type: Type.NUMBER,
										description: 'Fork 数量。',
									},
									open_issues_count: {
										type: Type.NUMBER,
										description: '开放 Issue 数量。',
									},
									default_branch: {
										type: Type.STRING,
										description: '默认分支名称。',
									},
									updated_at: {
										type: Type.STRING,
										format: 'date-time',
										description: '仓库最近更新时间。',
									},
								},
								required: [
									'id',
									'name',
									'full_name',
									'private',
									'owner_login',
									'html_url',
									'fork',
									'stargazers_count',
									'watchers_count',
									'forks_count',
									'open_issues_count',
									'default_branch',
									'updated_at',
								],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getCurrentTime',
				description: '获取当前 UTC+8 时间并格式化字符串。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'GetCurrentTime Parameters',
				},
				response: {
					type: Type.OBJECT,
					title: 'GetCurrentTime Response',
					properties: {
						currentTime: {
							type: Type.STRING,
							description:
								'格式化后的当前时间字符串 (YYYY-MM-DD HH:mm:ss UTC+8)。',
							example: '2024-10-27 10:30:00 UTC+8',
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
					required: ['currentTime'],
				},
			},
			{
				name: 'searchGlobalIssuesByKeyword',
				description:
					'根据关键词在 GitHub 全站范围内搜索 Issue，默认会搜索所有你有权限查看的公开仓库和私有仓库中匹配的 Issue。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Search GitHub Global Issues Parameters',
					properties: {
						keyword: {
							type: Type.STRING,
							description:
								'用于搜索 Issue 内容和标题的关键词，多个关键词请用空格分隔，例如 "tun error"。',
							example: 'tun error',
						},
						state: {
							type: Type.STRING,
							description:
								'Issue 的状态，可以是 "open"（开放）、"closed"（关闭）或 "all"（所有），默认为 "all"。',
							default: 'all',
							enum: ['open', 'closed', 'all'],
							example: 'all',
						},
						sort: {
							type: Type.STRING,
							description:
								'排序方式，例如 "created"（创建时间）、"updated"（更新时间）或 "comments"（评论数量），默认为 "created"。',
							default: 'created',
							enum: ['created', 'updated', 'comments'],
							example: 'created',
						},
						order: {
							type: Type.STRING,
							description:
								'排序方向，"asc"（升序）或 "desc"（降序），默认为 "desc"。',
							default: 'desc',
							enum: ['asc', 'desc'],
							example: 'desc',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的 Issue 数量，默认为 30，最大 100。',
							default: 30,
							minimum: 1,
							maximum: 100,
							example: 30,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['keyword'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Search GitHub Global Issues Response',
					properties: {
						issues: {
							type: Type.ARRAY,
							description: '获取到的 Issue 列表。',
							items: {
								type: Type.OBJECT,
								title: 'Global Issue Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: 'Issue ID。',
									},
									number: {
										type: Type.NUMBER,
										description: 'Issue 的编号。',
									},
									html_url: {
										type: Type.STRING,
										description: 'Issue 的 HTML URL。',
									},
									title: {
										type: Type.STRING,
										description: 'Issue 标题。',
									},
									state: {
										type: Type.STRING,
										description: 'Issue 状态（open 或 closed）。',
									},
									created_at: {
										type: Type.STRING,
										format: 'date-time',
										description: 'Issue 创建时间。',
									},
									updated_at: {
										type: Type.STRING,
										format: 'date-time',
										description: 'Issue 最近更新时间。',
									},
									comments: {
										type: Type.NUMBER,
										description: 'Issue 的评论数量。',
									},
									author_login: {
										type: Type.STRING,
										description: 'Issue 创建者登录名。',
									},
									labels: {
										type: Type.ARRAY,
										description: 'Issue 标签列表。',
										items: {
											type: Type.STRING,
											description: '标签名称。',
										},
									},
									body: {
										type: Type.STRING,
										description: 'Issue 内容描述。',
										nullable: true,
									},
									repository_url: {
										type: Type.STRING,
										description: 'Issue 所在仓库的 API URL。',
									},
								},
								required: [
									'id',
									'number',
									'html_url',
									'title',
									'state',
									'created_at',
									'updated_at',
									'comments',
									'author_login',
									'repository_url',
								],
							},
						},
						total_count: {
							type: Type.NUMBER,
							description: '匹配到的 Issue 总数。',
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'searchIssuesInRepo',
				description:
					'根据关键词在指定的 GitHub 仓库内搜索 Issue，并可根据状态、排序方式和排序方向返回匹配的 Issue 列表。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Search GitHub Issues Parameters',
					properties: {
						keyword: {
							type: Type.STRING,
							description:
								'用于搜索 Issue 内容和标题的关键词，多个关键词请用空格分隔，例如 "tun error"。',
							example: 'tun error',
						},
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						state: {
							type: Type.STRING,
							description:
								'Issue 的状态，可以是 "open"（开放）、"closed"（关闭）或 "all"（所有），默认为 "all"。',
							default: 'all',
							enum: ['open', 'closed', 'all'],
							example: 'all',
						},
						sort: {
							type: Type.STRING,
							description:
								'排序方式，例如 "created"（创建时间）、"updated"（更新时间）或 "comments"（评论数量），默认为 "created"。',
							default: 'created',
							enum: ['created', 'updated', 'comments'],
							example: 'created',
						},
						order: {
							type: Type.STRING,
							description:
								'排序方向，"asc"（升序）或 "desc"（降序），默认为 "desc"。',
							default: 'desc',
							enum: ['asc', 'desc'],
							example: 'desc',
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的 Issue 数量，默认为 30，最大 100。',
							default: 30,
							minimum: 1,
							maximum: 100,
							example: 30,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['keyword', 'owner', 'repo'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Search GitHub Issues Response',
					properties: {
						issues: {
							type: Type.ARRAY,
							description: '获取到的 Issue 列表。',
							items: {
								type: Type.OBJECT,
								title: 'Issue Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: 'Issue ID。',
									},
									number: {
										type: Type.NUMBER,
										description: 'Issue 的编号。',
									},
									html_url: {
										type: Type.STRING,
										description: 'Issue 的 HTML URL。',
									},
									title: {
										type: Type.STRING,
										description: 'Issue 标题。',
									},
									state: {
										type: Type.STRING,
										description: 'Issue 状态（open 或 closed）。',
									},
									created_at: {
										type: Type.STRING,
										format: 'date-time',
										description: 'Issue 创建时间。',
									},
									updated_at: {
										type: Type.STRING,
										format: 'date-time',
										description: 'Issue 最近更新时间。',
									},
									comments: {
										type: Type.NUMBER,
										description: 'Issue 的评论数量。',
									},
									author_login: {
										type: Type.STRING,
										description: 'Issue 创建者登录名。',
									},
									labels: {
										type: Type.ARRAY,
										description: 'Issue 标签列表。',
										items: {
											type: Type.STRING,
											description: '标签名称。',
										},
									},
									body: {
										type: Type.STRING,
										description: 'Issue 内容描述。',
										nullable: true,
									},
								},
								required: [
									'id',
									'number',
									'html_url',
									'title',
									'state',
									'created_at',
									'updated_at',
									'comments',
									'author_login',
								],
							},
						},
						total_count: {
							type: Type.NUMBER,
							description: '匹配到的 Issue 总数。',
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'getIssueComments',
				description: '获取指定 GitHub 仓库中某个 Issue 的所有评论。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Get GitHub Issue Comments Parameters',
					properties: {
						owner: {
							type: Type.STRING,
							description: 'GitHub 仓库所有者，例如 "SagerNet"。',
							example: 'SagerNet',
						},
						repo: {
							type: Type.STRING,
							description: 'GitHub 仓库名称，例如 "sing-box"。',
							example: 'sing-box',
						},
						issue_number: {
							type: Type.NUMBER,
							description: 'Issue 的编号，例如 3202。',
							example: 3202,
						},
						per_page: {
							type: Type.NUMBER,
							description: '每页返回的评论数量，默认为 30，最大 100。',
							default: 30,
							minimum: 1,
							maximum: 100,
							example: 30,
						},
						page: {
							type: Type.NUMBER,
							description: '页码，默认为 1。',
							default: 1,
							minimum: 1,
							example: 1,
						},
					},
					required: ['owner', 'repo', 'issue_number'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Get GitHub Issue Comments Response',
					properties: {
						comments: {
							type: Type.ARRAY,
							description: '获取到的 Issue 评论列表。',
							items: {
								type: Type.OBJECT,
								title: 'Issue Comment Item',
								properties: {
									id: {
										type: Type.NUMBER,
										description: '评论 ID。',
									},
									html_url: {
										type: Type.STRING,
										description: '评论的 HTML URL。',
									},
									user_login: {
										type: Type.STRING,
										description: '评论作者的登录名。',
									},
									created_at: {
										type: Type.STRING,
										format: 'date-time',
										description: '评论创建时间。',
									},
									updated_at: {
										type: Type.STRING,
										format: 'date-time',
										description: '评论最近更新时间。',
									},
									body: {
										type: Type.STRING,
										description: '评论内容。',
									},
								},
								required: [
									'id',
									'html_url',
									'user_login',
									'created_at',
									'updated_at',
									'body',
								],
							},
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
			{
				name: 'callGithubApi',
				description:
					'调用 GitHub 官方 API 中已知存在但工具集中未显式声明的任何 API 方法。此工具支持读取（GET）和写入/修改（POST, PUT, PATCH, DELETE）操作，例如创建或修改 Issue、在有权限的仓库新建或删除文件、推送提交、创建拉取请求等。你需要自行拼接准确的调用 URL，并可选择性地提供查询参数、HTTP 方法和请求体。',
				behavior: 'BLOCKING',
				parameters: {
					type: Type.OBJECT,
					title: 'Call GitHub API Parameters',
					properties: {
						path: {
							type: Type.STRING,
							description:
								'GitHub API 的路径部分，硬编码预设前缀 "https://api.github.com/"。例如，要调用 "https://api.github.com/repos/owner/repo/releases/tags/tag"，则 path 为 "repos/owner/repo/releases/tags/tag"。',
							example: 'repos/SagerNet/sing-box/issues',
						},
						queryParams: {
							type: Type.OBJECT,
							description:
								'可选的查询参数对象，例如 { per_page: 10, page: 1 }。',
							nullable: true,
							example: { per_page: 10, page: 1 },
						},
						method: {
							type: Type.STRING,
							description:
								'HTTP 方法，例如 "GET", "POST", "PUT", "DELETE", "PATCH"。默认为 "GET"。',
							default: 'GET',
							enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
							example: 'POST',
						},
						body: {
							type: Type.OBJECT,
							description:
								'可选的请求体对象，用于 POST, PUT, PATCH 请求。例如，创建 Issue 的请求体：{ "title": "新 Issue", "body": "这是 Issue 的内容" }；创建文件：{ "message": "commit message", "content": "base64编码的文件内容" }。',
							nullable: true,
							example: {
								title: '新 Issue 标题',
								body: '这是一个通过 API 创建的 Issue。',
							},
						},
					},
					required: ['path'],
				},
				response: {
					type: Type.OBJECT,
					title: 'Call GitHub API Response',
					properties: {
						apiResponse: {
							type: Type.OBJECT,
							description: 'GitHub API 的完整响应内容。',
							nullable: true,
						},
						error: {
							type: Type.STRING,
							description: '如果发生错误，则包含错误信息。',
						},
					},
				},
			},
		],
	},
];

export default tools;
