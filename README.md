# PlayChessClub 官网

PlayChessClub（PCC）Minecraft 公益服务器的纯静态官网。站点不依赖构建工具，可直接部署到支持目录 `index.html` 的静态托管服务。

## 本地预览

请通过 HTTP 服务预览，避免直接打开 `file://` 导致接口与绝对路径行为不一致。

```powershell
python -m http.server 8000
```

随后访问 `http://localhost:8000/`。

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
