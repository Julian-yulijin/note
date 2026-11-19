---
title: 如何创建hexo博客
date: 2026-11-18 23:28:41
categories: 学习笔记
tags: [Hexo, 博客]
---
已按要求只调整结构、层级与排版，内容未增删（重复的步骤已合并到对应方法下）。

---

# Hexo 博客：从创建到部署上线

> **前提**：已在 Hexo 官网下载 Hexo，已安装 Node.js 和 npm，已安装 Hexo CLI，已安装 Git。

## 一、创建博客项目

在 VS Code 的终端中输入：

```powershell
hexo init 新项目的文件夹名称
```

**命令解析**

| 部分 | 含义 |
| --- | --- |
| `hexo` | 调用 Hexo 命令行程序 |
| `init` | 初始化一个新的 Hexo 项目，也就是创建博客项目的基础结构 |
| `新项目的文件夹名称` | 新项目的文件夹名称 |

这条命令会让 Hexo 创建一个博客项目。

## 二、创建一篇博客文章

```powershell
npx hexo new "我的第一篇博客"
```

**命令解析**

| 部分 | 含义 |
| --- | --- |
| `npx` | Node.js 生态提供的命令工具，用于运行 npm 软件包提供的程序 |
| `hexo` | 指定要运行的 Hexo 命令行程序 |
| `new` | Hexo 的子命令，表示创建一篇新文章 |
| `"我的第一篇博客"` | 传递给 `new` 命令的文章标题。双引号将标题作为一个完整参数传入 |

整条命令的意思是：使用 Hexo 创建一篇标题为“我的第一篇博客”的文章。

执行成功后，通常会在 `source/_posts/` 中看到对应的 Markdown 文件。

## 三、具体书写一篇文章

打开：

`source/_posts/我的第一篇博客.md`

示例内容：

```markdown
# 我的第一篇博客

这是我使用 Hexo 创建的第一篇文章。

今天，我开始学习搭建自己的博客网站。
```

这里的 `.md` 是 Markdown 文件的扩展名。Markdown 是一种用简单符号表示标题、列表、加粗等格式的文本写法。

## 四、部署上线

下面是这些步骤之后的完整操作顺序。

### 4.1 本地构建自检

```powershell
hexo clean
hexo generate
```

确认 `public/index.html` 存在，说明能正常构建。

### 4.2 修改 `_config.yml`

至少改这几项：

```yaml
# 关键：按仓库名决定

# 用户站点
url: https://<用户名>.github.io
root: /

# 项目站点
url: https://<用户名>.github.io/<仓库名>
root: /<仓库名>/
```

修改原因：修改 url 是为了让网站路径能够对应，修改 root 则是为了在具体的小文件中能够找到具体的分支路径。

### 4.3 添加部署工作流

将文件编译成 HTML/CSS，并让 GitHub Pages 能够读取这些文件。

#### 方法 A：GitHub Actions（在云端进行构建）

新建 `.github/workflows/pages.yml`。

添加该文件的目的：定义「装环境 → 构建 → 打包 → 发布」的流水线。GitHub Pages 自己不会跑 Hexo，必须有人告诉它怎么构建。

```yaml
name: Deploy Hexo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx hexo generate
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**步骤 1：在 GitHub 网页建仓库**

`New repository` → 填仓库名 → 选 **Public** → **不要**勾选 README、.gitignore、license → `Create repository`。

**步骤 2：初始化 git 并推送**

```powershell
git init -b main
git add .
git commit -m "init blog"
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

**步骤 3：确认 Pages 已启用**

`Settings` → 左侧 `Pages` → `Build and deployment` → `Source` 应为 **GitHub Actions**。

如果显示 `Deploy from a branch`，改成 GitHub Actions 并保存。

**步骤 4：等待构建并访问**

- 仓库 `Actions` 页看到绿色勾 = 构建发布成功
- 访问 `https://<用户名>.github.io/<仓库名>/`

#### 方法 B：hexo-deployer-git

特点：项目本身不需要 `git init`，产物推到另一个分支。

**步骤 1：安装部署插件**

```powershell
npm install hexo-deployer-git --save
```

**步骤 2：在 `_config.yml` 末尾加部署配置**

```yaml
deploy:
  type: git
  repo: https://github.com/<用户名>/<仓库名>.git
  branch: gh-pages
```

目标仓库若是 `<用户名>.github.io`，把 `branch` 改成 `main`。

**步骤 3：在 GitHub 建仓库**

`New repository` → **Public** → 不勾选任何初始化文件 → 创建。记住仓库地址。

**步骤 4：首次构建并部署**

```powershell
npx hexo clean
npx hexo generate
npx hexo deploy
```

执行后项目里会多出 `.deploy_git` 文件夹，推送成功会显示 `INFO  Deploy done: git`。

若弹窗要求输入密码，填 GitHub Personal Access Token，不是登录密码。

**步骤 5：设置 Pages 来源**

仓库页 → `Settings` → `Pages` → `Build and deployment`

- `Source`：Deploy from a branch
- `Branch`：选 `gh-pages`（或你配置的 main），目录选 `/ (root)`
- 点 `Save`

**步骤 6：等待 1–2 分钟，访问**

`https://<用户名>.github.io/<仓库名>/`

## 五、部署后的日常更新

### 方法 A 的日常循环

```powershell
npx hexo new "文章标题"
# 编辑 source/_posts/文章标题.md
git add . && git commit -m "post: 文章标题" && git push
```

不需要执行 `hexo deploy`，push 后云端自动构建。

### 方法 B 的日常循环

```powershell
npx hexo clean
npx hexo generate
npx hexo deploy
```

## 六、判断规则

判断规则再强调一次：仓库名是 `<用户名>.github.io` 就用 `root: /`；其他名字一律 `root: /仓库名/`。
