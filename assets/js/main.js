/**
 * =============================================================================
 * 1. 全局配置与状态管理模块
 * =============================================================================
 */

// 路径与文件配置
const PATH_CONFIG = { 
    postsDir: '_posts/',      // Markdown 文章存放目录
    assetsDir: 'assets/',     // 静态资源(图片/CSS/JS)目录
    configFile: 'config.json' // 文章索引数据文件
};

// 全局状态变量
let allPosts = [];           // 存储所有文章的元数据列表
let tocData = [];            // 存储当前文章的目录结构(TOC)
let currentPostFile = null;  // 当前正在渲染的文章文件名 (防止重复加载)
let currentRoutePath = '';   // 当前的路由路径 (URL Hash)

// --- 核心记忆变量 (用于搜索退出后的状态恢复) ---
let lastReadPostPath = null;   // 记忆：用户在搜索前正在阅读的文章路径
let lastSearchCategory = null; // 记忆：用户在搜索前所在的分类视图

/**
 * =============================================================================
 * 2. 工具函数模块
 * =============================================================================
 */

/**
 * 生成符合 HTML 规范的 ID
 * 用于为标题生成锚点，支持中文、英文和数字
 */
function generateId(text) {
    return text.toLowerCase()
        .replace(/\s+/g, '-')                      // 空格转连字符
        .replace(/[^\w\u4e00-\u9fa5\-]+/g, '')     // 移除非法字符(保留中英文数字)
        .replace(/\-\-+/g, '-')                    // 合并连续连字符
        .replace(/^-+|-+$/g, '') || 'heading';     // 去除首尾连字符
}

/**
 * =============================================================================
 * 3. Marked.js 配置 (Markdown 解析器)
 * =============================================================================
 */

// 扩展功能：高亮语法 (==text==)
const highlightExtension = {
    name: 'highlight', 
    level: 'inline', 
    start(src) { return src.match(/==/)?.index; },
    tokenizer(src) {
        const match = /^==([^=]+)==/.exec(src);
        if (match) return { type: 'highlight', raw: match[0], text: match[1].trim() };
    },
    renderer(token) { return `<mark>${token.text}</mark>`; }
};

// 启用 GFM (GitHub Flavored Markdown) 和换行符支持
marked.use({ gfm: true, breaks: true, extensions: [highlightExtension] });

// 自定义渲染器 (Renderer)
const renderer = {
    /**
     * 图片渲染逻辑
     * [关键功能]：清洗相对路径，解决 "../" 导致的路径错误
     */
    image({ href, title, text }) {
        if (!href) return '';
        
        // 路径清洗：移除开头的 ../ ./ / 等前缀
        let cleanPath = href.replace(/^(?:\.\.\/|\.\/|\/)+/, '');

        // 如果 href 中包含 'assets/'，优先按 assets 处理（保留原行为）
        const assetIndex = href.indexOf('assets/');
        if (assetIndex !== -1) {
            cleanPath = href.substring(assetIndex + 7); // 7 = 'assets/'.length
        }

        // 拼接最终路径：优先处理 attachments（映射到 _posts/attachments），其余映射到 assets
        let finalSrc;
        if (href.startsWith('http')) {
            finalSrc = href;
        } else {
            // 识别 _posts/attachments 或 attachments 开头的路径
            const attMatch = cleanPath.match(/^(?:_posts\/)?attachments\/.+/);
            if (attMatch) {
                // 去掉可能的 _posts/ 前缀，避免重复
                let rel = cleanPath.replace(/^_posts\//, '');
                finalSrc = PATH_CONFIG.postsDir + rel;
            } else {
                finalSrc = PATH_CONFIG.assetsDir + cleanPath;
            }
        }
        
        // 返回带灯箱点击事件(openLightbox)的 HTML
        return `<img src="${finalSrc}" alt="${text}" class="mx-auto rounded-lg shadow-lg my-6 cursor-zoom-in hover:shadow-xl transition" onclick="openLightbox('${finalSrc}')">`;
    },

    /**
     * 标题渲染逻辑
     * 功能：生成锚点链接，并收集数据到 tocData 供侧边栏目录使用
     */
    heading({ tokens, depth, text }) {
        const innerHTML = this.parser.parseInline(tokens);
        // 清理 HTML 标签和 Markdown 符号，获取纯文本用于 ID
        const rawText = text.replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/==/g, '');
        const id = generateId(rawText);
        
        // 存入目录数据
        tocData.push({ id, text: rawText, depth });
        
        // 构建锚点链接
        const href = currentRoutePath ? `#/${currentRoutePath}?anchor=${id}` : `#${id}`;
        
        return `<h${depth} id="${id}" class="scroll-mt-24 group relative">
                    <a href="${href}" class="absolute -left-6 opacity-0 group-hover:opacity-100 text-primary no-underline select-none">#</a>
                    <a href="${href}" class="no-underline hover:text-primary text-inherit transition-colors">${innerHTML}</a>
                </h${depth}>`;
    }
};
marked.use({ renderer });

