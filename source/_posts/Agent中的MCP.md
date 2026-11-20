---
title: Agent中的MCP
date: 2026-11-19 16:01:13
categories: 人工智能与Agent
tags: [Agent, 工具]

---

# MCP（Model Context Protocol，模型上下文协议）

MCP（Model Context Protocol，模型上下文协议）是一种开放的、标准化的通信协议，用于在大语言模型应用与外部数据源、工具及服务之间建立统一的连接机制，使 AI 应用能够获取外部上下文、发现和调用外部工具，并实现不同 AI 应用与外部服务之间的互操作性。

可以理解为 MCP 是一种更具备规范化的、高度可迁移的通信机制（一定程度上类似于插件）。

## 一、定义中的关键词

这个定义中有几个关键词需要理解：

| 关键词 | 含义 |
| --- | --- |
| 开放协议 | 任何人都可以按照规范开发 MCP 客户端和服务端 |
| 标准化 | 不同开发者遵循统一的通信规则，意味着不同的 Agent 均可使用 |
| 通信协议 | 规定不同软件如何交换请求和响应，Agent 按照 MCP 的要求与之交换信息 |
| 外部数据源 | 数据库、文件、文档、知识库等 |
| 外部工具 | 搜索、计算、文件操作、数据库查询等 |
| 互操作性 | 不同兼容 MCP 的应用能够连接同一类 MCP 服务，只要适用 MCP 的 AI 均可使用 |

> **特别注意：MCP 是协议，不是某个具体软件，也不是某个具体工具。**

## 二、MCP 具体规定了什么？

MCP 不只是规定「怎么连接」，还规定了连接后双方如何交流、如何发现能力、如何调用功能。

它主要包含三个核心部分。

### 1. Host、Client、Server：规定参与通信的角色

MCP 采用客户端—服务器架构。

- **MCP Host（宿主应用）**
  例如 DSH、Claude Desktop、支持 MCP 的 IDE。
  它们负责管理连接 MCP 和协调 AI 与外部工具的交互。

- **MCP Client（客户端）**
  负责与 MCP Server 建立连接和交换消息（一般是内部插件发挥此功能）。

- **MCP Server（服务端）**
  提供工具、数据和提示模板
  - 数据库
  - 本地文件

三个角色分别是：

- **Host**：使用 MCP 的 AI 应用。
- **Client**：Host 内部负责连接 MCP Server 的组件。
- **Server**：提供具体功能和数据的程序。

一个 Host 可以管理多个 Client，每个 Client 通常对应一个 Server 连接。

### 2. Tools、Resources、Prompts：MCP 的具体功能

这是 MCP 最重要的功能规范。

| 核心机制 | 中文 | 作用 |
| --- | --- | --- |
| Tools | 工具 | 让 AI 执行具体操作 |
| Resources | 资源 | 向 AI 应用提供外部数据 |
| Prompts | 提示模板 | 提供可复用的提示词和任务模板 |

举例：

假设有一个数据库 MCP Server：

- **Tools**：执行 SQL 查询。
- **Resources**：提供数据库表结构。
- **Prompts**：提供数据库分析的提示模板。

这三个功能可以同时存在于一个 MCP Server 中，也可以只实现其中一部分。

### 3. JSON-RPC 2.0：规定双方如何传递消息

这是技术层面非常重要的一点。

MCP 使用 JSON-RPC 2.0 作为消息交互基础。

