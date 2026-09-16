// 把 dist/ 全量推送到 GitHub Pages 的 gh-pages 分支。
//
// 代替 gh-pages npm 包：该包会把项目 .gitignore 的 /uploads/* 排除规则
// 应用到部署目录，导致 dist/uploads 里的照片图片被漏推（线上坏图）。
// 这里在干净的临时目录里重建分支并用 --force 全量覆盖，
// 每次部署都是 dist 的完整快照，旧文件自动清除。
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(projectRoot, 'dist')
const workDir = mkdtempSync(path.join(tmpdir(), 'framora-pages-'))

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

// 从主仓库继承 git 身份与远程地址，临时仓库里也需要它们
const userName = execSync('git config user.name', { cwd: projectRoot }).toString().trim()
const userEmail = execSync('git config user.email', { cwd: projectRoot }).toString().trim()
const remoteUrl = execSync('git remote get-url origin', { cwd: projectRoot }).toString().trim()

try {
  cpSync(distDir, workDir, { recursive: true })
  run(`git init -q -b gh-pages ${workDir}`)
  run(`git -C ${workDir} -c user.name="${userName}" -c user.email="${userEmail}" add -A`)
  run(`git -C ${workDir} -c user.name="${userName}" -c user.email="${userEmail}" commit -q -m "Deploy site ${new Date().toISOString()}"`)
  run(`git -C ${workDir} remote add origin ${remoteUrl}`)
  run(`git -C ${workDir} push --force -q origin gh-pages`)
  console.log('Published')
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
