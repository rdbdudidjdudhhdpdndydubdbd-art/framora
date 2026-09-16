# Framora 摄影网站 — 自助使用指南(2026-09-16 更新)

## 网站地址

- 线上(任何电脑可访问):https://rdbdudidjdudhhdpdndydubdbd-art.github.io/framora/
- 本地编辑后台:http://localhost:5173/admin(密码见 `.env` 的 `ADMIN_PASSWORD`)
- GitHub 仓库:git@github.com:rdbdudidjdudhhdpdndydubdbd-art/framora.git(main 分支)

## 日常更新照片(三步)

```bash
# 1. 启动本地后台
cd "/Users/wangxfei/Claud code/摄影网站/摄影网站"
npm run dev
```

2. 浏览器打开 http://localhost:5173/admin,上传/编辑照片,**勾选「发布」**才会出现在线上。
3. 编辑完,回到终端按 `Ctrl+C` 停掉后台,执行:

```bash
# 4. 部署上线
npm run deploy
```

看到 `Published` 即成功,等 1~3 分钟后打开线上地址验证
(浏览器按 `Cmd+Shift+R` 强制刷新清缓存)。

## 部署机制(为什么必须跑 deploy)

线上是**静态网站**,本地后台只是编辑工具。上传的照片存在本机,
必须运行 `npm run deploy` 才会:构建 → 把已发布照片和页面推到
GitHub 的 `gh-pages` 分支 → GitHub Pages 自动发布。**没有自动同步。**

部署脚本是 `scripts/deploy-static.mjs`(自写,全量覆盖 gh-pages 分支)。
**不要改用 gh-pages npm 包**:它会把项目 `.gitignore` 的 `uploads/*`
排除规则带到部署目录,导致照片图片漏传、线上坏图(踩过坑)。

## 线上不更新的排查顺序

1. `npm run deploy` 是否输出了 `Published`?
2. GitHub 仓库 Settings → Pages → Build and deployment 区域:
   Source = "Deploy from a branch",Branch = `gh-pages` / `/(root)`。
   如果删过 gh-pages 分支,GitHub 可能不再自动构建——重新点一次 **Save**
   (或先切 GitHub Actions 再切回来)即可恢复。
3. 浏览器强刷(`Cmd+Shift+R`)。

## 修改代码后提交

```bash
git add -A
git commit -m "描述这次改动"
git push origin main
```

照片图片文件不进 git(太大),只有 `data/photos.json` 元数据入库作备份。

## 换电脑恢复

```bash
git clone git@github.com:rdbdudidjdudhhdpdndydubdbd-art/framora.git
cd framora && npm install
```

把照片原图放回 `uploads/original`、缩略图放回 `uploads/thumbnails`,
之后照常 `npm run dev` → `npm run deploy`。
