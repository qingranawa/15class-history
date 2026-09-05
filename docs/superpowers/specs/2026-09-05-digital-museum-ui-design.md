# 数字博物馆 UI 重构设计规范

> 状态：已实施（B「数字博物馆」方向）
>
> 视觉基线：B「数字博物馆」
>
> 适用技能：high-end-visual-design、impeccable、frontend-design-pro

## 设计目标

将 2025 级 15 班班级史记从当前的深黑金色、重圆角、多套组件风格混用的状态，重构为一套统一的数字博物馆界面。

核心气质是石白、墨黑、氧化朱红和充足留白，像一间长期维护的当代校史馆。页面首先服务于阅读和编纂工作，装饰只承担层级、状态和方向提示。

重构覆盖公开主站、独立信息页、登录页、投稿页和管理后台。史事数据、人物数据、评论、搜索、统计、关系图、登录认证、投稿审核、后台权限和 API 契约保持不变。

## 现状问题

- 公开页面使用深黑背景、金色文字、胶囊按钮和多种圆角卡片，信息层级缺少统一节奏。
- 主站、独立页面、登录页和管理后台分别使用不同颜色、控件半径和文字层级。
- 页面顶部辅助导航与班史内容导航职责混杂，导航视觉权重高于正文。
- 时间线卡片、搜索框、年级按钮和统计控件各自成套，整体像多个半成品组件拼接。
- 管理后台的数字指标、表格、侧边栏和系统设置没有共享产品令牌。
- 页面缺少统一的加载、空状态、错误状态、焦点状态和移动端布局约束。

## 视觉方向

### 方向

数字博物馆（Digital Museum）。

### 参考物

当代校史馆的展签、档案柜目录、博物馆阅览室和一套被长期维护的公共信息系统。

### 关键词

清楚、克制、可信、留白、可追溯。

### 色彩策略

采用 Restrained 策略。石白和白色承担大部分表面，墨黑承担文字和高对比区域，氧化朱红只用于当前状态、关键操作和少量时间线标记。

新组件禁止继续使用大面积金色渐变、紫蓝色管理员主题、装饰性发光和无语义渐变。

### 字体策略

公开页面使用中文衬线显示字体搭配中文无衬线 UI 字体：

- 显示字体：Noto Serif SC，回退到 Songti SC、SimSun、serif。
- UI 与正文：Noto Sans SC，回退到 PingFang SC、Microsoft YaHei、sans-serif。

管理后台、表格、表单和按钮统一使用 UI 字体，避免在操作控件中使用装饰性字体。

## 全局设计令牌

正式页面统一在 history/css/base/base.css 的 :root 中维护令牌，组件样式只引用语义令牌。

    --museum-paper: #f4f4f1
    --museum-surface: #ffffff
    --museum-surface-muted: #ecece7
    --museum-ink: #171714
    --museum-ink-soft: #44453f
    --museum-muted: #686963
    --museum-line: #d6d6cf
    --museum-line-strong: #b8b8af
    --museum-accent: #a33a2a
    --museum-accent-soft: #f1e4df
    --museum-success: #2f6b4c
    --museum-warning: #965c18
    --museum-danger: #a33a2a
    --font-display: "Noto Serif SC", "Songti SC", "SimSun", serif
    --font-ui: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif
    --radius-sm: 4px
    --radius-md: 8px
    --radius-lg: 12px
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1)

实现时保留旧变量兼容别名，逐个迁移组件，避免一次性删除旧变量导致未迁移模块失效。

## 页面信息架构

### 公共页面

所有公共页面使用同一套全宽顶部导航，顺序固定为：

品牌“15班史记”、首页、提交草稿、免责声明、指南、登录；每个入口都是真实 HTML 路由。

页面链接使用独立 HTML 路由，不使用 JS 模拟标签或信息模态框。每个页面的当前导航项使用 aria-current="page"，所有页面都可以通过“首页”直接返回主站。

公共路由保持：

- history/index.html
- history/contribute.html
- history/joinus.html
- history/guide.html
- history/disclaimer.html
- history/login.html
- history/submit.html

### 主站首页

