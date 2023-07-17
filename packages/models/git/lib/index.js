'use strict'
const simpleGit = require('simple-git')
const log = require('@power-cli/log')
const path = require('path')
const { homedir } = require('os')
const fs = require('fs')
const inquirer = require('inquirer')
const terminalLink = require('terminal-link')
const Gitee = require('./Gitee')
const Github = require('./Github')

const DEFAULT_CLI_HOME = '.power-cli'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'
const GIT_TOKEN_FILE = '.git_token'
// const GIT_OWN_FILE = '.git_own';
// const GIT_LOGIN_FILE = '.git_login';
// const GIT_IGNORE_FILE = '.gitignore';
// const GIT_PUBLISH_FILE = '.git_publish';
const GITHUB = 'github'
const GITEE = 'gitee'
// const REPO_OWNER_USER = 'user';
// const REPO_OWNER_ORG = 'org';
// const VERSION_RELEASE = 'release';
// const VERSION_DEVELOP = 'dev';
// const TEMPLATE_TEMP_DIR = 'oss';
// const COMPONENT_FILE = '.componentrc';

const GIT_SERVER_TYPE = [
  {
    name: 'Github',
    value: GITHUB,
  },
  {
    name: 'Gitee',
    value: GITEE,
  },
]

// const GIT_OWNER_TYPE = [{
//   name: '个人',
//   value: REPO_OWNER_USER,
// }, {
//   name: '组织',
//   value: REPO_OWNER_ORG,
// }];

// const GIT_OWNER_TYPE_ONLY = [{
//   name: '个人',
//   value: REPO_OWNER_USER,
// }];

// const GIT_PUBLISH_TYPE = [{
//   name: 'OSS',
//   value: 'oss',
// }];
class Git {
  constructor(cmd) {
    this.homePath =
      process.env.CLI_HOME_PATH || path.resolve(homedir(), DEFAULT_CLI_HOME) // 用户目录 /user/home/.power-cli
    this.rootDir = path.resolve(this.homePath, GIT_ROOT_DIR) // 存储目录.git文件夹 /user/home/.power-cli/.git
    this.simpleGit = simpleGit()
    this.cmd = cmd
    this.init()
  }
  init() {
    this.prepare() //检查缓存路径

    // console.log(buffer, 'this.fi', this.filePath)
  }

  async prepare() {
    this.checkHomePath()
    await this.checkGitServer(GIT_SERVER_FILE) //检查用户远程仓库类型git还是gitee
    await this.checkGitToken()
  }
  async checkGitToken() {
    const tokenPath = path.resolve(this.rootDir, GIT_TOKEN_FILE)
    if (!fs.existsSync(tokenPath)) {
      log.warn(
        this.gitServer.type + ' token未生成',
        '请先生成' +
          this.gitServer.type +
          ' token,生成链接:' +
          terminalLink(
            this.gitServer.getTokenUrl(),
            this.gitServer.getTokenUrl()
          )
      )
    }
  }
  async checkGitServer(file) {
    const gitServerPath = path.resolve(this.rootDir, file) // .git_server文件
    // 创建缓存目录
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true })
    }
    // 创建.git_server文件
    let gitServer = ''
    if (!fs.existsSync(gitServerPath) || this.cmd?.refreshServer) {
      const gitServerObj = await inquirer.prompt({
        type: 'list',
        name: 'gitServer',
        message: '请选择您想要托管的Git平台',
        default: GITHUB,
        choices: GIT_SERVER_TYPE,
      })
      gitServer = gitServerObj.gitServer
      fs.writeFileSync(gitServerPath, gitServer, { flag: 'w' }) // 如果不存在就创建
      log.success('git server写入成功', `${gitServer} => ${gitServerPath}`)
    } else {
      gitServer = fs.readFileSync(gitServerPath, 'utf-8')
      log.success('git server获取成功', gitServer)
    }
    this.gitServer = this.createGitServer(gitServer)
    if (!this.gitServer) {
      throw new Error('gitServer 初始化失败')
    }
  }
  createGitServer(gitServer) {
    if (gitServer === GITHUB) {
      return new Github()
    } else if (gitServer === GITEE) {
      return new Gitee()
    }
  }
  checkHomePath() {
    if (!fs.existsSync(this.homePath)) {
      throw new Error('缓存目录不存在')
    }
    log.verbose(this.homePath)
  }
}
module.exports = Git
