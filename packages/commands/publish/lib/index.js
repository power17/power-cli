'use strict'
const Command = require('@power-cli/command')
const log = require('@power-cli/log')
const path = require('path')
const fs = require('fs')
const Git = require('@power-cli/git')
class PublishCommand extends Command {
  init() {
    console.log('publish init')
  }
  async exec() {
    const startTime = new Date()
    // 1、初始化检查
    this.prepare()
    // 2、git flow 自动化
    const git = new Git(this._cmd, this.projectInfo)
    await git.init()
    await git.commit()
    // 3、云构建和云发布
    const endTime = new Date()
    log.info(`发布耗时:${endTime - startTime}`)
  }
  prepare() {
    // 检查是否是npm项目
    const cwd = process.cwd()
    const pkgPath = path.resolve(cwd, 'package.json')
    const pkg = require(pkgPath)
    // 确认name version build命令
    const { name, version, scripts } = pkg
    log.verbose('package.json', pkgPath, name, version, scripts)
    if (!name || !version || !scripts || !scripts.build) {
      throw new Error(
        'package.json信息不全,请检查是否存在name、version、scripts（需提供build命令）'
      )
    }
    if (!fs.existsSync(pkgPath)) {
      throw new Error('package.json不存在')
    }
    this.projectInfo = { name, version, dir: cwd }
  }
}

function publish(argv) {
  return new PublishCommand(argv)
}

module.exports.PublishCommand = PublishCommand
module.exports = publish
