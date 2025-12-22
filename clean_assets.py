import os
import re
import shutil
import sys
import time
from urllib.parse import unquote

# 强制将标准输出设置为 UTF-8
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# --- 配置区域 ---
POSTS_DIR = '_posts'      # 文章文件夹
ASSETS_DIR = 'assets'     # 图片总文件夹
TRASH_DIR = '_trash'      # 回收站
# 白名单
WHITELIST = [
    'css', 'js', 'favicon.ico', 'avatar.jpg', 'logo.png', 'code'
]

def get_all_assets(base_dir):
    """获取 assets 文件夹下所有文件的相对路径列表"""
    file_list = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, start='.')
            rel_path = rel_path.replace('\\', '/')
            
            is_whitelisted = False
            for white in WHITELIST:
                if white in rel_path:
                    is_whitelisted = True
                    break
            
            if not is_whitelisted:
                file_list.append(rel_path)
    return set(file_list)

def get_referenced_assets(posts_dir):
    """扫描所有 Markdown 文件，提取图片引用"""
    referenced = set()
    img_pattern = re.compile(r'!\[.*?\]\((.*?)\)')
    html_pattern = re.compile(r'<img.*?src=["\'](.*?)["\']')

    if not os.path.exists(posts_dir):
        print(f"[!] 找不到文章目录: {posts_dir}")
        return referenced

    for filename in os.listdir(posts_dir):
        if filename.endswith('.md'):
            filepath = os.path.join(posts_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print(f"[!] 读取文件失败 {filename}: {e}")
                continue
                
            links = img_pattern.findall(content) + html_pattern.findall(content)
            for link in links:
                clean_link = unquote(link.split('?')[0].split('#')[0])
                if clean_link.startswith('http') or clean_link.startswith('//'):
                    continue
                clean_link = re.sub(r'^(\.\/|\/)', '', clean_link)
                
                possible_paths = []
                possible_paths.append(clean_link)
                if not clean_link.startswith(ASSETS_DIR + '/'):
                    possible_paths.append(f"{ASSETS_DIR}/{clean_link}")
                
                for p in possible_paths:
                    referenced.add(p)
    return referenced

def move_unused_files():
    print(">>> 正在扫描文件...")
    
    actual_files = get_all_assets(ASSETS_DIR)
    print(f"[扫描] 硬盘中发现 {len(actual_files)} 个资源文件")
    
    referenced_files = get_referenced_assets(POSTS_DIR)
    print(f"[分析] 文章中引用 {len(referenced_files)} 个链接")
    
    unused_files = []
    for actual in actual_files:
        if actual not in referenced_files:
            unused_files.append(actual)
            
    if not unused_files:
        print("[完成] 完美！没有发现未引用的图片。")
        return

    print(f"\n[清理] 发现 {len(unused_files)} 个未使用的文件，准备移动到 {TRASH_DIR}...")
    
    for file_path in unused_files:
        # --- 核心修改 ---
        # 1. file_path 是: assets/Folder/img.png
        # 2. 计算相对路径: Folder/img.png (去掉 assets 前缀)
        rel_path_in_assets = os.path.relpath(file_path, ASSETS_DIR)
        
        # 3. 拼接目标路径: _trash/Folder/img.png
        dest_path = os.path.join(TRASH_DIR, rel_path_in_assets)
        
        # 确保目标文件夹存在
        dest_dir = os.path.dirname(dest_path)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)

        try:
            print(f"移动: {file_path} -> {dest_path}")
            
            if os.path.exists(file_path):
                shutil.move(file_path, dest_path)
                
                # 删除原位置空文件夹
                parent_dir = os.path.dirname(file_path)
                if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                    os.rmdir(parent_dir)
                    print(f"删除空文件夹: {parent_dir}")
            else:
                print(f"[跳过] 文件不存在: {file_path}")
                
        except Exception as e:
            print(f"[错误] 移动失败: {file_path}, 原因: {e}")

    print("\n[完成] 清理结束！")
    print(f"提示: 未引用文件已移动到 '{TRASH_DIR}' (已去除顶层 assets 目录)。")

if __name__ == '__main__':
    move_unused_files()