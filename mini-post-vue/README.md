# 心情日记 · Vue 版（mini-post-vue）

`mini-post/` 的 Vue 3 重写版：功能、文案、类名与视觉保持不变，但工程化为 Node.js + Vite + Vue 3 + TypeScript + Pinia，并按 TDD（先写失败测试，再写实现）逐步构建。

数据由 **Hono 后端 + 进程内存存储 + RESTful API** 保管，浏览器不再落任何业务数据（`localStorage` 已整体移除）。

## 快速开始

```bash
cd mini-post-vue
npm install
npm run dev:all  # 同时启动 API（:8787）与 Vite（:5173）
```

也可以分开启动（两个终端）：

```bash
npm run dev:api  # Hono API，http://localhost:8787
npm run dev      # Vite，http://127.0.0.1:5173，/api 由代理转发到 8787
```

> 内存存储意味着**重启 API 进程数据即清空**，这是刻意的设计取舍：用于替代 localStorage、验证接口契约与前后端分层，不承担持久化职责。

> 如果终端里 `node` / `npm` 不在 PATH（Windows 常见），先执行
> `$env:Path = "C:\Program Files\nodejs;" + $env:Path` 再运行上面的命令。

| 命令 | 作用 |
| --- | --- |
| `npm run dev:all` | 并行启动 API 与 Vite（推荐） |
| `npm run dev:api` | 启动 Hono API（`tsx watch`，端口 8787） |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run start` | 以生产模式启动 API |
| `npm run build` | 类型检查（`vue-tsc`）+ 生产构建到 `dist/` |
| `npm run preview` | 预览构建产物（`/api` 仍代理到 8787） |
| `npm test` | 前端（jsdom）+ 服务端（node）全部用例 |
| `npm run test:client` | 仅前端用例 |
| `npm run test:server` | 仅服务端用例 |
| `npm run test:watch` | 监听模式，TDD 开发时使用 |
| `npm run typecheck` | 仅做类型检查（含 `server/**`） |

> 定位功能需要 `https` 或 `localhost`，开发服务器已满足。

## 技术栈

- **构建**：Vite 8
- **框架**：Vue 3.5（全部组件使用 `<script setup lang="ts">`）
- **状态**：Pinia 4（setup store 写法）
- **后端**：Hono 4 + `@hono/node-server`，进程内存存储，RESTful `/api/*`
- **测试**：Vitest 5（前端 jsdom / 服务端 node 双配置）+ @vue/test-utils
- **样式**：直接迁移自旧版 `mini-post/styles.css`，选择器与 CSS 变量未改动

## 分层与 TDD 流程

```
组件 (.vue) → Pinia store → src/api/*（fetch 封装）→ HTTP /api/* → server/app.ts → server/store.ts（内存 Map）
```

自下而上四层推进，每层都遵循「红 → 绿 → 重构」：

1. **纯函数**：`utils/date`、`utils/text`、`utils/color`、`utils/stats`、`utils/group`
2. **服务端**：`server/validate`（请求校验与归一化）→ `server/store`（内存存储工厂）→ `server/app`（路由 / CORS / 统一错误）→ `server/index`（启动）
3. **前端数据访问**：`api/client`（`fetch` 封装、`ApiError`、`AbortError` 透传）、`api/entries|settings|weatherCache`（结构校验与安全默认值）
4. **编排与视图**：`stores/*`（异步加载态、乐观点赞与回滚、并发 `init()` 复用同一 Promise）、`components/*`（只做渲染与事件转发）

测试与被测模块同目录放置（`*.spec.ts`），组件测试集中在 `src/components/__tests__/`。

```bash
npm test                                # 前端 27 个 spec + 服务端 5 个 spec
npm run test:server                     # 只用 node 环境跑服务端用例
npm test -- src/stores/entries.spec.ts  # 单个文件
```

测试中的时间通过 `createApp({ now })` 注入时钟固定，网络在前端用 `vi.stubGlobal('fetch', ...)` 替换、在 store 测试里用 `vi.mock('@/api/*')` 替换，服务端直接用 `app.request()`（不监听端口），因此无需真实网络与浏览器。

## 浏览器验收（不下载任何浏览器）

自动化用例跑 jsdom，视觉与真实设备行为仍需真机浏览器确认。本机已安装的 Chrome / Edge 直接复用，**不需要也不会下载 Playwright 自带的 Chromium**：

```bash
npm run dev                                     # 记下实际端口，默认 5173
playwright-cli open --browser=chrome http://127.0.0.1:5173
# 或用 Edge：playwright-cli open --browser=msedge http://127.0.0.1:5173
```

- `--browser=chrome` / `--browser=msedge` 走的是系统已安装的浏览器通道；**不要执行 `playwright-cli install-browser` / `playwright install`**。
- 全局命令找不到时，`playwright-cli` 通常在 `npm prefix -g` 对应目录下（Windows：`%APPDATA%\npm\playwright-cli.cmd`）。
- 快照与截图默认落在 `.playwright-cli/`，已加入 `.gitignore`；需要留存时用 `--filename` 指到工作区外的临时目录。

验收清单（每次改动后过一遍）：

1. 空状态 → 选心情 / 主题 / 自定义主题 → 提交：记录出现、自定义主题芯片消失、输入框重新获得焦点、提示「已保存到服务器」。
2. 点赞：`aria-pressed` 与数字即时变化，`.like-btn.is-bumping` 出现并在 400ms 内移除；刷新后点赞状态仍在（已由服务端落库）。
3. 刷新页面：记录、点赞状态、主题选择、所选城市都还在（来源为 `GET /api/entries`、`GET /api/settings`）。
4. 切换深色 / 浅色：`<html data-theme>` 与按钮文案同步，刷新后保持（`PUT /api/settings`）。
5. 点击天气卡：城市弹层可打开；搜「长沙」「湘潭」「湖南长沙」都能看到带「湖南 · 中国」的那一条排在最前；断网时显示「天气暂不可用 + 重试」而不影响记录。
6. 关闭 API 进程后刷新：页面不白屏，记录区显示「加载记录失败，请稍后重试」；重新提交记录提示「保存失败，请检查网络后重试」。
7. 390×844 移动视口：单列布局、无横向滚动。
8. 控制台无报错（包括 favicon 在内的资源全部 200 / 内联）。

## 目录结构

```
mini-post-vue/
├── index.html              # 内联主题启动脚本（样式加载前按系统偏好定主题，避免首屏闪白）
├── vite.config.ts          # Vue 插件 + /api 代理（dev / preview）+ Vitest（jsdom）配置
├── vitest.server.config.ts # 服务端用例配置（node 环境，只收 server/**/*.spec.ts）
├── tsconfig.json           # strict + 路径别名 @ -> src + 允许 .ts 后缀导入
├── server/                 # Hono 后端
│   ├── index.ts            # 启动入口（@hono/node-server，PORT 默认 8787）
│   ├── app.ts              # 路由组装、CORS、统一错误体、404
│   ├── store.ts            # createStore()：内存 Map + 单例设置 + 天气缓存，实例间隔离
│   ├── validate.ts         # 请求体解析、校验、归一化（复用 src/constants 的规则）
│   └── testing.ts          # 测试 harness：app.request + 可注入时钟
└── src/
    ├── main.ts             # 创建 pinia，先挂载再异步 init 数据
    ├── App.vue             # 页面骨架与跨组件事件编排
    ├── types/              # Entry / Location / WeatherData 等类型（前后端共用）
    ├── constants/          # 心情、主题标签、天气映射、省级行政区、限制常量
    ├── utils/              # 纯函数：日期、字数、颜色、统计、分组、城市搜索关键词扩展与排序
    ├── api/                # client（fetch 封装）+ entries/settings/weatherCache/weather/geolocation
    ├── stores/             # entries / settings / weather 三个 Pinia store
    ├── composables/        # useClock（秒级时钟）、useToast（全局提示条）
    ├── components/         # 头部、今日概览、天气卡、发布卡、心情与标签选择、
    │                       # 时间线、条目、空状态、城市弹层、提示条、背景装饰
    └── styles/main.css     # 迁移自旧版 styles.css
