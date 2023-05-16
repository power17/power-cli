'use strict';
const path = require('path')
const Package = require('@power-cli/package')
const log = require('@power-cli/log')

const SETTINGS = {
  init: '@power-cli/core'
}
const CACHE_DIR = 'dependencies' //缓存

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  let storePath
  let pkg
  log.verbose('targetPath:', targetPath)
  log.verbose('homePath:', homePath)

  // const cmdObjOpts = arguments[arguments.length -1]?.opts()
  const cmdName = arguments[arguments.length -1].name() //获取pkg名
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'
  // 用户不指定路径就远程下载，如果本地有缓存 =》检查下版本是不是最新 =》不是最新九更新
  if(!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR) // 缓存路径
    storePath = path.resolve(targetPath, 'node_modules') // 缓存路径-node_modules
    log.verbose('targetPath:', targetPath)
    log.verbose('storePath:', storePath)
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storePath
    })
    // 缓存是否存在
    if(await pkg.exists()) {
      // 更新pkg
      await pkg.update()
    }else {
      // 安装pkg
      await pkg.insatall()
    }
  }else{
    // 本地包
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }
  const rootFile = pkg.getRootFilePath()
  // console.log(arguments, 'argument')
  console.log(rootFile)
  if(rootFile) {
    
    require(rootFile).apply(null, arguments)
  }

  

}
module.exports = exec;