# AI 穿搭预演工具 Demo

一个简易的 AI 穿搭搭配工具，包含：

- **单品库区**：添加、编辑、搜索、筛选服装单品。
- **拖拽搭配区**：把单品拖到对应分类区域，支持清空与保存。
- **穿搭成果展示区**：生成搭配效果图、下载图片、保存并查看历史套装。

## 一键启动（推荐）

双击本目录下的 **`一键启动.bat`** 即可：脚本会自动定位 Node.js、启动本地服务，并在默认浏览器打开 `http://localhost:3000`。

- 若 3000 端口已在监听，脚本仅打开浏览器，不会重复启动服务。
- 停止服务：关闭弹出的「AIOutfitServer」窗口（或在任务管理器结束 node 进程）。

## 命令行启动（备选）

```bash
node server.js
# 然后访问 http://localhost:3000
```

## 快速体验（无需后端）

直接用浏览器打开 `index.html` 即可。所有数据保存在浏览器 localStorage，刷新不丢失。

1. 点击右上角 **添加衣服**，上传或填写图片 URL、填写名称/分类/颜色/季节/场合。
2. 在单品列表中拖拽单品到搭配区对应格子，或点击 **加入搭配**。
3. 点击 **AI 生成搭配图**，默认使用前端 Canvas 合成预览图。
4. 在右侧 **成果展示** 区查看、下载或保存为套装。

## 接入 OpenAI DALL·E（可选）

如果你希望使用真实的 AI 图像生成，可以启动本地服务端作为代理：

```bash
# 方式一：通过环境变量注入 API Key
set OPENAI_API_KEY=sk-你的Key
node server.js

# 方式二：启动后在前端 AI 设置里填写 API Key
node server.js
```

然后打开 `http://localhost:3000`，进入右上角 **AI 设置**，选择 **OpenAI DALL·E** 并填入 API Key（仅保存在浏览器本地），服务端会代理调用 `https://api.openai.com/v1/images/generations`。

## 自定义后端接口

如果不想用 OpenAI，可以在 **AI 设置** 选择 **自定义后端接口**，填写你自己的生成接口地址。前端会 POST 如下 JSON：

```json
{
  "prompt": "A stylish full-body fashion outfit featuring ...",
  "items": [ /* 当前搭配单品 */ ]
}
```

后端返回任意包含 `url` / `imageUrl` / `data[0].url` 字段的 JSON 即可。

## 备份与导入

点击右上角 **导出备份** 可把衣橱、套装、设置导出为 JSON；点击 **导入备份** 可恢复。

## 文件说明

- `index.html`：完整前端页面（HTML + Tailwind CSS + JS）。
- `server.js`：Node.js 本地静态服务 + OpenAI 代理接口。
