# dsh-bot-tokeninfo

DS Bot 输入框下方统计条里的 **渠道余额 / Token 信息** 插件。在不暴露任何密钥的前提下，显示当前会话所在渠道的余额，并把被 DS Bot 覆盖掉的「会话统计」「Token 用量」两个条目补回来——样式、字号、可点开的明细面板都与 harness 原生一致。

```
⟳ 52 轮 469 步 · 183 tok/s    ▤ 66.9M tok · 缓存命中 96%    ◎ 20%    ▤ 余额 ¥276.84
```

## 功能

- **余额条目**：排在上下文占用率右侧，显示真实币种与金额（`¥` / `$` / `积分`）。失败不会显示 0，保留旧值并标注「旧数据」。
- **跟随模型下拉**：按模型下拉里的当前选择决定渠道，刚切换、还没发出请求也立即生效；没有选择记录时回退到会话最近一次实际请求的渠道。
- **会话统计 / Token 用量**：DS Bot 按 id 把 harness 自带的这两个条目覆盖成了空，插件用官方 `sessionStats` / `tokenUsage` 投影补上，格式化口径与 harness 一致（轮/步、tok/s 取整规则、`K`/`M` 缩写、缓存命中率向下取整，部分命中不会显示成 100%）。
- **不重复绘制**：插件用 `MutationObserver` 观察 harness 是否已经自己画了这两个条目；普通会话页面它自己会画，插件就让位；只在被覆盖的 DS Bot 页面补上。
- **可点开的明细**：统计与用量条目点开后面板列出模型用时、工具调用用时、首 token 平均、输出速度，以及缓存命中率、输入 / 缓存读取 / 缓存写入 / 输出 token 数，数值随投影实时更新；`Esc` 或点击面板外关闭。

## 支持渠道

| 渠道 | 显示 | 数据来源 |
| --- | --- | --- |
| DeepSeek 官方账号（OAuth 登录） | 人民币 / 美元钱包余额 | 内置账号服务读取钱包（充值 + 赠送，按币种合计），与登录同一账号后在官网看到的一致 |
| DeepSeek API Key 路由 | 上游返回的真实币种金额 | 官方 `GET https://api.deepseek.com/user/balance`，不做汇率换算 |
| WorkBuddy | 剩余积分 | 复用已安装的 `dsh-connect-workbuddy` 只读积分接口，显示当前区域登录账号的积分，不合计账号池 |
| hctopup | 余额暂不可查 | 官方公开资料未提供可确认的余额接口；不会用密钥「额度上限」冒充账户余额 |

余额是账户维度的数字，不等于本会话消费额。

## 安装

前提：DeepSeek Harness 已安装并能打开 DS Bot 界面；要显示 WorkBuddy 积分，需已安装 `dsh-connect-workbuddy`。

本插件是本地 bundle，没有构建步骤和多余依赖，克隆后直接让 DSH 的插件管理器安装这个目录：

```
plugin_manager install_bundle <本仓库的绝对路径>
```

或直接告诉 agent：「安装本地 bundle `D:\path\to\dsh-bot-tokeninfo`」。

装好后刷新页面。已安装过旧版本时，需要先卸载再安装，Host 代码才会重新加载：

```
plugin_manager remove_bundle dsh-bot-tokeninfo
plugin_manager install_bundle <本仓库的绝对路径>
```

## 行为

- 自动检查每 20 秒一次，Host 成功结果缓存 60 秒，并合并同渠道并发查询；隐藏页面暂停检查。
- 点击余额条目立即重新检查（不绕过 Host 缓存）；失败后 10 秒内再次点击不会重试。
- 切换会话不会沿用前一个会话的余额；切换渠道会立刻重新查询。
- API Key 沿用 Harness 凭据库中的渠道配置，不需要在插件中重复输入。
- DS Bot 0.3.6 隐藏了 composer dock，插件只在自身条目存在时恢复该区域显示，并用 CSS `order` 把自身条目排到合适位置（统计 `-2`、用量 `-1`、余额 `99`），不修改内置条目；其他版本可能需要重新核验该兼容规则。

## 安全与限制

- 只有 Host 读取 API Key；浏览器只收到金额、币种、渠道和安全状态码。
- DeepSeek 凭据只发往官方 HTTPS 地址，请求拒绝重定向。
- HTTP 只读路由校验本机来源、`Host` 与 `Origin`，不开启 CORS，只接受 `GET`。
- 不打印密钥、响应原文或账号资料；日志里不出现凭据。
- 只查询已确认接口的渠道；没有公开余额接口的渠道明确显示不可查询。

## 开发

```
node --test balance.test.js   # 后端：分类、缓存、WorkBuddy、路由与注入
node --check client.js        # 浏览器产物语法
node client-smoke.cjs         # 桩渲染：三个条目注册、两条统计渲染出可点开的对话框
```

代码结构：`index.js`（Host 插件入口与只读路由）、`balance.js`（渠道识别与余额查询、缓存）、`client.js`（三个 composer dock 条目与明细面板）、`locale/`（中英文案）、`cordis.patch.yml`（bundle patch）。

## License

[MIT](LICENSE)
