# Materin Ctx

Obsidian 插件：在 Obsidian 中直接打开、查看、编辑 JSON / YAML 文件。

English: an Obsidian plugin that opens JSON / YAML files in a native-feeling CodeMirror 6 editor view with formatting, folding and search.

## 功能 / Features

- **文件接管** — 点击 vault 中的 `.json` / `.yaml` / `.yml` / `.jsonc` 文件，直接在 Obsidian 内打开，不再弹出系统应用。
- **语法高亮 + 行号** — 基于 CodeMirror 6（Obsidian 内置运行时），与原生编辑器手感一致。
- **折叠** — 点击行号槽的箭头折叠对象 / 数组 / YAML 块；支持「全部折叠 / 全部展开」按钮与命令。
- **搜索** — `Ctrl/Cmd + F` 打开搜索面板，支持高亮全部、大小写、正则与替换。
- **格式化** — 一键按配置重新缩进：
  - JSON / JSONC：容错重缩进（语法有错也能排版），**保留注释**；
  - YAML：Document 往返，**保留注释**，支持行宽限制（`0` = 不限制）。
- **编辑与保存** — 直接编辑，`Ctrl/Cmd + S` 或「保存」按钮写回文件；未保存改动以橙色圆点提示。
- **外部修改同步** — 文件在磁盘上被其他工具修改后自动刷新；若有未保存改动，显示提示条由你决定是否重载。
- **设置** — 缩进字符（空格 / Tab）、缩进宽度（2 / 4 / 8）、自动换行、行号、打开时折叠、YAML 行宽。

## 备注 / Notes

- YAML 规范禁止 Tab 缩进：设置选择 Tab 时，YAML 格式化自动回退为对应宽度的空格（编辑器缩进仍使用 Tab）。
- 读取文件时会剥离 BOM，保存时不回写。
- 文件行尾（CRLF / LF）在保存时保持原样。
- JSONC：语法高亮按 JSON 处理（注释无高亮），校验与格式化按 JSONC 宽松规则（允许尾随逗号、注释）。

## 安装 / Install

从 Release 页下载 `main.js`、`manifest.json`、`styles.css`，放入
`<vault>/.obsidian/plugins/materin-ctx/`，启用插件即可。

## 开发 / Development

```bash
npm install        # 安装依赖
npm run dev        # 开发构建（watch，自动部署到 .debug-vault）
npm test           # vitest 单元测试
npm run check      # tsc 类型检查
npm run lint       # eslint（eslint-plugin-obsidianmd recommended）
npm run build      # 生产构建（root main.js）
```

调试 vault 位于 `.debug-vault/`（含 hot-reload 插件），`npm run dev` 后用 Obsidian 打开该 vault 即可热重载调试。示例文件：`sample.json` / `config.yaml` / `settings.jsonc`。

## License

MIT