/**
 * =============================================================================
 * 4. 路由与初始化模块
 * =============================================================================
 */

/**
 * 初始化应用
 * 加载配置 -> 渲染分类 -> 启动路由监听 -> 绑定事件
 */
async function init() {
    try {
        // 添加时间戳防止 JSON 缓存
        const res = await fetch(PATH_CONFIG.configFile + '?t=' + Date.now());
        allPosts = await res.json();
        renderCategories(); 
        window.addEventListener('hashchange', router); 
        router(); // 初次加载触发路由
        setupEvents(); 
    } catch (e) { console.error("初始化失败", e); }
}

/**
 * 路由核心逻辑
 * 根据 URL Hash 决定显示文章详情还是文章列表
 */
function router() {
    const fullHash = decodeURIComponent(window.location.hash.slice(1));
    
    // 如果 Hash 为空，显示默认首页
    if (!fullHash || fullHash === '/') {
        currentPostFile = null; 
        currentRoutePath = ''; 
        renderHome(); 
        return;
    }

    // 分离路径和查询参数 (例如: post/1?anchor=head)
    const [path, query] = fullHash.split('?');
    const cleanPath = path.replace(/^\//, '');

    // 查找匹配的文章
    const post = allPosts.find(p => p.url_path === cleanPath);
    if (post) {
        // 如果是文章：
        if (currentPostFile === post.file) { 
            // 如果已经在当前文章，仅切换视图显隐并处理滚动
            document.getElementById('home-view').classList.add('hidden');
            document.getElementById('article-view').classList.remove('hidden');
            handleScroll(query); 
        } else { 
            // 如果是新文章，加载内容
            currentPostFile = post.file; 
            loadPost(post, query); 
        }
    } else {
        // 如果不是文章（或是未知路径），当作分类视图处理
        currentPostFile = null; 
        renderHome(cleanPath);
    }
}

/**
 * =============================================================================
 * 5. 视图渲染逻辑模块
 * =============================================================================
 */

/**
 * 渲染文章卡片列表
 * @param {Array} posts - 文章数据数组
 * @param {Boolean} isConcise - 是否为简洁模式 (搜索/分类时隐藏摘要)
 */
function renderPostList(posts, isConcise = false) {
    const list = document.getElementById('post-list');
    if (posts.length === 0) {
        list.innerHTML = `<div class="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/20">未找到相关文章</div>`;
        return;
    }
    list.innerHTML = posts.map(post => `
        <article class="group bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/30 transition">
            <div class="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-primary rounded font-medium">${post.category}</span>
                <span>${post.date}</span>
            </div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
                <a href="#/${post.url_path}" class="hover:text-primary transition-colors">${post.title}</a>
            </h2>
            ${isConcise ? '' : `<p class="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-2">${post.summary}</p>`}
        </article>
    `).join('');
}

/**
 * 渲染首页容器 (Home View)
 * 包含：分类筛选、搜索结果、默认全列表
 * @param {String} filterCat - 当前选中的分类名称 (可选)
 */
function renderHome(filterCat = null) {
    // 切换视图容器显隐
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('article-view').classList.add('hidden');
    document.title = "Chigengyi Blog";
    
    const label = document.getElementById('current-filter-label');
    const name = document.getElementById('filter-name');
    const input = document.getElementById('search-input');
    
    // 场景 A: 分类筛选视图
    if (filterCat) {
        label.classList.remove('hidden'); 
        name.innerText = `分类: ${filterCat}`;
        document.querySelector('#current-filter-label button').classList.add('hidden'); // 分类模式下隐藏重置按钮
        renderPostList(allPosts.filter(p => p.category === filterCat), true);
    } 
    // 场景 B: 搜索结果视图
    else if (input.value.trim()) {
        const kw = input.value.toLowerCase().trim();
        label.classList.remove('hidden');
        name.innerText = `搜索: "${input.value}"`;
        document.querySelector('#current-filter-label button').classList.remove('hidden'); // 搜索模式下显示重置按钮
        renderPostList(allPosts.filter(p => p.title.toLowerCase().includes(kw) || p.file.toLowerCase().includes(kw)), true);
    }
    // 场景 C: 默认首页 (所有文章)
    else {
        label.classList.add('hidden');
        renderPostList(allPosts, false);
    }
    window.scrollTo(0, 0);
}

/**
 * =============================================================================
 * 6. 核心交互功能模块 (搜索/恢复/跳转)
 * =============================================================================
 */

/**
 * 清除搜索/筛选状态
 * [核心逻辑]：依次尝试返回 文章 -> 分类 -> 首页
 */
function clearFilter() {
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-clear').classList.add('hidden');
    
    // 优先级 1: 如果之前在看文章，跳回文章
    if (lastReadPostPath) {
        window.location.hash = '#/' + lastReadPostPath;
    } 
    // 优先级 2: 如果之前在看分类，跳回分类
    else if (lastSearchCategory) {
        window.location.hash = '#/' + lastSearchCategory;
    } 
    // 优先级 3: 默认回到路由判断
    else {
        router(); 
    }
}

/**
 * 强制回到首页
 * [注意]：此操作会清除所有历史记忆
 */
function goHome() {
    currentPostFile = null;  
    currentRoutePath = '';
    
    // 彻底清空记忆变量
    lastReadPostPath = null;
    lastSearchCategory = null;

    // 清空搜索框
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.add('hidden');
    
    // 跳转逻辑
    if (window.location.hash === '#/' || window.location.hash === '') renderHome();
    else window.location.hash = '#/';
}

/**
 * =============================================================================
 * 7. 事件绑定模块
 * =============================================================================
 */

function setupEvents() {
    const input = document.getElementById('search-input');
    
    // --- 搜索框输入监听 (包含状态记录与恢复逻辑) ---
    input.addEventListener('input', () => {
        const val = input.value.trim();
        const hash = window.location.hash;

        // 1. [状态记录]：当开始输入时，记录当前所在位置
        if (hash !== '#/' && val) {
            // 如果正在阅读文章，记录文章路径
            if (currentRoutePath && currentPostFile) {
                lastReadPostPath = currentRoutePath;
            } 
            // 如果在浏览分类 (且不是文章)，记录分类名称
            else if (!currentPostFile && hash.length > 2) {
                lastSearchCategory = decodeURIComponent(hash.slice(2));
            }
        }

        // 2. [状态恢复]：当清空输入时，尝试自动跳回原来的位置
        if (!val) {
            document.getElementById('search-clear').classList.add('hidden');
            if (lastReadPostPath) {
                window.location.hash = '#/' + lastReadPostPath;
            } else if (lastSearchCategory) {
                window.location.hash = '#/' + lastSearchCategory;
            } else {
                if (window.location.hash !== '#/') window.location.hash = '#/';
                else renderHome();
            }
            return;
        }

        // 3. [搜索模式]：有输入时，强制切换路由到首页容器以显示搜索结果
        if (window.location.hash !== '#/') {
            window.location.hash = '#/';
        } else {
            renderHome();
        }
        document.getElementById('search-clear').classList.remove('hidden');
    });

    // --- 主题切换 (暗黑/明亮) ---
    document.getElementById('theme-toggle').onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
    };

    // --- 回到顶部按钮 ---
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('back-to-top');
        if (window.scrollY > 400) btn.classList.remove('opacity-0', 'translate-y-20', 'pointer-events-none');
        else btn.classList.add('opacity-0', 'translate-y-20', 'pointer-events-none');
    });
}

