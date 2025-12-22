import os
import json
import re
import time
import sys
import datetime
import email.utils
from xml.sax.saxutils import escape

# 导入 markdown 库，用于 RSS 全文生成
try:
    import markdown
except ImportError:
    print("提示: 未安装 markdown 库，RSS 将只包含摘要。")
    print("请运行: pip install markdown")
    markdown = None

# 强制将标准输出设置为 UTF-8
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# --- 配置区域 ---
POSTS_DIR = '_posts'
OUTPUT_FILE = 'config.json'
RSS_FILE = 'rss.xml'

# 【重要】请修改为你的博客实际线上地址，末尾不要带 /
BLOG_BASE_URL = 'https://blog.chigengyi.cn' 

# 博客基本信息
BLOG_TITLE = "Chigengyi Blog"
BLOG_DESC = "分享技术，记录生活"

def parse_front_matter(content):
    """解析 Markdown 头部的 YAML"""
    pattern = r'^\s*---\s+(.*?)\s+---'
    match = re.search(pattern, content, re.DOTALL | re.MULTILINE)
    if match:
        yaml_text = match.group(1)
        data = {}
        for line in yaml_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                clean_value = value.strip().strip('"').strip("'").strip('[').strip(']')
                if clean_value.lower() == 'true': clean_value = True
                elif clean_value.lower() == 'false': clean_value = False
                data[key.strip()] = clean_value
        return data
    return {}

def extract_summary(content):
    """提取摘要"""
    body = re.sub(r'^\s*---\s+(.*?)\s+---', '', content, flags=re.DOTALL | re.MULTILINE).strip()
    quote_match = re.search(r'((?:^>.*(?:\n|$))+)', body, re.MULTILINE)
    if quote_match:
        raw_summary = quote_match.group(1)
        clean_summary = re.sub(r'^>\s?', '', raw_summary, flags=re.MULTILINE)
    else:
        clean_summary = body[:200]
    clean_summary = re.sub(r'!\[.*?\]\(.*?\)', '', clean_summary)
    clean_summary = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', clean_summary)
    clean_summary = re.sub(r'<[^>]+>', '', clean_summary)
    clean_summary = re.sub(r'[#*`~]', '', clean_summary)
    final_summary = ' '.join(clean_summary.split())
    if not quote_match and len(final_summary) > 120:
        return final_summary[:120] + '...'
    return final_summary

def format_rfc822_date(date_str):
    try:
        dt = datetime.datetime.strptime(date_str, '%Y-%m-%d')
        return email.utils.format_datetime(dt)
    except Exception:
        return email.utils.formatdate(usegmt=True)