例如，AI 应用想让一个 MCP Server 搜索论文，可以发送类似这样的请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_papers",
    "arguments": {
      "keyword": "Sign Language Translation",
      "year": 2026
    }
  }
}
```

这段请求表达的是：

- 使用 JSON-RPC 2.0 格式。
- 调用 `tools/call` 方法。
- 执行名为 `search_papers` 的工具。
- 传入关键词和年份。

Server 执行完毕后，再按照协议返回结果。

## 三、MCP 还规定了如何建立通信

MCP 不仅规定消息格式，还规定消息通过什么渠道传递。

目前官方规范主要定义两种标准传输方式：

### STDIO

本地进程通信。

例如 DSH 在本机启动 `mcp-dblp`，双方通过标准输入和标准输出交换消息。

### Streamable HTTP

通过 HTTP 进行通信。

例如 AI 应用连接部署在远程服务器上的 MCP Server。

## 四、MCP 与 API、插件、Function Calling 的区别

这几个概念很容易混淆。

| 概念 | 本质 | 解决的问题 |
| --- | --- | --- |
| API | 软件接口 | 软件如何提供和调用功能 |
| Function Calling | 模型工具调用机制 | 模型如何提出工具调用请求 |
| MCP | 开放通信协议 | AI 应用如何标准化连接外部服务 |
| 插件 | 功能扩展与集成形式 | 如何向应用增加功能 |

举个实际例子：

你开发了一个查询天气的程序。

- **API**：天气程序提供查询接口。
- **Function Calling**：LLM 决定调用 `get_weather`。
- **MCP**：将天气查询能力按照 MCP 规范提供给兼容的 AI 应用。
- **插件**：可以把天气查询封装成一个用户能够安装的应用扩展。

它们并不互相排斥。

一个 MCP Server 内部完全可以调用 API，而 AI 应用也可以使用 Function Calling 来决定何时调用 MCP 提供的工具。

## 五、MCP 的本质价值

官方将 MCP 的定位与 Language Server Protocol（LSP，语言服务器协议）作了类比。

LSP 统一了开发工具与编程语言服务之间的连接方式，使不同编辑器可以复用相应的语言服务。

MCP 则希望实现类似的效果：

**让不同 AI 应用能够使用遵循统一协议的外部工具和数据服务。**

例如：

```
不同 AI 应用                    统一的 MCP 标准
─────────────────              ──────────────────
DSH                            DBLP MCP
Claude               →         GitHub MCP
IDE                            文件系统 MCP
```

只要 AI 应用和 Server 都兼容相应的 MCP 规范，就能够建立连接，而不必为每个应用重新设计一套专用通信协议。

### 使用 MCP 的情况

- 连接外部数据库或知识库。
- 让 AI 操作本地资源：例如读取文件、搜索文件、管理文件等。
- 连接第三方服务：例如 GitHub、数据库、邮件等服务，让 AI 能够调用它们提供的功能。
- 跨 AI 应用复用工具：希望同一套 MCP Server 不必针对 DSH、Claude 等应用分别开发一套专用接口。

## 六、举例：在 DSH 里面配置 dblp-MCP（DBLP MCP 完整部署与集成记录）

### 项目最终目标

在 Windows 电脑上部署一套本地 DBLP 学术论文检索服务，使 DSH 能够通过 MCP 协议调用该服务，检索本地保存的 DBLP 论文元数据。

同时打通后续论文获取流程：

**DSH 检索论文 → 获取论文信息及 DOI → 浏览器访问论文页面 → Zotero Connector 抓取论文及 PDF → 保存到 Zotero。**

最终涉及的主要组件：

| 组件 | 作用 |
| --- | --- |
| DSH | AI 应用，作为 MCP Host |
| Python | 运行 DBLP MCP 所需的运行环境 |
| uv | Python 包与运行环境管理工具 |
| mcp-dblp | 实际提供论文检索能力的 MCP Server |
| DBLP 数据集 | 本地论文元数据 |
| Edge | 外部浏览器 |
| Zotero Connector | 浏览器论文抓取插件 |
| Zotero | 文献管理软件 |

### 阶段一：检查并隔离 Python 环境

#### 1. 检查原有 Python 环境

执行了以下检查：

```powershell
pip show requests
python --version
```

目的：

- 查看当前 Python 版本。
- 检查现有 Python 是否具备正常的 pip 包管理能力。
- 判断是否可以直接使用当前环境安装 MCP。

检查后发现，系统默认 Python 指向 MSYS2 环境，原有环境不适合直接承担此次 MCP 部署所需的 Python 包管理任务。

#### 2. 保留原有 MSYS2 环境

没有卸载或覆盖原有 Python。

原因：

- MSYS2 主要用于原有 C/C++ 开发环境。
- 其他程序可能依赖其中的 Python 及其配置。
- 直接替换可能破坏已有项目。

因此决定另外安装一套独立的 Python 环境。

#### 3. 安装独立 Python

下载并安装：

`python-manager-26.4.msix`

之后统一使用：

```powershell
py
```

调用新安装的 Python 环境，避免继续使用默认的 MSYS2 Python。

**本阶段结果：** 保留旧环境，同时准备了一套独立的 Python 运行环境。

### 阶段二：规划运行环境

#### 4. 将存储数据的位置规划到 D 盘

在 Windows 环境变量中新建：

```text
UV_CACHE_DIR=D:\uv-cache
```

作用：将 uv 缓存放到 D 盘。

再设置：

```text
UV_PYTHON_INSTALL_DIR=D:\uv-python
```

作用：将 uv 管理的 Python 运行时放到 D 盘。

**本阶段结果：** 完成 uv 安装，并将其缓存和 Python 运行时的存储位置规划到 D 盘。

### 阶段三：规划并准备本地 DBLP 数据库

#### 5. 设置 DBLP 数据存储目录

在 Windows 的“环境变量”设置窗口创建或指定环境变量：

```text
MCP_DBLP_HOME=D:\mcp-dblp-data
```

作用：

告诉 DBLP MCP 将其所需的本地数据存放在指定目录。

这里需要区分：

- `D:\mcp-dblp-data`：数据目录。
- `mcp-dblp.exe`：实际运行的 MCP Server 程序。

两者不是同一个东西。

#### 6. 下载 DBLP 官方论文数据

这一步是整个部署中非常重要的环节。

实际操作过程：

1. 准备 DBLP MCP 所需的数据存储目录。
2. 运行 DBLP MCP 程序。
3. 程序触发首次数据初始化及下载逻辑。
4. 从 DBLP 数据源获取论文元数据。
5. 将数据保存到 `D:\mcp-dblp-data`。
6. 检查 D 盘目录，观察数据文件体积增长。

最终获得了约 4.2GB 的本地 DBLP 数据，历史记录中提及约 884 万篇论文元数据。

需要明确：

- 环境变量负责指定存储位置。
- 真正触发数据下载的是运行 DBLP MCP 程序。
- 下载的数据是论文元数据，不等于下载了全部论文 PDF。
- 本地数据供后续检索使用。

**本阶段结果：** 获得本地 DBLP 论文数据，避免每次检索都必须重新获取整套论文元数据。

### 阶段四：安装 DBLP MCP Server

#### 7. 使用独立 Python 环境安装 DBLP MCP

为了避免继续卡在 uvx 的启动问题上，改为直接使用独立 Python 环境安装 DBLP MCP。

执行：

```powershell
pip -m pip install mcp-dblp
```

作用：

将 `mcp-dblp` 安装到本地 Python 环境，使其提供的命令行程序可以直接运行。

#### 8. 使用本地 mcp-dblp.exe

安装完成后，获得了：

```text
mcp-dblp.exe
```

这是实际负责提供 DBLP MCP 服务的程序。

#### 9. 在终端测试 Server

运行：

```powershell
mcp-dblp.exe
```

观察程序启动情况。

这一步既用于验证程序能否正常运行，也触发了前面提到的 DBLP 数据初始化及下载逻辑。

检查 D 盘数据目录，确认数据文件开始增长。

**本阶段结果：** 成功安装本地 DBLP MCP Server，并能够通过命令行启动。

### 阶段五：将 DBLP MCP 接入 DSH

#### 10. 打开 DSH 的 MCP 连接器配置

在 DSH 的 MCP 连接器中选择导入 JSON。

#### 11. 导入 MCP 配置

通过 JSON 配置告诉 DSH：

- 要连接哪个 MCP Server。
- 使用什么启动命令。
- 如何传递启动参数和环境变量。

这里的核心是让 DSH 能够找到并启动本地安装的：

```text
mcp-dblp.exe
```

#### 12. 建立 DSH 与 Server 的连接

完成配置后，由 DSH 的 MCP Client 与本地 DBLP MCP Server 建立通信。

整个结构为：

```text
DSH（MCP Host）
    |
    v
