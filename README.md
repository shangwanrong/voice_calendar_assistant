# 语音日历 - 微信小程序

一款以**语音交互为核心**的日历管理工具，通过自然语言语音指令即可完成日程的添加、删除、查看、修改和提醒管理。

## 演示视频

[![语音日历演示视频](https://img.shields.io/badge/B站-点击观看演示-blue?logo=bilibili)](https://www.bilibili.com/video/BV1L4Vn6pET5/)

## 功能特性

### 语音交互

| 功能 | 语音示例 | 说明 |
|------|---------|------|
| 添加事件 | "明天下午3点开会" | 自动解析日期+时间+事件名 |
| 删除事件 | "删除明天的开会" | 按事件名+日期匹配 |
| 查看事件 | "今天有什么安排" | 查询指定日期的事件列表 |
| 修改事件 | "把开会改到4点" | 修改已有事件的时间/日期/标题 |
| 重复事件 | "每天早上8点上课" | 支持每天/工作日/每周/每月 |
| 智能追问 | 缺少日期或时间时自动追问 | "请问是哪一天？" / "几点？" |
| 语音播报 | 操作完成后语音反馈 | "已添加明天下午3点的开会" |
| 无效指令识别 | "今天天气怎么样" | 自动识别非日程指令 |

### 日历管理

- **月视图**：显示当月日期网格，有事件的日期标注圆点
- **日视图**：展示某天的所有事件列表
- **事件卡片**：显示事件名称、时间、分类颜色
- **手动添加/编辑**：完整的表单操作
- **事件提醒**：支持提前5/10/15/30/60分钟提醒

## 技术架构

```
语音输入 → 百度ASR(语音转文字) → DeepSeek AI(NLP解析) → 本地存储(事件管理)
                                                          ↓
                                                     百度TTS(语音播报)
```

### 技术栈

| 类别 | 方案 | 说明 |
|------|------|------|
| 前端框架 | 微信小程序原生 | 稳定、兼容性好 |
| 语音识别 | 百度智能云 ASR | `server_api` + aac录音/m4a声明 |
| NLP解析 | DeepSeek AI + 本地规则引擎 | AI优先，超时降级本地解析 |
| 语音播报 | 百度 TTS | `text2audio` API |
| 数据存储 | `wx.setStorageSync` | 纯本地存储，无需服务器 |
| 提醒通知 | 小程序内弹窗 + 订阅消息(预留) | 当前仅小程序内提醒 |

## 项目结构

```
calendar/
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── assets/icons/                    # tabBar图标
│   ├── components/
│   │   ├── calendar/                    # 月历组件
│   │   ├── event-card/                  # 事件卡片组件
│   │   └── voice-btn/                   # 语音按钮组件
│   ├── pages/
│   │   ├── index/                       # 首页(月历+语音+事件列表)
│   │   ├── day/                         # 日视图
│   │   ├── event-add/                   # 手动添加事件
│   │   ├── event-detail/                # 事件详情/编辑
│   │   └── settings/                    # 设置页
│   └── utils/
│       ├── ai-nlp.js                    # DeepSeek AI NLP解析
│       ├── config.example.js            # API密钥配置模板
│       ├── config.js                    # API密钥配置(不入库)
│       ├── constants.js                 # 常量定义
│       ├── event-store.js               # 事件数据CRUD
│       ├── nlp.js                       # 本地NLP规则引擎
│       ├── reminder.js                  # 日程提醒
│       ├── time-parser.js               # 时间/日期解析
│       ├── tts.js                       # 语音播报(TTS)
│       └── voice.js                     # 语音录制/识别
├── cloudfunctions/                      # 云函数(未部署)
├── docs/
│   └── 演示视频.mp4
├── .gitignore
├── project.config.json
└── README.md
```

## 快速开始

### 1. 环境准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号，获取 AppID
- 注册 [百度智能云](https://cloud.baidu.com/) 账号，创建语音识别应用获取 API Key 和 Secret Key
- 注册 [DeepSeek](https://platform.deepseek.com/) 账号，获取 API Key

### 2. 配置密钥

```bash
cp miniprogram/utils/config.example.js miniprogram/utils/config.js
```

编辑 `miniprogram/utils/config.js`，填入你的密钥：

```javascript
var BAIDU_API_KEY = '你的百度智能云API Key'
var BAIDU_SECRET_KEY = '你的百度智能云Secret Key'
var DEEPSEEK_API_KEY = '你的DeepSeek API Key'
var DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
```

### 3. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」，目录选择 `calendar`
3. AppID 填入你的小程序 AppID
4. 在「详情 → 本地设置」中勾选「不校验合法域名」

### 4. 真机调试

- 开发者工具中点击「预览」，微信扫码即可在手机上测试
- 或点击「真机调试」获取详细日志

## 语音指令示例

### 基础指令

| 指令 | 效果 |
|------|------|
| 明天下午三点开会 | 添加明天15:00的"开会"事件 |
| 后天晚上八点提醒我睡觉 | 添加后天20:00的"睡觉"事件 |
| 下周一早上九点上班打卡 | 添加下周一09:00的事件 |
| 5月20号下午两点约会 | 添加指定日期14:00的事件 |
| 本周五晚上看电影 | 添加本周五晚上的事件 |

### 重复事件

| 指令 | 效果 |
|------|------|
| 每天早上七点起床 | 创建30天的每天重复事件 |
| 每周三下午四点健身 | 创建12周的每周重复事件 |
| 从下周一开始持续两周每天上课，周六周日不上课 | 创建10个工作日事件 |

### 修改/删除/查询

| 指令 | 效果 |
|------|------|
| 把明天的开会改到下午3点 | 修改事件时间 |
| 把开会改到后天 | 修改事件日期 |
| 把开会改名为项目评审 | 修改事件标题 |
| 删除明天的开会 | 删除匹配的事件 |
| 今天有什么安排 | 查询今日事件 |

### 智能追问

| 用户说 | 系统回应 |
|--------|---------|
| 开会 | "请问'开会'是哪一天几点？" |
| 明天开会 | "请问'开会'几点？" |
| 下午三点开会 | "请问'开会'是哪一天？" |

### 无效指令

| 用户说 | 系统回应 |
|--------|---------|
| 今天天气怎么样 | "这不是日程指令" |
| 播放音乐 | "这不是日程指令" |

## 域名配置

上线前需在 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发管理 → 开发设置 → 服务器域名中添加：

| 类型 | 域名 |
|------|------|
| request合法域名 | `https://aip.baidubce.com` |
| request合法域名 | `https://vop.baidu.com` |
| request合法域名 | `https://tsn.baidu.com` |
| request合法域名 | `https://api.deepseek.com` |

开发阶段在开发者工具中勾选「不校验合法域名」即可跳过此限制。