def generate_rss(posts):
    """生成 RSS 2.0 XML 文件 (含全文)"""
    print(f"[RSS] 正在生成 {RSS_FILE} ...", end="")
    
    # RSS 头部：必须添加 xmlns:content 才能支持全文
    rss_content = [
        '<?xml version="1.0" encoding="UTF-8" ?>',
        '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
        '<channel>',
        f'  <title>{escape(BLOG_TITLE)}</title>',
        f'  <link>{BLOG_BASE_URL}</link>',
        f'  <description>{escape(BLOG_DESC)}</description>',
        f'  <lastBuildDate>{email.utils.formatdate(usegmt=True)}</lastBuildDate>',
        f'  <generator>Chigengyi Blog Generator</generator>'
    ]

    for post in posts:
        if not post.get('title'): continue

        link = f"{BLOG_BASE_URL}/#/{post['url_path']}"
        
        # 准备全文 HTML
        full_content_html = ""
        if markdown:
            # 1. 读取原文
            try:
                with open(os.path.join(POSTS_DIR, post['file']), 'r', encoding='utf-8') as f:
                    raw_text = f.read()
                # 2. 去掉 Front Matter
                body_text = re.sub(r'^\s*---\s+(.*?)\s+---', '', raw_text, flags=re.DOTALL | re.MULTILINE).strip()
                
                # 3. 【关键】替换相对图片路径为绝对路径
                # 将 ../assets/img/... 替换为 https://blog.chigengyi.cn/assets/img/...
                # RSS 阅读器无法解析相对路径，必须用绝对路径
                body_text = body_text.replace('../assets', f'{BLOG_BASE_URL}/assets')
                body_text = body_text.replace('./assets', f'{BLOG_BASE_URL}/assets')

                # 处理放在 _posts/attachments 下的附件（例如 _posts/attachments/123.png）
                # 目标：
                # - 在 Markdown 中写 attachments/xxx.png 或 attachments/dir/xxx.png
                #   -> 映射为 /_posts/attachments/... 的绝对 URL
                # - 支持 ./attachments/ 以及 ../attachments/ 这种相对写法
                # - 如果写成 _posts/attachments/... 也统一转为站点绝对 URL

                def _map_paren(match):
                    p = match.group('path')
                    p_clean = re.sub(r'^(?:\./|\.\./)+', '', p)
                    if p_clean.startswith('_posts/'):
                        return '(' + f'{BLOG_BASE_URL}/' + p_clean + ')'
                    if p_clean.startswith('attachments/'):
                        return '(' + f'{BLOG_BASE_URL}/_posts/' + p_clean + ')'
                    return '(' + f'{BLOG_BASE_URL}/' + p_clean + ')'

                # 替换形如 (...attachments/xxx...) 的括号内路径（处理图片和链接）
                body_text = re.sub(r'\((?P<path>(?:\./|\.\./)?(?:_posts/)?attachments/[^)\s]+)\)', _map_paren, body_text)

                # 替换整行只有 attachments/... 的情况（例如在文档中直接粘贴的路径），映射为绝对 URL
                body_text = re.sub(r'(?m)^(?P<p>(?:\./|\.\./)?attachments/[^\s]+)$',
                                   lambda m: BLOG_BASE_URL + '/_posts/' + re.sub(r'^(?:\./|\.\./)+', '', m.group('p')),
                                   body_text)

                # 一个保守的全局替换：如果出现未带协议的 'attachments/' 前缀，映射为站点下的 _posts/attachments/
                # 但避免替换已经是绝对 URL（包含 '://'）的情况
                body_text = re.sub(r'(?<!://)(?:\./|\.\./)?attachments/', f'{BLOG_BASE_URL}/_posts/attachments/', body_text)
                
                # 4. 转为 HTML
                full_content_html = markdown.markdown(body_text, extensions=['fenced_code', 'tables'])
            except Exception as e:
                print(f" [Warn: 转换HTML失败 {post['file']}: {e}]")

        rss_content.append('  <item>')
        rss_content.append(f'    <title>{escape(post["title"])}</title>')
        rss_content.append(f'    <link>{link}</link>')
        rss_content.append(f'    <guid>{link}</guid>')
        rss_content.append(f'    <description>{escape(post["summary"])}</description>')
        # 添加全文模块 (CDATA 包裹防止 HTML 破坏 XML 结构)
        if full_content_html:
            rss_content.append(f'    <content:encoded><![CDATA[{full_content_html}]]></content:encoded>')
        rss_content.append(f'    <pubDate>{format_rfc822_date(post["date"])}</pubDate>')
        rss_content.append(f'    <category>{escape(post["category"])}</category>')
        rss_content.append('  </item>')

    rss_content.append('</channel>')
    rss_content.append('</rss>')

    try:
        with open(RSS_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(rss_content))
        print(" [OK]")
    except Exception as e:
        print(f" [Error: {e}]")

def generate_config():
    print(f"[Run] 检测到变动，正在更新 {OUTPUT_FILE} ...", end="")
    posts = []
    
    if not os.path.exists(POSTS_DIR):
        print("\n[Error] 找不到 _posts 文件夹")
        return

    files = [f for f in os.listdir(POSTS_DIR) if f.endswith('.md')]
    
    for filename in files:
        filepath = os.path.join(POSTS_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            meta = parse_front_matter(content)
            if meta.get('draft') is True: continue 
            category = meta.get('categories') or meta.get('category') or '未分类'
            if not meta.get('title'):
                clean_name = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', filename.replace('.md', ''))
                meta['title'] = clean_name.replace('-', ' ')
            if not meta.get('date'):
                date_match = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
                meta['date'] = date_match.group(1) if date_match else '2025-01-01'
            slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', filename).replace('.md', '')
            url_path = f"{category}/{slug}"

            posts.append({
                "title": meta.get('title'),
                "date": meta.get('date'),
                "lastupdate": meta.get('lastupdate'),
                "summary": extract_summary(content),
                "file": filename,
                "slug": slug,
                "category": category,
                "url_path": url_path
            })
        except Exception as e:
            print(f"\n[Error] 解析 {filename} 失败: {e}")

    posts.sort(key=lambda x: x['date'], reverse=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=4)
    print(" [OK]")
    generate_rss(posts)

def get_dir_mtime():
    mtime = 0
    if not os.path.exists(POSTS_DIR): return 0
    mtime = os.path.getmtime(POSTS_DIR)
    for f in os.listdir(POSTS_DIR):
        if f.endswith('.md'):
            path = os.path.join(POSTS_DIR, f)
            mtime = max(mtime, os.path.getmtime(path))
    return mtime

if __name__ == '__main__':
    generate_config()
    if os.getenv('GITHUB_ACTIONS'):
        print(">> 检测到 GitHub Actions 环境：配置生成完毕，脚本自动退出。")
        sys.exit(0)
    print(f"\n[Listen] 正在监听 {POSTS_DIR} 文件夹...")
    print("提示: 保持此窗口开启，修改文章后会自动更新 config.json 和 rss.xml")
    last_mtime = get_dir_mtime()
    try:
        while True:
            time.sleep(1)
            current_mtime = get_dir_mtime()
            if current_mtime != last_mtime:
                last_mtime = current_mtime
                generate_config()
    except KeyboardInterrupt:
        print("\n[Stop] 监听已停止。")