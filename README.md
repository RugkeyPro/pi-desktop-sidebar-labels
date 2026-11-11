# Sidebar Labels / 侧边栏标记

Add visual labels to PI Desktop conversations and color the existing project folder icons.

## 使用

- 点击会话左侧的标记按钮，选择圆点、星标、旗标等符号和颜色。
- 点击项目的文件夹图标，选择预设颜色或自定义颜色。
- 选择器中的“清除标记”恢复默认外观，Escape 关闭选择器。
- 标记按会话 ID 和项目分组标识保存在当前 PI Desktop 的本地存储中。

## Permissions and privacy

Requires only `renderer.extension` to decorate the main window's sidebar.
No network requests, filesystem access, chat-content reads, or model calls.
Labels are stored locally in the application's localStorage under `local.sidebar-labels.v1`.
Labels do not sync between devices. Clearing application website storage removes labels.

## Compatibility

Tested on PI Desktop 0.21.0 for macOS. Sidebar decoration uses the application's
`data-sidebar-session-row`, `data-sidebar-project-group`, and sidebar CSS classes.
A future host layout change may require a plugin update.

## Development

Load this directory through Extensions → More → Load local plugin.
The renderer hot-reloads on source changes.
Package with the host's PluginCheck and PluginPack tools.