MCP Client
    |
    v
MCP 通信协议
    |
    v
mcp-dblp.exe（MCP Server）
    |
    v
D:\mcp-dblp-data
```

#### 13. 验证论文检索能力

向 DSH 提出论文检索需求。

由 DSH 调用 DBLP MCP 提供的检索工具，Server 在本地数据中执行检索，并将结果返回给 DSH。

**本阶段结果：** DSH 成功接入本地 DBLP MCP，形成完整的 AI → MCP Server → 本地论文数据检索链路。

### 最终完成的系统架构

#### 1. 本地学术检索系统

```text
用户提出论文检索需求
        |
        v
      DSH
    MCP Host
        |
        v
    MCP Client
        |
        v
    MCP 协议
        |
        v
  mcp-dblp.exe
    MCP Server
        |
        v
 D:\mcp-dblp-data
    本地论文数据
        |
        v
    返回检索结果
        |
        v
       DSH
```

#### 2. 论文获取与文献管理系统

```text
DSH 检索结果
      |
      v
论文信息 / DOI
      |
      v
Edge 浏览器
      |
      v
论文网站
      |
      v
Zotero Connector
      |
      v
Zotero 文献库
```

### 最终成果

经过以上操作，完成了以下工作：

| 项目 | 最终结果 |
| --- | --- |
| Python 环境 | 独立运行环境 |
| 原有 MSYS2 Python | 保留 |
| uv | 已安装 |
| uv 缓存 | 迁移至 D 盘 |
| uv 管理的 Python | 规划至 D 盘 |
| DBLP 数据目录 | `D:\mcp-dblp-data` |
| DBLP 本地数据 | 约 4.2GB |
| 论文元数据规模 | 约 884 万篇 |
| DBLP MCP | 本地安装 |
| MCP Server | `mcp-dblp.exe` |
| DSH MCP 连接 | 已配置并跑通 |
| Edge 外部访问 | 已实现 |
| Zotero Connector | 已用于论文抓取 |
| 论文 PDF 入库 | 已打通相应工作流 |