主站首页的内容顺序调整为：

1. 全宽站点导航。
2. 班史主标题区。
3. 搜索和随机品读操作区。
4. 正史、最新、外史、戏史、相关人物、统计等内容导航。
5. 年级选择与排序控件。
6. 时间线、人物、统计或关系图内容。
7. 页脚。

顶部辅助导航只负责页面级路由，主内容导航只负责班史数据视图。

### 管理后台

管理后台继续使用 admin.html 单页应用和现有权限判断，页面入口保持：

工作台、全部史事、素材、草稿、待审核、全部人物、职员管理、系统。

“系统”整合系统配置、默认显示年级和操作日志。后续系统开关只放入该视图，不新增侧边栏入口。

## 组件规范

### 全宽顶部导航

导航结构使用 nav 和内部最大宽度容器；实现保留项目已有的 `page-nav` 命名：

    <nav class="page-nav" aria-label="班史辅助导航">
      <div class="page-nav__links">
        <a class="nav-btn page-nav__link" href="index.html" aria-current="page">首页</a>
      </div>
    </nav>

page-nav 跨越视口宽度，内部容器负责最大阅读宽度。导航不使用外层胶囊、浮动卡片、左右大圆角或独立漂浮容器。

桌面端链接按目录线排列，当前页只使用底部 2px 朱红线和浅朱红背景表示，不使用填充胶囊。移动端保持单行横向滚动，触摸目标高度至少 44px。

### 主站标题区

主站标题区采用博物馆展厅式左右分栏：

- 左侧放班级标识、15班史记主标题和学段说明。
- 右侧放产品说明、内容类型入口和当前默认年级。
- 桌面端使用约 1:1 的分栏比例。
- 移动端按标题、说明、操作顺序纵向排列。
- 主标题使用显示字体，最大字号不超过 7rem，并确保窄屏不溢出。

### 主内容导航

正史、最新、外史、戏史、相关人物和统计使用统一矩形控件：

- 圆角不超过 radius-md。
- 默认状态使用白色或浅灰表面、1px 细线和墨色文字。
- 当前状态使用氧化朱红背景或朱红文字。
- 所有控件拥有 hover、focus-visible、active、disabled 和 selected 状态。

年级按钮使用更轻的文字导航和底部标记，与主内容导航形成层级差异。

### 时间线卡片

时间线是主站核心内容，不再使用深色浮动卡片叠加发光阴影。

- 外层背景使用 museum-paper。
- 事件卡片使用 museum-surface。
- 卡片保留 1px 细线和 radius-md。
- 日期、年级和内容类型使用小字号元数据。
- 标题使用显示字体，正文限制在 65–75ch。
- 时间线连接线使用 museum-line-strong，当前节点使用 museum-accent。
- hover 只改变边线和轻微背景，不移动整个布局。

### 搜索和随机品读

搜索框和随机品读按钮处于同一行：

- 搜索框占据剩余宽度。
- 随机品读使用朱红实心按钮，作为该行唯一主操作。
- 两者均使用 radius-md，不使用 30px 以上圆角。
- 搜索输入聚焦时显示 2px 朱红 focus ring。

### 独立信息页

contribute.html、joinus.html、guide.html 和 disclaimer.html 使用同一页面壳：

- 全宽站点导航。
- 约 760–860px 的正文阅读列。
- 页面标题、说明、段落和列表共享文字层级。
- 联系人使用两列信息块，移动端变为单列。
- 协议链接使用标准文本链接。

### 登录页与投稿页

登录和投稿使用真实 HTML 表单：

- 每个输入必须有对应 label。
- 登录页的登录/注册使用真实 button[role="tab"] 和 section[role="tabpanel"]。
- 投稿页使用独立 form，提交状态写入 role="alert" 或 role="status" 区域。
- 错误、加载、成功状态不通过 alert 或模态框承载。
- 所有表单控件复用同一组边框、圆角、焦点和按钮令牌。

### 管理后台

管理后台采用高密度产品布局：