/**
 * =============================================================================
 * 8. 文章详情加载模块
 * =============================================================================
 */

async function loadPost(postInfo, query) {
    // 进入新文章时，重置记忆状态
    lastReadPostPath = null; 
    lastSearchCategory = null; 
    
    const contentArea = document.getElementById('article-content');
    
    // 切换到文章详情视图
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('article-view').classList.remove('hidden');
    contentArea.innerHTML = `<div class="py-20 text-center animate-pulse">正在加载...</div>`;
    document.getElementById('toc-container').innerHTML = '';
    
    // 更新当前路由记录
    tocData = []; 
    currentRoutePath = postInfo.url_path;

    try {
        // 获取 Markdown 内容
        const res = await fetch(PATH_CONFIG.postsDir + postInfo.file);
        const text = await res.text();
        const content = text.replace(/^\s*---[\s\S]*?---/, '');
        
        document.title = `${postInfo.title} - Chigengyi Blog`;

        // 构建日期显示
        let dateHtml = `<span>📅 发表于：${postInfo.date}</span>`;
        if (postInfo.lastupdate) dateHtml += `<span class="ml-3 pl-3 border-l border-slate-300 dark:border-slate-700">🔄 更新于：${postInfo.lastupdate}</span>`;

        // --- 构建版权信息卡片 HTML ---
        const currentLink = window.location.href; // 获取当前页面完整链接
        const authorName = "Chigengyi"; //在这里修改你的名字
        
        const copyrightHtml = `
            <div class="mt-12 mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-slate-800/50 dark:border-slate-700 relative overflow-hidden group">
                <!-- 右上角装饰图标 -->
                <div class="absolute -right-6 -top-6 text-blue-500 opacity-5 text-9xl font-serif select-none pointer-events-none rotate-12 group-hover:opacity-10 transition-opacity">C</div>
                
                <div class="relative z-10 space-y-3 text-sm">
                    <!-- 作者 -->
                    <div class="flex items-center gap-2">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <span class="font-bold text-slate-600 dark:text-slate-300">文章作者：</span>
                        <span class="text-slate-700 dark:text-slate-200 font-medium hover:text-primary transition cursor-pointer">${authorName}</span>
                    </div>

                    <!-- 链接 -->
                    <div class="flex items-start gap-2">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30 mt-0.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        </div>
                        <span class="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">文章链接：</span>
                        <a href="${currentLink}" class="text-primary hover:underline break-all">${currentLink}</a>
                    </div>

                    <!-- 版权 -->
                    <div class="flex items-start gap-2">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30 mt-0.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <span class="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">版权声明：</span>
                        <span class="text-slate-500 dark:text-slate-400">
                            本博客所有文章除特别声明外，均采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh" target="_blank" class="text-primary hover:underline">CC BY-NC-SA 4.0</a> 许可协议。转载请注明来自 <a href="#/" class="text-primary hover:underline">Chigengyi Blog</a>！
                        </span>
                    </div>
                </div>
            </div>
        `;

        // 渲染文章头部 + Markdown 内容 + 版权卡片
        contentArea.innerHTML = `
            <div class="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
                <a href="javascript:goHome()" class="text-sm text-primary hover:underline mb-4 flex items-center gap-1">&larr; 返回首页</a>
                <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight">${postInfo.title}</h1>
                <div class="flex flex-wrap gap-4 text-sm text-slate-500 items-center">
                    ${dateHtml}
                    <a href="#/${postInfo.category}" class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded hover:text-primary transition">📂 ${postInfo.category}</a>
                </div>
            </div>
            <div class="markdown-body prose prose-slate lg:prose-lg dark:prose-invert max-w-none">
                ${marked.parse(content)}
            </div>
            ${copyrightHtml} <!-- 插入版权卡片 -->
        `;

        renderToc(postInfo.url_path);
        if (query) setTimeout(() => handleScroll(query), 300); 
        renderPostNavigation(postInfo);
        addCopyButtons();
        setupTocObserver();
    } catch (e) { console.error(e); }
    window.scrollTo(0, 0);
}

