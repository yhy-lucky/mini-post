# 心情日记 mini-post

一个只保存在本机的轻量心情日记，用纯 HTML + CSS + JavaScript 写成，无框架、无构建、无后端。

## 功能

- 今日概览：日期、星期、实时时钟、问候语、真实天气（气温、体感、湿度、天气现象），以及本月记录天数、连续记录天数、累计条数与本月心情分布
- 心情记录：每条记录可选 6 种心情（开心、平静、兴奋、疲惫、低落、焦虑），可加最多 3 个主题标签（预设 + 自定义），正文上限 280 字
- 时间线：按「今天 / 昨天 / 日期」分组，组内按时间倒序，展示心情、时间、正文与标签
- 点赞互动：记录可点赞与取消，状态保存在本地
- 主题切换：浅色 / 深色一键切换，首次跟随系统偏好，选择会被记住
- 本地持久化：记录、设置、天气缓存全部存在浏览器 `localStorage`，刷新后仍在
- 数据迁移：从旧版本（`minipost.posts.v1`）自动迁移已有内容，不丢失
- 天气降级：定位或网络不可用时自动回退到默认城市 / 显示重试提示，不影响记录

## 天气数据

天气来自 [Open-Meteo](https://open-meteo.com/) 的公开接口（免密钥）：

- 地理编码：`https://geocoding-api.open-meteo.com/v1/search`
- 实时天气：`https://api.open-meteo.com/v1/forecast`

首次进入会尝试浏览器定位；定位不可用或拒绝授权时使用上次选择的城市，仍没有则显示默认城市（北京）。点击天气卡可搜索城市或改用当前位置。天气结果缓存 30 分钟。

## 运行

方式一：直接双击 `mini-post/index.html`，用浏览器打开。

方式二：启动一个本地静态服务器：

```bash
cd mini-post
python -m http.server 5173
```

然后访问 <http://127.0.0.1:5173/>。

> 定位功能需要 `https` 或 `localhost`；用 `file://` 打开时可直接手动选择城市。

## 数据说明

所有记录只保存在当前浏览器的 `localStorage` 中，不会上传到任何服务器：

| 键名 | 内容 |
| --- | --- |
| `mooddiary.entries.v1` | 心情记录数组 |
| `mooddiary.settings.v1` | 主题偏好与所选城市 |
| `mooddiary.weather.v1` | 天气缓存（30 分钟） |

清理站点数据或更换浏览器会导致内容不可见。

## 目录结构

```
.
├── .gitignore
├── README.md
├── mini-post/          # 原版：纯 HTML + CSS + JS，无框架、无构建
│   ├── index.html      # 页面骨架：顶部栏、今日概览、发布卡、时间线、城市弹层
│   ├── styles.css      # 样式：双主题设计变量、概览与天气、心情标签、时间线与动效、响应式
│   └── app.js          # 逻辑：存储与迁移、主题、天气与城市、时钟统计、发布与点赞、分组渲染
└── mini-post-vue/      # Vue 重写版：Vite + Vue 3 + TypeScript + Pinia + Vitest（TDD）
```

> Vue 版功能与视觉与 `mini-post/` 一致，但数据不再存于浏览器：改由同目录的 Hono 内存后端通过 RESTful `/api/*` 提供，详见 [`mini-post-vue/README.md`](mini-post-vue/README.md)。