- 侧边栏使用固定宽度和单色深色表面，当前项使用朱红色标记。
- 主内容区域使用石白背景和白色表面。
- 统计数字使用墨色大字号，状态数字使用语义色。
- 表格、表单和弹窗使用 radius-sm 或 radius-md。
- 系统页面按系统设置、统计信息、操作日志的顺序组织内容。
- 默认显示年级控件与首页配置保持同一套表单语言。

史事详情、搜索、随机品读和关系图等业务模态框可以保留，但不能用于页面说明、登录、投稿或协议内容。

## 动效与状态

- 导航 hover、focus、selected 使用 160–220ms 的 ease-out。
- 页面切换或内容进入使用轻微透明度和位移，不使用连续漂浮。
- 不动画布局尺寸、top、left 或大量阴影。
- prefers-reduced-motion: reduce 下移除位移和延迟，仅保留必要的颜色或边框状态。
- 加载状态优先使用骨架屏或明确的文本占位。
- 空状态说明下一步动作，例如“暂无待审核稿件，新的稿件提交后会显示在这里”。

## 响应式规则

断点继续遵守项目约定：

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

具体行为：

- 低于 1024px 时，主站标题区减少左右留白，内容分栏开始收缩。
- 低于 768px 时，标题区、搜索区、时间线和后台预览统一改为单列。
- 低于 640px 时，顶部导航保持单行横向滚动，所有触摸目标至少 44px。
- 管理后台低于 768px 时，侧边栏改为顶部横向菜单或可折叠菜单，表格允许横向滚动。
- 任何页面都不能依赖固定 100vh，使用 min-height: 100dvh 或自然文档流。

## 内容与数据约束

本次 UI 重构不修改 history/data.js 的静态数据结构，不修改 auth.js 的公开浏览、登录态和默认年级读取契约，不修改 records、characters、materials 和 users 的业务接口，不修改史事状态机、人物字段、素材状态机和审核流程。

页面只调整 HTML 结构、CSS 令牌、组件渲染方式和导航呈现。默认年级继续由后台配置决定，没有配置时回退“八上”。

## 可访问性验收标准

- 页面级导航使用 nav 和真实链接。
- 当前页使用 aria-current="page"。
- 登录页 tab 使用 aria-selected、aria-controls 和对应 tabpanel。
- 所有表单输入使用可见 label。
- 所有键盘可操作元素拥有可见 focus-visible 状态。
- 正文、辅助文字、按钮和 placeholder 达到 WCAG AA 对比度。
- 页面缩放到 200% 时不丢失主要操作。
- prefers-reduced-motion 下不出现强制动画。

## 验收标准

1. 主站、四个信息页、登录页和投稿页使用同一套导航、字体和色彩令牌。
2. 主站顶部导航横跨整个视口宽度，保持平直的 Apple 式站点栏，不显示胶囊容器或漂浮角。
3. 页面说明、协议、登录和投稿全部由独立 HTML 路由承载。
4. 首页无登录态仍可直接浏览，登录入口始终可从导航访问。
5. 登录和注册仍可调用现有 API，并能返回首页。
6. 已登录用户可以进入投稿页，未登录用户得到清晰的登录引导。
7. 主站默认年级仍读取后台配置，没有配置时为“八上”。
8. 管理后台功能和权限不变，但颜色、表格、表单、侧边栏和系统页使用统一产品令牌。
9. 公开站和后台在 1440px、1024px、768px、390px 宽度下没有横向溢出或文字截断。
10. 通过 JavaScript 语法检查、HTML 路由检查、链接检查、关键交互检查和浏览器视觉 QA。

## 计划修改范围

- history/index.html
- history/contribute.html
- history/joinus.html
- history/guide.html
- history/disclaimer.html
- history/login.html
- history/submit.html
- history/login.js
- history/submit.js
- history/auth.js
- history/admin.html
- history/js/admin.js
- history/js/core/main.js
- history/js/core/controls.js
- history/js/ui/modal.js
- history/css/base/base.css
- history/css/layout/layout.css
- history/css/components/navigation.css
- history/css/components/info-pages.css
- history/css/login.css
- history/css/admin.css

不新增第三方 UI 框架，不更改 Worker API，不更换用户提供的内容和素材。
