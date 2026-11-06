# 记账本 v45：EdgeOne 免费 AI 识别测试接入

本功能为可选增强。没有配置接口时，原本的本地智能进货、图片 OCR、库存和成本计算都正常使用，不会发送账本数据。

## 在 EdgeOne Makers 上部署

1. 打开 https://edgeone.ai/zh/ ，进入 Makers 控制台并开通当前可用的免费版。
2. 创建 Web 项目，选择 GitHub 仓库 `tickkket/bead-ledger` 的 `main` 分支。使用项目根目录；仓库是原生静态 HTML/JS，通常无需 npm 构建命令，按控制台要求设为静态站点。
3. 在 Makers -> Models -> API Key 创建一把 **Makers Models 网关 API Key**。请只在 EdgeOne 后台保存，不能贴到 GitHub 文件、记账本的“个人访问口令”框或聊天中。
4. 在项目设置的环境变量内设置：

| 变量名 | 填什么 |
| --- | --- |
| `MAKERS_MODELS_KEY` | 第3步创建的 Models 网关 API Key（保密） |
| `LEDGER_ACCESS_TOKEN` | 自己用密码管理器随机生成的24位以上高强度访问口令（和 Models Key 不一样） |
| `ALLOWED_ORIGIN` | `https://tickkket.github.io`（如果旧账本网址改过域名，填写实际页面的 Origin） |
| `AI_MODEL` | `@makers/deepseek-v4-flash`（可选；当前内置免费测试模型） |

5. 环境变量生效可能需要重新部署。部署后，EdgeOne 会给出项目域名。服务端接口通常是 `https://<EdgeOne项目域名>/api/intake`。
6. **仍用原 GitHub Pages 记账本网址**（不要切换成新的 EdgeOne 网站，否则原浏览器里的本地数据库因站点域名不同而不可见）。打开“智能进货”，点“⚙ 配置”，填 EdgeOne 接口地址和第4步的 `LEDGER_ACCESS_TOKEN`（不是模型 Key）。
7. 输入示例：`闲鱼购入金花朵招财小滴流10个，单价2元；淘宝买了蓝色双吊5个，总价2.5元`。点“✨ AI 增强识别（可选）”，在预览中核对每项数据。确认无误才点击保存。

## 重要安全和费用说明

- 本项目为公共 GitHub 仓库，不得将任何真实 API Key、个人访问口令提交至仓库。
- EdgeOne 后台的 `MAKERS_MODELS_KEY` 只在服务端使用；网页仅需要你的 EdgeOne API URL 和独立的 `LEDGER_ACCESS_TOKEN`。网页仅保存接口 URL，不会主动持久化个人访问口令。
- 仅发送你主动提交的**进货描述文字**到 EdgeOne / 模型网关，不上传整个物料库、价格表、相册或历史销售。
- 内置模型为测试性质，免费额度、可用模型和质量以 Makers 当前控制台为准；未绑定付费厂商 Key 时不应主动选择付费厂商模型。
- 内置服务可能有限速；生产使用应在 EdgeOne 配额/风控页面设置访问限制。**仅有客户端 Origin 检查不等于防滥用，服务端个人口令必须高强度且保密。**
- AI 识别只是预览，不会未经确认直接入库；本地免费识别永远保留为后备。
- 官方部署参考：https://pages.edgeone.ai/zh/document/importing-a-git-repository
- 官方 Models 参考：https://pages.edgeone.ai/zh/document/models
