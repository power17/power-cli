const path = require('path')
const pkg = require('./../package.json')
const log = require('@power-cli/log')
const constant = require('./const')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const minimist = require('minimist')
const dotenv = require('dotenv')
let pathExists

let argv

async function core(argv) {
  try{
    // 检测cli版本
    checkPkgVersion()
    //  检测node最低版本号
    checkNodeVersion()
    // 检查超级管理员, 如果是超级管理员就降级
    checkRoot()
    
    pathExistsObj = await import('path-exists')
    pathExists = pathExistsObj.pathExistsSync
    // 检查用户主目录
    checkUserHome(pathExists)
   
    // 检查用户输入
    checkInputArgs()
    // 检查环境变量
    checkEnv()
    // 检查最cli工具新版本号，提示用户更新？
    checkVersionUpdate()


    }catch(e){
      log.error(e.message)
    }
    
}
function checkVersionUpdate() {
  // 获取当前版本
  const currentVersion = pkg.version
  const pkgName = pkg.name
  const { getNpmInfo } = require('@power-cli/get-npm-info')
  getNpmInfo(pkgName)
  // 调用NPMApi获取所有版本号

}
function checkEnv() {
  const createDefaultConfig = () => {
    const cliConfig = {
      path: userHome
    }
    if(process.env.CLI_HOME) {
      cliConfig['cliHome'] = path.join(userHome,process.env.CLI_HOME)
    }else{
      cliConfig['cliHome'] = path.join(userHome,constant.DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig['cliHome']
    return cliConfig
  }
  // /usr/power/.env存在
  const config = dotenv.config({path: path.resolve(userHome, '.env')})
  const dotenvPath = path.resolve(userHome, '.env')
  if(pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
   
  }
  createDefaultConfig()

  log.info('环境变量路径：', process.env.CLI_HOME_PATH)
  
}

function checkInputArgs() {
  argv = minimist(process.argv.slice(2))
  if(argv?.debug) {
    process.env.LOCAL_LEVEL = 'verbose'
  }else {
    process.env.LOCAL_LEVEL = 'info'
  }
  log.level = process.env.LOCAL_LEVEL
  log.verbose('debug: 开始调试模式')
}
//检查用户主目录
function checkUserHome(pathExists) {
  if(!userHome || !pathExists(userHome)) {
    throw new Error(log.notice('当前登录用户主目录不存在'))
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
module.exports = core