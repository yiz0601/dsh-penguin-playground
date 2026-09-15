#!/usr/bin/env node
/**
 * 打一个可以直接 `dsh plugin --profile <name> add <tgz>` 的 tarball 到 dist/。
 *
 * 只装 package.json 的 files 字段里列的那几样 + README / LICENSE，
 * 跟 npm pack 的结构一致（所有东西在 package/ 目录下）。
 */
import { mkdirSync, rmSync, copyFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const stageRoot = join(root, '.pack')
const stage = join(stageRoot, 'package')
const dist = join(root, 'dist')
const out = join(dist, `${pkg.name}-${pkg.version}.tgz`)

rmSync(stageRoot, { recursive: true, force: true })
mkdirSync(join(stage, 'lib'), { recursive: true })

for (const f of ['package.json', 'cordis.patch.yml', 'README.md', 'LICENSE']) {
  copyFileSync(join(root, f), join(stage, f))
}
for (const f of pkg.files.filter((f) => f.startsWith('lib/'))) {
  copyFileSync(join(root, f), join(stage, f))
}

mkdirSync(dist, { recursive: true })
const tar = spawnSync('tar', ['-czf', out, '-C', stageRoot, 'package'], { stdio: 'inherit' })
rmSync(stageRoot, { recursive: true, force: true })

if (tar.error) {
  console.error('打包失败：找不到 tar 命令？', tar.error.message)
  process.exit(1)
}
if (tar.status !== 0) process.exit(tar.status ?? 1)

console.log(`\n打包完成  ${out}`)
console.log(`安装      dsh plugin --profile <profile> add "${out}"`)
