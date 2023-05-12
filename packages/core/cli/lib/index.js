module.exports = core
const pkg = require('./../package.json')
const log = require('@power-cli/log')
const constant = require('./const')
const semver = require('semver')
const colors = require('colors/safe')


function core(argv) {
  try{
    // 检测cli版本
    checkPkgVersion()
    //  检测node最低版本号
    checkNodeVersion()
    // 检查超级管理员, 如果是超级管理员就降级
    checkRoot()
    console.log(process.env.SUDO_UID)
  }catch(e){
    log.error(e.message)
  }

}
function checkRoot() {
  const p = import('root-check')
  p.then((rootCheck) => {
    rootCheck?.default()
  })
  
  // rootCheck()
}
// 检查node 版本
function checkNodeVersion() {
  const lowerVersion = constant.LOWER_NODE_VERSION
  const nodeVersion = process.version
  if(!semver.gte(nodeVersion, lowerVersion)) {
    throw new Error(colors.red(`node版本过低，需要安装node最低版本${nodeVersion}`))
  }

}
// 提示版本
function checkPkgVersion() {
  log.notice(pkg.version)

}
