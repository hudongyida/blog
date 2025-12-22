# 项目原地址
https://github.com/clgzyh/blog
# 🚀 Chigengyi Blog - 极简自动化个人博客系统

一个基于 **Markdown + GitHub Actions** 的高性能、单页应用（SPA）架构个人博客。无需后端服务器，无需数据库，推送到 Git 即可全自动发布。

![Display](https://img.shields.io/badge/Architecture-SPA-blue)
![Language](https://img.shields.io/badge/Language-Javascript%20%2F%20Python-orange)
![Deployment](https://img.shields.io/badge/Deployment-GitHub%20Actions-green)
![RSS](https://img.shields.io/badge/RSS-2.0-orange)

---

## ✨ 核心特性

### 🎨 界面与交互
- **🌗 深色/浅色模式**：支持系统级检测及手动一键切换，平滑过渡动画。
- **🧠 智能状态记忆**：搜索或分类筛选退出后，**自动返回**之前的阅读位置（文章详情或分类视图），拒绝强制跳回首页的割裂感。
- **🔍 实时搜索**：顶部导航栏集成横向搜索框，支持标题与文件名的模糊匹配。
- **🖼️ 图片灯箱**：正文图片支持点击全屏放大（Lightbox），沉浸式查看细节。

### 📚 阅读体验
- **📂 自动分类**：自动识别 Markdown 头部 `categories` 标签，生成侧边栏分类统计。
- **📑 动态目录**：文章详情页左侧自动生成 TOC 目录，支持滚动监听与当前章节高亮。
- **©️ 版权信息卡片**：文章底部自动生成美观的版权声明卡片，自动获取当前链接与作者信息。
- **📋 代码增强**：代码块支持语法高亮，右上角提供“一键复制”按钮。

### ⚙️ 系统与自动化
- **📡 RSS 订阅**：自动生成符合 RFC 822 标准的 `rss.xml`，支持自定义域名，完美兼容 Feedly 等阅读器。
- **🔗 语义化路由**：采用 Hash 路由（`#/Category/PostName`），URL 结构清晰，便于分享与 SEO。
- **⚡ 极致性能**：基于 `fetch` 动态加载文章，纯静态资源托管，加载速度极快。
- **🤖 全自动部署**：集成 GitHub Actions，Push 代码后自动运行生成脚本并发布到 GitHub Pages。

---

## 📂 项目结构

```text
/MyBlog
├── .github/workflows/  # GitHub Actions 自动化部署配置
├── _posts/             # 【核心】存放所有的 .md 文章
├── assets/             # 【核心】静态资源目录
│   ├── css/            # 样式文件 (style.css)
│   ├── js/             # 核心逻辑 (main.js)
│   └── img/            # 图片文件夹（建议与文章名对应）
│       └── logo.png    # 网站图标 (Favicon)
├── index.html          # 前端入口文件
├── generate.py         # 自动化脚本：生成 config.json 和 rss.xml
├── clean_assets.py     # 辅助脚本：清理未被引用的图片资源
├── config.json         # [自动生成] 文章索引数据
├── rss.xml             # [自动生成] RSS 订阅文件
└── CNAME               # 你的自定义域名配置
```

---

## 🛠️ 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/你的用户名/你的仓库名.git
cd 你的仓库名
```

### 2. 个性化配置 (重要)

#### 配置 RSS 域名
打开 `generate.py`，修改 `BLOG_BASE_URL` 为你的实际访问域名（推荐使用自定义域名）：
```python
# 末尾不要带 /
BLOG_BASE_URL = 'https://blog.yourdomain.com' 
```

#### 配置作者名称
打开 `assets/js/main.js`，搜索 `loadPost` 函数，修改版权卡片中的作者名：
```javascript
const authorName = "Chigengyi"; // 修改为你的名字
```

### 3. 本地运行
1.  **生成索引与数据**：
    在根目录运行脚本：
    ```bash
    python generate.py
    ```
    *提示：本地运行时该脚本会进入监听模式，修改 Markdown 文件后会自动更新索引。*
2.  **启动预览**：
    *   安装插件：`Live Server` By Ritwick Dey
    *   在 VS Code 中右键点击 `index.html`，选择 **"Open with Live Server"**。

---

## ✍️ 创作流程 (Workflow)

### 第一步：撰写文章
在 `_posts` 文件夹下新建 `.md` 文件，推荐命名格式：`YYYY-MM-DD-英文文件名.md`。
**必须包含 Front Matter 头部信息：**

```yaml
---
title: "这里是文章标题"
date: 2025-12-20
categories: Kubernetes
lastupdate: 2025-12-21  # 可选：最后更新时间
draft: false            # 可选：设为 true 则不会在博客及 RSS 中显示
---

> 这里写文章的摘要，会显示在首页列表。

## 正文开始
...
```

### 第二步：插入图片
1.  将图片放入 `assets/img/` 目录（建议按文章建立子文件夹）。
2.  在 Markdown 中直接引用：
    ```markdown
    ![图片描述](../assets/img/你的文件夹/图片名.png)
    ```
    *系统会自动处理 `../` 路径，确保图片在首页和详情页均能正常显示。*

### 第三步：发布上线
```bash
git add .
git commit -m "New post: Add Kubernetes guide"
git push
```
等待约 1 分钟，GitHub Actions 构建完成后即可访问。

---

## 🧹 资源清理工具

项目包含一个智能清理脚本 `clean_assets.py`，用于删除 `assets/img` 中**未被任何文章引用**的图片，保持仓库轻量。

**运行方式：**
```bash
python clean_assets.py
```

**⚠️ 注意事项：**
如果有些图片（如 Logo、背景图）只在 HTML/CSS 中引用而不在 Markdown 中引用，请务必将其添加到脚本内的 `WHITELIST` 变量中，否则会被误删。

```python
# clean_assets.py
WHITELIST = [
    'css', 'js', 'favicon.ico', 'logo.png', 'avatar.jpg' 
]
```

---

## 📜 许可证

本项目基于 MIT 协议开源。欢迎克隆、修改并部署属于你自己的博客！

---
**Chigengyi Blog** - *Stay hungry, Stay foolish.*