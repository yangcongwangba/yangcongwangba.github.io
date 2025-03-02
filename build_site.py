#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub Pages博客静态站点生成器
这个脚本将Markdown文件转换为HTML并应用模板
"""

import os
import sys
import shutil
import yaml
import markdown
import frontmatter
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import re

# 配置路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BASE_DIR, '_posts')
LAYOUTS_DIR = os.path.join(BASE_DIR, '_layouts')
OUTPUT_DIR = os.path.join(BASE_DIR, '_site')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
I18N_DIR = os.path.join(BASE_DIR, '_i18n')

# 创建Jinja2环境
env = Environment(loader=FileSystemLoader(LAYOUTS_DIR))

def ensure_dir(directory):
    """确保目录存在，不存在则创建"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def load_config():
    """加载配置文件"""
    config_path = os.path.join(BASE_DIR, '_config.yml')
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}

def copy_assets():
    """复制静态资源"""
    print("复制静态资源...")
    output_assets = os.path.join(OUTPUT_DIR, 'assets')
    ensure_dir(output_assets)
    
    if os.path.exists(ASSETS_DIR):
        for item in os.listdir(ASSETS_DIR):
            src = os.path.join(ASSETS_DIR, item)
            dst = os.path.join(output_assets, item)
            if os.path.isdir(src):
                # 递归复制目录
                if os.path.exists(dst):
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
            else:
                # 复制文件
                shutil.copy2(src, dst)

def copy_root_files():
    """复制根目录下的HTML、CSS和JS文件"""
    print("复制根目录文件...")
    for item in os.listdir(BASE_DIR):
        if item.endswith(('.html', '.css', '.js', '.json', '.xml', '.txt')):
            src = os.path.join(BASE_DIR, item)
            dst = os.path.join(OUTPUT_DIR, item)
            if os.path.isfile(src):
                shutil.copy2(src, dst)

def process_post(post_path, config):
    """处理单个博客文章"""
    print(f"处理文章: {os.path.basename(post_path)}")
    
    # 解析文章内容和元数据
    with open(post_path, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)
    
    # 使用markdown转换内容
    md = markdown.Markdown(extensions=['extra', 'codehilite', 'meta', 'toc'])
    content_html = md.convert(post.content)
    
    # 确定使用的模板
    layout = post.get('layout', 'post')
    template = env.get_template(f"{layout}.html")
    
    # 构建文章URL和输出路径
    date_str = post.get('date', datetime.now().strftime('%Y-%m-%d'))
    if isinstance(date_str, datetime):
        date_str = date_str.strftime('%Y-%m-%d')
    
    # 提取日期部分
    date_match = re.match(r'(\d{4}-\d{2}-\d{2})', date_str)
    if date_match:
        date_part = date_match.group(1)
    else:
        date_part = datetime.now().strftime('%Y-%m-%d')
    
    year, month, day = date_part.split('-')
    
    # 获取文章slug
    filename = os.path.basename(post_path)
    slug = os.path.splitext(filename)[0]
    
    # 如果文件名包含日期，移除日期部分获取真正的slug
    slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', slug)
    
    # 构建输出目录
    post_url = f"{year}/{month}/{day}/{slug}.html"
    output_path = os.path.join(OUTPUT_DIR, year, month, day)
    ensure_dir(output_path)
    
    # 渲染模板
    context = {
        'page': post.metadata,
        'content': content_html,
        'site': config,
        'url': f"/{post_url}"
    }
    rendered = template.render(**context)
    
    # 写入输出文件
    with open(os.path.join(output_path, f"{slug}.html"), 'w', encoding='utf-8') as f:
        f.write(rendered)
    
    return post.metadata, post_url

def process_posts(config):
    """处理所有博客文章"""
    print("处理博客文章...")
    
    posts = []
    
    if os.path.exists(POSTS_DIR):
        for filename in os.listdir(POSTS_DIR):
            if filename.endswith(('.md', '.markdown')):
                post_path = os.path.join(POSTS_DIR, filename)
                metadata, url = process_post(post_path, config)
                posts.append({
                    'metadata': metadata,
                    'url': url
                })
    
    return posts

def process_pages():
    """处理静态页面"""
    print("处理静态页面...")
    
    pages_dir = os.path.join(BASE_DIR, '_pages')
    if not os.path.exists(pages_dir):
        return
    
    for filename in os.listdir(pages_dir):
        if filename.endswith(('.md', '.markdown')):
            page_path = os.path.join(pages_dir, filename)
            
            # 解析页面内容和元数据
            with open(page_path, 'r', encoding='utf-8') as f:
                page = frontmatter.load(f)
            
            # 使用markdown转换内容
            md = markdown.Markdown(extensions=['extra', 'codehilite', 'meta', 'toc'])
            content_html = md.convert(page.content)
            
            # 确定使用的模板
            layout = page.get('layout', 'page')
            template = env.get_template(f"{layout}.html")
            
            # 获取页面slug和输出路径
            slug = os.path.splitext(filename)[0]
            permalink = page.get('permalink', f"{slug}.html")
            
            # 解析输出目录
            output_path = os.path.join(OUTPUT_DIR, os.path.dirname(permalink))
            ensure_dir(output_path)
            
            # 渲染模板
            context = {
                'page': page.metadata,
                'content': content_html,
                'site': load_config()
            }
            rendered = template.render(**context)
            
            # 写入输出文件
            output_file = os.path.join(OUTPUT_DIR, permalink)
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(rendered)

def process_diary_template():
    """处理日记模板相关内容"""
    print("处理日记模板...")
    
    # 复制日记模板和相关CSS到输出目录
    diary_dir = os.path.join(OUTPUT_DIR, 'diary')
    ensure_dir(diary_dir)
    
    # 复制diary.html到输出目录
    src_diary = os.path.join(BASE_DIR, 'diary.html')
    dst_diary = os.path.join(OUTPUT_DIR, 'diary.html')
    if os.path.exists(src_diary):
        shutil.copy2(src_diary, dst_diary)

def process_private_content():
    """处理私密内容相关页面"""
    print("处理私密内容页面...")
    
    # 复制private.html到输出目录
    src_private = os.path.join(BASE_DIR, 'private.html')
    dst_private = os.path.join(OUTPUT_DIR, 'private.html')
    if os.path.exists(src_private):
        shutil.copy2(src_private, dst_private)

def copy_admin_panel():
    """复制管理后台"""
    print("复制管理后台...")
    
    src_admin = os.path.join(BASE_DIR, 'admin')
    dst_admin = os.path.join(OUTPUT_DIR, 'admin')
    
    if os.path.exists(src_admin):
        if os.path.exists(dst_admin):
            shutil.rmtree(dst_admin)
        shutil.copytree(src_admin, dst_admin)

def build_site():
    """构建整个站点"""
    print("开始构建站点...")
    
    # 确保输出目录存在
    ensure_dir(OUTPUT_DIR)
    
    # 加载配置
    config = load_config()
    
    # 复制静态资源
    copy_assets()
    
    # 复制根目录文件
    copy_root_files()
    
    # 处理博客文章
    posts = process_posts(config)
    
    # 处理静态页面
    process_pages()
    
    # 处理日记模板
    process_diary_template()
    
    # 处理私密内容页面
    process_private_content()
    
    # 复制管理后台
    copy_admin_panel()
    
    print("站点构建完成！")

if __name__ == "__main__":
    build_site() 