/**
 * =============================================================================
 * 9. UI 组件渲染函数
 * =============================================================================
 */

// 渲染侧边栏分类列表
function renderCategories() {
    const catCount = {};
    allPosts.forEach(p => { const c = p.category || '未分类'; catCount[c] = (catCount[c] || 0) + 1; });
    const list = document.getElementById('category-list');
    let html = `<a href="#/" onclick="goHome()" class="flex justify-between items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group font-medium text-slate-700 dark:text-slate-300">全部文章<span class="bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] px-1.5 rounded-full">${allPosts.length}</span></a>`;
    Object.keys(catCount).forEach(cat => {
        html += `<a href="#/${cat}" class="flex justify-between items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group">
                    <span class="text-slate-600 dark:text-slate-400 group-hover:text-primary">${cat}</span>
                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] px-1.5 rounded-full">${catCount[cat]}</span>
                </a>`;
    });
    list.innerHTML = html;
}

// 渲染详情页侧边栏目录 (TOC)
function renderToc(urlPath) {
    const container = document.getElementById('toc-container');
    container.innerHTML = tocData.length ? tocData.map(i => `<a href="#/${urlPath}?anchor=${i.id}" class="toc-link block py-1.5 pr-2 border-l-2 border-transparent hover:border-slate-400 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition text-xs truncate" style="padding-left:${(i.depth-1)*12+10}px">${i.text}</a>`).join('') : `<div class="text-xs text-slate-400 italic pl-4">暂无目录</div>`;
}

