const path = require('path')
const pkg = require('./../package.json')
const log = require('@power-cli/log')
const constant = require('./const')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const minimist = require('minimist')
const dotenv = require('dotenv')
const commander =require('commander')
const program  = new commander.Command()
const init = require('@power-cli/init')
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
   
    // debug:检查用户输入（调试模式）
    // checkInputArgs()
    // 检查环境变量
    checkEnv()
    // 检查最cli工具新版本号，提示用户更新？
    checkVersionUpdate()
    // 注册命令
    registerCommand()


    }catch(e){
      log.error(e.message)
    }
    
}
function registerCommand() {

  // 初始化
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d --debug', '是否开启调试模式', false)

  // 命令注册  
  program
    .command('init [projectName]') 
    .option('-f, --force', '是否强制初始化项目')
    .action(init)

  // 调试模式 
  program.on('option:debug', () => {
    if(program.opts().debug) {
      process.env.LOCAL_LEVEL = 'verbose'
    }else{
      process.env.LOCAL_LEVEL = 'info'
    }
    log.level = process.env.LOCAL_LEVEL
    log.verbose('开启调试模式')
  })
  // 对未知命令的监听
  program.on('command:*', (obj) => {
    log.info('未知命令', obj[0])
    const availableCommand = program.commands.map(command => command.name())
    log.info('可用命令：', availableCommand.join(','))
    // 未输入命令显示帮助文档
    if(program.args?.length < 1) {
      program.outputHelp()
      // 输入空行
      console.log()
    }
  })    

 
    
  program.parse(process.argv)
}
async function checkVersionUpdate() {
  // 获取当前版本
  const currentVersion = pkg.version
  const pkgName = pkg.name
  const { getNewVersion } = require('@power-cli/get-npm-info')
  // const npmVersions  = await getNpmVersion(pkgName)
  const newVersion = await getNewVersion(pkgName)
  if(newVersion && semver.gt(newVersion, currentVersion)) {
    log.info('更新提示：', colors.yellow(`请手动更新${pkgName},当前版本：${currentVersion},最新版本：${newVersion}`))
  }
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

  // log.info('环境变量路径：', process.env.CLI_HOME_PATH)
  
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