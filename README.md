# PlayChessClub 官网

PlayChessClub（PCC）Minecraft 公益服务器的纯静态官网。站点不依赖构建工具，可直接部署到支持目录 `index.html` 的静态托管服务。

## 本地预览

请通过 HTTP 服务预览，避免直接打开 `file://` 导致接口与绝对路径行为不一致。

```powershell
python -m http.server 8000
```

随后访问 `http://localhost:8000/`。

部署到已有 Linux 云虚拟机请参阅 [Nginx 部署步骤](docs/deploy-linux.md)。执行 `python tools/package-site.py` 可生成仅含公开站点文件的 `.cache/deploy/playchessclub-website.zip`；配置模板位于 `deploy/nginx-site.conf`。

## 主页 3D 场景

主页开头为四幕滚动游览：河畔初见、石桥木屋、主城地标、全景收尾。上滑可返回之前的角度，也可通过章节导航或“跳过场景”直接访问内容。浅色主题显示日景，深色主题显示夜景，并支持跟随系统。

运镜采用平滑跟随：桌面每段过渡约需滚动 1.8 屏，手机约 1.6 屏；镜头以与刷新率无关的缓动追随滚动位置，约 0.75 秒完成一次位置变化的 95%。文字会在对应章节短暂停留，加载、窗口变化及返回前台时直接对齐当前章节。

- `assets/scripts/home-world.js` 是可编辑的方块场景源文件，同时定义桌面和手机的镜头位置、观察目标。布局参考现有 `hero.jpg` 和用户提供的 9 月 6 日视频；未拍到的部分为补全重建，不是地图存档导出。
- `assets/models/home/pcc-riverside.glb` 是独立模型，包含 12,593 个方块实例、原创建筑纹理和静态水面。网页加载后添加动态水纹、光照及灯光光晕；这些运行时效果不写入模型。
- `assets/scripts/home-scene.js` 管理加载和静态回退，`home-scene-renderer.js` 管理渲染、滚动及主题同步。Three.js 0.180.0 与所用官方模块、MIT 许可证均保存在 `assets/vendor/three/`。
- 首页优先显示日／夜 WebP 封面。减少动态效果、低于 500px 的窗口高度、WebGL 不可用、模型请求超过 20 秒或渲染失败时，使用正常排版的静态介绍；窗口条件恢复后可重新启用 3D。页面进入后台或场景离开视口时暂停渲染。

仓库内的模型和封面可直接部署，网站运行不需要 Node.js 或构建步骤。修改模型或光照后，开发阶段可使用 Node.js 18+ 与 Playwright 重新生成并验证：

```powershell
# 已安装 Playwright 时可直接执行；也可指定现成的 playwright / playwright-core 包目录。
$env:PCC_PLAYWRIGHT_PATH = "你的 playwright-core 包目录"
$env:PCC_BROWSER_PATH = "你的 Chromium、Chrome 或 Edge 可执行文件路径"
node tools/build-home-model.mjs
node tools/capture-home.mjs
node tools/verify-home.mjs
```

`PCC_PLAYWRIGHT_PATH` 和 `PCC_BROWSER_PATH` 都可省略，此时使用本地 Playwright 包及其默认 Chromium。生成脚本会验证 GLB 重新加载后的实例数量。浏览器检查涵盖镜头碰撞采样、四幕正反滚动、主题及系统设置、手机横竖屏、静态回退、延迟加载、离屏暂停和子目录部署，截图与报告写入忽略提交的 `.cache/home-qa/`。软件渲染下的自动检查不代表手机真机帧率。

## 项目结构

```text
assets/
  downloads/          Pration 插件下载
  images/             品牌、首页、画廊、插件与历史归档素材
  scripts/            主题、共享组件和页面功能模块
  styles/             设计令牌、共享组件和页面样式
ai/                   服务器与通用 AI 助手
gallery/              风景画廊
mail/                 邮件订阅与成功页
pration/              Pration Tools 介绍页
session-closed/       验证会话关闭提示
status/               独立服务器状态页
index.html            官网首页
```

根目录原有的 `view.html`、`statues.html`、`mail.html`、`success.html`、`ai.html`、`ai+.html`、`closing.html` 以及 `插件/index.html` 均为兼容跳转页，请勿直接删除。

## 主题与组件

- `assets/styles/tokens.css` 定义浅色与深色设计令牌。
- `assets/scripts/theme.js` 默认跟随浏览器主题，并保存用户的手动选择。
- `assets/scripts/site-shell.js` 提供统一的 `<pcc-header>` 与 `<pcc-footer>` 组件。
- `site-shell.js` 同时提供 `window.PCCMotion.reveal(container)`，用于统一处理滚动入场和动态内容动画。
- 页面特有样式位于 `assets/styles/pages/`，特有交互位于 `assets/scripts/`。
- 每个 HTML 页面通过 `<base href>` 指向站点目录，站内资源和页面链接必须使用不以 `/` 开头的相对路径，以兼容域名根目录和 GitHub Pages 项目子目录部署。

## 规范路由

| 功能 | 地址 |
|---|---|
| 首页 | `/` |
| 风景画廊 | `/gallery/` |
| 服务器状态 | `/status/` |
| 邮件订阅 | `/mail/` |
| 订阅成功 | `/mail/success/` |
| 服务器 AI | `/ai/server/` |
| 通用 AI | `/ai/general/` |
| 会话关闭 | `/session-closed/` |
| Pration Tools | `/pration/` |

## 编辑建议

1. 公共颜色、间距和圆角优先修改设计令牌，不要在页面中写内联样式。
2. 复用现有卡片、按钮、表单和页面壳层类，页面只保留与内容直接相关的结构。
3. 新增图片时放入对应分类目录，并提供有意义的替代文本。
4. 修改接口脚本后同时检查加载、成功、空数据和失败状态。

问题与建议请提交到 [GitHub Issues](https://github.com/73410/playchessclub-website/issues)。
