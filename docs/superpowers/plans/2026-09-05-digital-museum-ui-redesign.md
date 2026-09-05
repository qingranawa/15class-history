# 数字博物馆 UI 重构实施计划

~~~markdown
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.
~~~

**Goal:** 将主站、独立页面、登录投稿页和管理后台统一重构为 B「数字博物馆」视觉系统，同时保持现有功能、API、权限和数据结构。

**状态：** 已实施，待用户决定是否提交和推送。

**Architecture:** 保留原生 HTML/CSS/JS 和现有文件边界，先建立共享视觉令牌与公共页面壳，再逐个迁移页面。主站继续由 auth.js、main.js 和 controls.js 启动，后台继续由 admin.js 驱动，不引入框架或后端改动。

**Tech Stack:** 原生 HTML、CSS、ES2022 JavaScript、Cloudflare Pages、现有 Worker/D1 API、Node.js syntax checks、Playwright/Chrome visual QA。

**Spec:** docs/superpowers/specs/2026-09-05-digital-museum-ui-design.md

## Global Constraints

- 保持现有 API、权限、数据结构、史事状态机和审核流程。
- 使用数字博物馆方向：石白、白色、墨黑、氧化朱红。
- 公开显示字体使用 Noto Serif SC，UI 字体使用 Noto Sans SC，并提供现有中文字体回退。
- 页面导航使用全宽平直站点栏，不使用胶囊容器或漂浮角。
- 独立信息页、登录页和投稿页保持真实 HTML 路由。
- 所有新交互保留键盘焦点、错误、加载、成功和 reduced-motion 状态。
- 只修改完成任务所需的文件，保留工作区已有未跟踪文件。

---

### Task 1: 建立共享视觉令牌和公共页面壳

**Files:**
- Modify: history/css/base/base.css
- Modify: history/css/layout/layout.css
- Modify: history/css/components/navigation.css
- Modify: history/index.html
- Modify: history/contribute.html
- Modify: history/joinus.html
- Modify: history/guide.html
- Modify: history/disclaimer.html
- Modify: history/login.html
- Modify: history/submit.html
- Create: history/css/museum-theme.css

**Interfaces:**
- Consumes: 现有各页面的 page-nav、container、hero、info-page-container 和 CSS 变量。
- Produces: 共享 page-nav、page-nav__links、nav-btn 样式，以及 museum-* 语义令牌。保留现有 page-nav 命名，减少无必要的 HTML 迁移。

- [x] **Step 1: 先执行基线语法检查**

Run:

~~~powershell
node --check history/auth.js
node --check history/login.js
node --check history/submit.js
Get-Content -Raw history/js/core/main.js | node --input-type=module --check
Get-Content -Raw history/js/core/controls.js | node --input-type=module --check
~~~

Expected: 当前 JavaScript 文件语法检查通过；根目录 npm test 继续返回已有的 no test specified 占位结果。

- [x] **Step 2: 增加共享语义令牌**

在 history/css/base/base.css 的 :root 增加 museum-paper、museum-surface、museum-surface-muted、museum-ink、museum-ink-soft、museum-muted、museum-line、museum-line-strong、museum-accent、museum-accent-soft、museum-success、museum-warning、museum-danger、font-display、font-ui、radius-sm、radius-md、radius-lg、ease-out 和 duration 变量。

保留旧变量，先让旧组件继续工作；新组件只引用新语义变量。

- [x] **Step 3: 建立全宽站点栏样式**

page-nav 跨越视口宽度，page-nav__links 负责最大宽度和左右内边距。桌面端链接排列在一条平直底线上，当前页使用朱红底部标记；移动端保持单行横向滚动，每个链接高度不少于 44px。

验证选择器必须满足：

~~~css
.page-nav {
    width: 100%;
    border-bottom: 1px solid var(--museum-line);
    border-radius: 0;
}

.page-nav__links {
    display: flex;
    min-height: 64px;
    max-width: 1280px;
    margin: 0 auto;
}
~~~

- [x] **Step 4: 将 7 个公共页面的导航迁移到共享结构**

每个页面的导航都使用同样的站点链接顺序：品牌“15班史记”、首页、提交草稿、免责声明、指南、登录；每个入口都是真实 HTML 路由，并保留当前页 aria-current。

删除旧 page-nav、nav-group、nav-divider 结构的引用，避免旧样式继续影响新页面。

- [x] **Step 5: 运行页面结构检查**

Run:

~~~powershell
$pages = Get-ChildItem history -Filter '*.html' -File
foreach ($page in $pages) {
  Select-String -LiteralPath $page.FullName -Pattern 'page-nav__links' -Quiet
}
git diff --check
~~~

Expected: 7 个公共页面包含共享站点栏，差异检查无错误。

### Task 2: 重构主站首页视觉层级

**Files:**
- Modify: history/index.html
- Modify: history/css/layout/layout.css
- Modify: history/css/components/navigation.css
- Create: history/css/museum-theme.css
- Consume: history/css/components/timeline.css
- Consume: history/css/components/buttons.css
- Consume: history/css/components/search.css
- Consume: history/css/components/stats.css
- Consume: history/css/components/characters.css
- Consume: history/css/components/graph.css
- Consume: history/css/effects/animations.css
- Preserve: history/js/core/controls.js and existing content modules

**Interfaces:**
- Consumes: historyData、extraHistory、dramaHistory、characters、existing view switch functions and URL query state.
- Produces: public home with museum title area, clear main navigation, readable timeline, consistent controls and responsive layout.

- [x] **Step 1: 调整首页 DOM 顺序**

将首页结构整理为站点栏、主标题区、搜索操作区、内容类别导航、年级/排序控件、动态内容和页脚。保留现有元素 ID，确保 controls.js、stats.js、graph.js 和 render.js 不需要改 API。

- [x] **Step 2: 重构标题和搜索区域**

标题区使用左右分栏，左侧显示 15班史记，右侧显示学段说明和当前内容提示。搜索框和随机品读按钮在桌面端同一行，移动端纵向堆叠。

- [x] **Step 3: 迁移主类别和年级控件**

将 extra-btn 从胶囊改为 radius-md 矩形控件，将当前态改为朱红状态。年级按钮使用文字链接加底部标记，并确保八上默认逻辑和 URL 恢复逻辑不变。

- [x] **Step 4: 重构时间线和内容卡片**

将事件卡片迁移到 museum-paper/museum-surface 层级，减少发光阴影和大圆角，保留现有点击查看详情、人物关联、评论和分享入口。

- [x] **Step 5: 增加 reduced-motion 规则**

所有新入场和 hover 动效使用 ease-out 令牌，只动画 transform、opacity、颜色或边框；在 prefers-reduced-motion: reduce 下关闭位移和延迟。

- [x] **Step 6: 运行主站静态检查**

Run:

~~~powershell
Get-Content -Raw history/js/core/controls.js | node --input-type=module --check
Get-Content -Raw history/js/core/main.js | node --input-type=module --check
git diff --check
~~~

Expected: 两个主站模块语法通过，差异检查无错误。

### Task 3: 统一独立信息页、登录页和投稿页

**Files:**
- Modify: history/contribute.html
- Modify: history/joinus.html
- Modify: history/guide.html
- Modify: history/disclaimer.html
- Modify: history/login.html
- Modify: history/submit.html
- Modify: history/css/components/info-pages.css
- Modify: history/css/login.css
- Modify: history/auth.js
- Modify: history/login.js
- Modify: history/submit.js

**Interfaces:**
- Consumes: siteAuth、现有 auth API、现有独立 HTML routes。
- Produces: all independent pages with a shared museum shell, actual forms, consistent states and real navigation.

- [x] **Step 1: 统一信息页阅读列**

四个说明页使用相同的 info-page shell、760–860px 阅读宽度、h1/h2/p/list 层级和联系人信息块。协议、邮件和微信号使用语义文本链接或等宽信息，不使用装饰性胶囊。

- [x] **Step 2: 统一登录页表单**

保留真实 login/register forms 和 role tab/tabpanel 结构，迁移输入、按钮、错误消息、成功消息和键盘切换样式到 museum 令牌。

- [x] **Step 3: 统一投稿页表单**

保留 autoLogin 守卫和 POST /materials 行为，迁移到页面内表单。未登录状态提供真实 login.html 链接，错误和成功状态保留 alert/status 语义。

- [x] **Step 4: 清理首页认证残留**

确认 index.html 不再包含 authModal 或 submitModal，auth.js 在没有 mainContent 的 login.html 和 submit.html 中只提供 siteAuth，不执行首页初始化。

- [x] **Step 5: 运行路由和表单结构检查**

Run:

~~~powershell
$routes = @('index.html','contribute.html','joinus.html','guide.html','disclaimer.html','login.html','submit.html')
foreach ($route in $routes) {
  Test-Path (Join-Path 'history' $route)
}
rg -n 'authModal|submitModal|showContributeModal|showJoinUsModal|showGuideModal|showDisclaimerModal' history/index.html history/auth.js history/login.js history/submit.js
node --check history/auth.js
node --check history/login.js
node --check history/submit.js
~~~

Expected: 所有路由文件存在，首页说明/登录/投稿模态残留为空，3 个脚本语法通过。

### Task 4: 重构管理后台产品 UI

**Files:**
- Modify: history/admin.html
- Modify: history/js/admin.js
- Modify: history/css/admin.css

**Interfaces:**
- Consumes: currentUser、existing admin navigation IDs、all existing API calls and permission helpers.
- Produces: museum product shell for dashboard, tables, forms, system settings, logs and sidebar.

- [x] **Step 1: 统一后台颜色和字体令牌**

将 admin.css 的紫蓝主题迁移为 museum-paper、museum-surface、museum-ink、museum-muted、museum-accent 和语义状态色。保留登录页和业务组件的 DOM ID。

- [x] **Step 2: 统一侧边栏和导航状态**

保留当前权限筛选，但将入口标签、间距、当前项、badge、hover、focus 和 disabled 状态统一到数字博物馆产品语言。避免新增业务入口。

- [x] **Step 3: 重构工作台、表格和表单**

统计卡片、数据表、模态表单、空状态和错误状态使用统一半径、间距和文字层级。数字突出信息价值，不使用发光或夸张阴影。

- [x] **Step 4: 重构系统页面**

保持系统页面整合默认年级、统计、权限说明和操作日志的既有结构，改为系统设置、统计信息、操作日志的清晰分区。默认年级保存 API 和权限规则不变。

- [x] **Step 5: 运行后台语法检查**

Run:

~~~powershell
node --check history/js/admin.js
git diff --check
~~~

Expected: admin.js 语法通过，差异检查无错误。

### Task 5: 统一文档、链接和验证

**Files:**
- Modify: docs/project-knowledge/architecture.md
- Modify: docs/project-knowledge/features.md
- Modify: docs/superpowers/specs/2026-09-05-digital-museum-ui-design.md
- Modify: history/index.html

**Interfaces:**
- Consumes: completed public and admin UI.
- Produces: accurate project documentation and final verification evidence.

- [x] **Step 1: 同步页面目录与架构说明**

更新 docs 中的页面入口、共享导航、登录/投稿独立路由和主站/后台视觉职责。保留 API、D1 和权限说明的真实边界。

- [x] **Step 2: 检查所有内部链接**

Run:

~~~powershell
$pages = Get-ChildItem history -Filter '*.html' -File
$targets = @('index.html','contribute.html','joinus.html','guide.html','disclaimer.html','login.html','submit.html')
foreach ($page in $pages) {
  $links = Select-String -LiteralPath $page.FullName -Pattern 'href="([^"]+\.html)"' -AllMatches
  foreach ($match in $links.Matches) {
    $target = $match.Groups[1].Value
    if ($target -notin $targets) { continue }
    if (-not (Test-Path (Join-Path $page.DirectoryName $target))) {
      Write-Error ($page.Name + ' links to missing ' + $target)
      exit 1
    }
  }
}
Write-Output 'Internal HTML links passed'
~~~

Expected: 所有站内 HTML 链接指向存在的页面。

- [x] **Step 3: 执行最终验证**

Run:

~~~powershell
node --check history/auth.js
node --check history/login.js
node --check history/submit.js
node --check history/js/admin.js
Get-Content -Raw history/js/core/main.js | node --input-type=module --check
Get-Content -Raw history/js/core/controls.js | node --input-type=module --check
Get-Content -Raw history/js/ui/modal.js | node --input-type=module --check
git diff --check
~~~

Expected: all listed JavaScript files pass syntax checks and git diff check has no errors. The root npm test placeholder remains documented as unavailable.

- [x] **Step 4: 浏览器视觉 QA**

Run the local static server and inspect at 1440px, 1024px, 768px and 390px. Check main page, each independent page, login/register switching, submit guard/form, admin login, dashboard, tables and system settings. Confirm no console errors, no horizontal overflow, and no missing links.

- [x] **Step 5: Final handoff**

Report changed files, completed verification, known limitation that the repository has no real npm test suite, and whether the user wants the completed redesign committed and pushed.
