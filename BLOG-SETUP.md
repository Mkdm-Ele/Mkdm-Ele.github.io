# 开通博客（只需要配置一次）

网站已接入你提供的 Supabase 项目和公开密钥。本地设置保存在 `.env.local`，该文件不会提交到 Git。

## 1. 创建文章表和权限规则

打开 [Supabase SQL Editor](https://supabase.com/dashboard/project/uodpghphgcgryxkmocst/sql/new)，新建查询，将 `supabase/001-blog.sql` 的全部内容粘贴进去，点击 **Run**。

该文件创建文章表，并开启数据库级别的权限限制：

- 未登录访客、其他登录用户：只能阅读已发布文章。
- 你指定的唯一管理员：可以阅读草稿、新建、修改、发布和删除文章。
- 网页不能自行添加管理员。仅在前端隐藏按钮不能替代这些规则。

## 2. 检查登录返回地址

Supabase → Authentication → URL Configuration：

- **Site URL**：`http://localhost:5173`
- **Redirect URLs** 添加：`http://localhost:5173/admin` 和 `http://localhost:5173/admin/`

GitHub OAuth App 的 Callback / Redirect URI 保持：

```text
https://uodpghphgcgryxkmocst.supabase.co/auth/v1/callback
```

GitHub Client Secret 只保存在 Supabase 的 GitHub 登录设置中，不要放进网页或前端环境变量。

## 3. 登录自己的 GitHub

在项目目录启动：

```sh
npm run dev
```

打开 [写作后台](http://localhost:5173/admin/)，点击 **Continue with GitHub**。

首次登录后会显示“当前账号还没有写作权限”和你的 **User UID**。复制这串 UUID。
也可在 Supabase → Authentication → Users 中复制该用户的 UID；确认是你自己的 GitHub 账号。

## 4. 指定你为管理员

打开 `supabase/002-owner.sql`，将 `YOUR_USER_UUID` 替换成上一步的完整 UUID。
把修改后的 SQL 在 Supabase SQL Editor 中执行。

回到写作后台，点击 **重新检查权限**，即可进入编辑器。
数据库按固定用户 UUID 判断权限，任何其他用户首次登录都不会自动成为管理员。

## 5. 写作

- 标题支持中文或英文。文章链接使用小写英文字母、数字和连字符；中文标题会获得默认链接，可手动修改。
- 正文采用类似 Typora 的单栏即时渲染：直接输入 Markdown，标题、加粗、列表等格式在原位呈现。
- 点击“文章目录”展开或收起文章列表；点击“文章设置”修改链接和摘要。
- “专注写作”进一步放大书写区域，按 Esc 退出；Ctrl / ⌘ + S 保存当前文章。
- 支持标题、列表、表格、引用、代码块，以及图片 URL。
- **保存草稿**：仅管理员可见。
- **发布文章**：出现在首页博客区和博客列表。
- **保存修改**：已发布文章直接更新线上内容。
- **转为草稿**：访客无法再阅读。
- **删除文章**：永久删除，需要确认。
- 切换文章或离开页面时，未保存修改会触发提示。
- 多个窗口同时修改同一文章时，旧版本无法覆盖更新后的内容；请先复制正文再重新打开。
- 文章保存在 Supabase，发布文章不需要重新构建网站。

阅读入口：[博客](http://localhost:5173/blog/)。
文章链接格式：`/blog/?post=your-slug`。

## 发布网站时

1. 在构建环境配置 `.env.example` 中的两个变量，使用同一项目的 URL 和 Publishable key。
2. 运行 `npm run build`，部署 `dist`。
3. Supabase 的 Site URL 改为正式站点地址，并在 Redirect URLs 中加入 `https://你的域名/admin` 和带结尾斜杠的版本。
4. GitHub 的 Homepage URL 改成正式站点地址。上面的 Supabase Callback URL 不变。
5. 打开正式网站 `/admin/`，重新登录验证写作。

构建会生成 `dist/blog/index.html` 和 `dist/admin/index.html`。静态托管需支持目录首页（通常默认支持）；文章使用查询参数，无需动态服务器路由。

## 验证与已知状态

- Supabase 项目连接和 GitHub Provider 已通过实际接口确认可用。
- 表结构和行级权限通过本地 PostgreSQL（PGlite）测试。
- 写作与阅读交互通过使用模拟 API 的浏览器测试；这些测试不写入真实 Supabase。
- 真实端到端登录、数据库保存需要先完成上面的 SQL 与账号绑定。
- Markdown 渲染会清理脚本、危险链接和事件处理属性；不执行文章里的 HTML 脚本。

官方参考：[GitHub 登录](https://supabase.com/docs/guides/auth/social-login/auth-github)、[返回地址](https://supabase.com/docs/guides/auth/redirect-urls)、[行级权限](https://supabase.com/docs/guides/database/postgres/row-level-security)。

## 图片插入、上传和排版

已有图片网址无需额外配置。在写作工具栏点击 **插入图片**，粘贴图片地址，可选填写图片说明。也可直接输入 `![说明](图片地址)`。图片默认居中；点击图片打开操作栏，网址只在「图片设置」中编辑。

将一张图片拖到另一张图片的左侧或右侧，看到橙色竖线后松开即可并排；拖到段落上方或下方，看到横线后松开即可调整顺序。也可使用「与上一张并排」「独占一行」「上移」「下移」按钮。排版支持撤销/重做，保存后在公开文章中保持一致。

### 启用本地图片上传（一次）

1. 打开此项目的 [Supabase SQL Editor](https://supabase.com/dashboard/project/uodpghphgcgryxkmocst/sql/new)。
2. 复制项目中 `supabase/003-blog-images.sql` 的完整内容，粘贴并点击 **Run**。此前的 `001-blog.sql` 和 `002-owner.sql` 应已执行。
3. 刷新写作后台，即可通过「插入图片 → 选择本地图片」、粘贴截图或拖入文件上传图片。

支持 PNG、JPG、WebP、GIF、AVIF，每张不超过 6 MB。上传时暂时锁定编辑与切换文章，避免图片插到错误文章中；失败会保留正文并给出提示。多图上传中已成功的图片会保留，不会因下一张失败而丢失。

该配置建立 `blog-images` 公开图片存储空间，仅现有站主账号可以上传、列出或删除文件。图片通过公开 URL 展示：即使文章尚为草稿，持有图片链接的人也能查看图片。请勿将此空间用作私密文件存储。

文章正文仍保存为普通 Markdown。同一段落内的连续图片显示为并排布局，空行分隔的图片各占一行。「移除图片」只移除正文引用，不自动删除存储文件，以免破坏其他文章引用的同一图片。

实现依据：[Supabase Storage 上传](https://supabase.com/docs/guides/storage/uploads/standard-uploads)及[访问控制](https://supabase.com/docs/guides/storage/security/access-control)。

### 调整图片大小

点击正文中的图片，拖动橙色边框上的任意角点或边缘手柄即可缩放，图片保持原始比例，下方显示当前尺寸。拖动图片内部仍用于移动位置；在并排布局中可单独缩小一张图片。

选择「恢复默认大小」可清除自定义尺寸。缩放支持撤销 / 重做、Esc 取消当前手势；聚焦手柄后可用方向键微调，Shift + 方向键每次调整 50 像素。保存文章后，重新打开和公开阅读页均保留尺寸；较窄屏幕会自动适配正文宽度。

自定义宽度通过 Markdown 图片 title 中的 `mkdm-width:320` 后缀保存，原有图片说明和标题会保留。该信息不会显示在正文里；不需要新增数据库配置。

## 斜体与 LaTeX 公式

斜体使用 `*斜体文字*` 或 `_italic text_`，也可以选中文字后点击工具栏的斜体按钮。中英文均支持。

行内公式使用单个美元符号，例如 `$v=\frac{d}{t}$`。独立公式使用两行 `$$` 包住内容：

```latex
$$
J(\theta)=\sum_{t=0}^{T}\gamma^t r_t
$$
```

在写作区直接输入上面的 Markdown，不要额外套代码块。公式会在原位预览；点击公式可编辑源码，移动光标到其他段落后查看完整排版。支持分式、上下标、根号、求和、矩阵、`aligned` 等常见 LaTeX 数学语法。代码块及行内代码里的公式符号仍保持原样；普通美元符号可写成 `\$`。

保存、重新打开和公开文章页均渲染公式。数学引擎、样式与字体随网站本地提供，不依赖外部 CDN。错误公式保留并提示错误，不影响其余正文；不需要修改 Supabase 或执行 SQL。