```

## 接口说明

所有接口位于 `/api`，JSON 进 JSON 出；失败统一返回 `{ "error": { "code": string, "message": string } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查，返回 `{ ok, uptime }` |
| `GET` | `/api/entries` | 记录列表，按 `createdAt` 倒序 |
| `POST` | `/api/entries` | 新增记录（`content` / `mood` / `tags`），服务端生成 `id` 与 `createdAt` |
| `GET` | `/api/entries/:id` | 单条记录 |
| `PATCH` | `/api/entries/:id` | 局部更新 `content` / `mood` / `tags` |
| `DELETE` | `/api/entries/:id` | 删除，返回 204 |
| `PUT` | `/api/entries/:id/like` | 幂等设置点赞态（`{ liked: boolean }`），`likes` 在翻转时 ±1 且下限 0 |
| `GET` | `/api/settings` | 主题与所选城市，未设置过时返回 `{ theme: 'system', location: null }` |
| `PUT` | `/api/settings` | 整体替换并归一化 |
| `GET` | `/api/weather-cache?locationKey=39.90,116.41` | 天气缓存，服务端做 30 分钟 TTL 与经纬度指纹校验 |
| `PUT` | `/api/weather-cache` | 写入缓存 |

错误码：`INVALID_BODY`（400）、`EMPTY_CONTENT`（400）、`CONTENT_TOO_LONG`（400）、`INVALID_MOOD`（400）、`NOT_FOUND`（404）、`INTERNAL_ERROR`（500）。

服务端与服务端测试共用 `src/constants/*` 与 `src/utils/text.ts` 作为**校验规则的唯一来源**（正文 280 字按码点计、最多 3 个标签、6 种心情），避免前后端规则漂移。

前端在 `src/api/client.ts` 把非 2xx 统一转成 `ApiError`（带 `code` / `status`），网络失败转 `NETWORK_ERROR`，而 `AbortError` 原样透传；`stores/entries.ts` 对加载失败只降级提示不抛错，点赞采用乐观更新 + 失败回滚。

## 天气数据

天气来自 [Open-Meteo](https://open-meteo.com/) 的公开接口（免密钥）：

- 地理编码：`https://geocoding-api.open-meteo.com/v1/search`
- 实时天气：`https://api.open-meteo.com/v1/forecast`

首次进入尝试浏览器定位，失败或拒绝授权时使用上次选择的城市，仍没有则回退北京。请求 7 秒超时，结果缓存 30 分钟；请求进行中切换城市会排队，等当前请求结束后自动发起。

### 城市搜索为什么要「多查一次」

Open-Meteo 的中文地名库并不规整：

- 部分地级市只存成带「市」的全名（`长沙` → 只能查到重庆/贵州等地的同名村庄，真正的城市叫 `长沙市`，人口 309 万）；
- 同名小村庄的召回远好于城市本身，`count=5` 一截断，湖南长沙根本不出现（`count=20` 也救不回来）；
- 接口只做名字匹配、没有行政区过滤，`湖南长沙`、`浙江杭州` 这类「省+市」连写直接 0 结果。

因此 `searchCities()` 会先扩展关键词再并发查询，最后合并排序（`src/utils/citySearch.ts`，纯函数，独立测试）：

| 输入 | 实际查询 | 结果 |
| --- | --- | --- |
| `长沙` | `长沙`、`长沙市` | 长沙市 · 湖南 · 中国（人口 3,093,980）排第一 |
| `湘潭` | `湘潭`、`湘潭市` | 湘潭市 · 湖南 · 中国 |
| `湖南长沙` | `长沙`、`长沙市` | 同上（剥离省级前缀） |
| `湖南 长沙` | `长沙`、`长沙市` | 同上（空格分隔时取城市部分） |
| `Changsha` | `Changsha` | 只发一次请求，不追加中文后缀 |
| `长沙市` | `长沙市` | 已有行政区后缀，不重复追加 |

合并规则：按 `id`（缺省用名称+坐标）去重 → 人口降序 → 同人口时行政中心（`PPLA*`）优先于居民点（`PPL`）→ 最多 8 条。某一路失败不影响其余结果，全部失败才报错；`AbortError` 原样透传给调用方，避免重复搜索时误报「搜索失败」。

## 与旧版的关系

`mini-post/` 保持原样未改动，可直接对照行为差异。本目录承担：

- 逻辑从 IIFE 与 `document.getElementById` 中解耦为可测试模块
- DOM 手写操作改为 Vue 模板与响应式状态（动画类名同样保留）
- 新增 351 个自动化用例（前端 304 / 服务端 47）覆盖请求校验、接口幂等、归一化、统计边界、乐观更新回滚、请求排队、组件交互、点赞动效与城市搜索关键词扩展
- 原版关键 DOM id（`#composer`、`#mood-current`、`#empty-state`、`#empty-action`、`#toast` 等）保留，便于对照与端到端脚本复用