// 处理 URL 查询参数中的锚点跳转
function handleScroll(query) {
    if (!query) return;
    const anchor = new URLSearchParams(query).get('anchor');
    if (anchor) {
        const decodedAnchor = decodeURIComponent(anchor);
        const el = document.getElementById(decodedAnchor);
        if (el) { el.scrollIntoView({ behavior: 'smooth' }); updateActiveToc(decodedAnchor); }
    }
}

// 更新目录高亮状态
function updateActiveToc(id) {
    document.querySelectorAll('.toc-link').forEach(l => {
        const decodedHref = decodeURIComponent(l.getAttribute('href'));
        l.classList.toggle('active', decodedHref.includes(`anchor=${id}`));
    });
}

// 渲染文章底部 上一篇/下一篇 导航
function renderPostNavigation(post) {
    const idx = allPosts.findIndex(p => p.file === post.file);
    const find = (dir) => {
        let i = idx + dir;
        // 查找同分类下的相邻文章
        while(i >= 0 && i < allPosts.length) { if (allPosts[i].category === post.category) return allPosts[i]; i += dir; }
        return allPosts[idx + dir]; // 如果同分类没找到，找绝对相邻的
    };
    const o = find(1), n = find(-1);
    document.getElementById('post-nav').innerHTML = `${o ? `<a href="#/${o.url_path}" class="block p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary transition group text-left"><div class="text-xs text-slate-400 mb-1">← 上一篇</div><div class="font-bold truncate">${o.title}</div></a>` : `<div class="p-4 rounded-lg border border-dashed text-slate-400 text-xs">没有更多了</div>`}${n ? `<a href="#/${n.url_path}" class="block p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary transition group text-right"><div class="text-xs text-slate-400 mb-1">下一篇 →</div><div class="font-bold truncate">${n.title}</div></a>` : `<div class="p-4 rounded-lg border border-dashed text-slate-400 text-right text-xs">已经是最新</div>`}`;
}

// 为代码块添加复制按钮
function addCopyButtons() {
    document.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;
        const btn = document.createElement('button'); btn.className = 'copy-btn'; btn.innerText = 'Copy';
        btn.onclick = () => {
            const codeText = pre.querySelector('code')?.innerText || pre.innerText;
            navigator.clipboard.writeText(codeText).then(() => { btn.innerText = 'Copied!'; setTimeout(() => { btn.innerText = 'Copy'; }, 2000); });
        };
        pre.appendChild(btn);
    });
}

// 监听滚动以自动高亮 TOC
function setupTocObserver() {
    const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) updateActiveToc(e.target.id); }); }, { rootMargin: '-100px 0px -60% 0px' });
    document.querySelectorAll('h1[id], h2[id], h3[id]').forEach(h => obs.observe(h));
}

// 打开/关闭图片灯箱
function openLightbox(s) { const l = document.getElementById('lightbox'); l.querySelector('img').src = s; l.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('lightbox').classList.remove('active'); document.body.style.overflow = ''; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// 启动程序
init();