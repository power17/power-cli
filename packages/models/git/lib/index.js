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
const GIT_OWN_FILE = '.git_own'
const GIT_LOGIN_FILE = '.git_login'
const GIT_IGNORE_FILE = '.gitignore'
const GIT_PUBLISH_FILE = '.git_publish'
const GITHUB = 'github'
const GITEE = 'gitee'
const REPO_OWNER_USER = 'user'
const REPO_OWNER_ORG = 'org'
const VERSION_RELEASE = 'release'
const VERSION_DEVELOP = 'dev'
const TEMPLATE_TEMP_DIR = 'oss'
const COMPONENT_FILE = '.componentrc'

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

const GIT_OWNER_TYPE = [
  {
    name: '个人',
    value: REPO_OWNER_USER,
  },
  {
    name: '组织',
    value: REPO_OWNER_ORG,
  },
]

const GIT_OWNER_TYPE_ONLY = [
  {
    name: '个人',
    value: REPO_OWNER_USER,
  },
]

const GIT_PUBLISH_TYPE = [
  {
    name: 'OSS',
    value: 'oss',
  },
]
class Git {
  constructor(cmd) {
    this.homePath =
      process.env.CLI_HOME_PATH || path.resolve(homedir(), DEFAULT_CLI_HOME) // 用户目录 /user/home/.power-cli
    this.rootDir = path.resolve(this.homePath, GIT_ROOT_DIR) // 存储目录.git文件夹 /user/home/.power-cli/.git
    this.simpleGit = simpleGit()
    this.cmd = cmd // 刷新token或git仓库类型
    this.gitServer = null
    this.user = null // 用户信息
    this.orgs = null // 用户所属组织列表
    this.owner = null // 远程仓库类型
    this.login = null // 远程仓库登录名
    this.repo = null // 远程仓库信息
    this.init()
  }
  init() {
    this.prepare() //检查缓存路径

    // console.log(buffer, 'this.fi', this.filePath)
  }

  async prepare() {
    this.checkHomePath()
    await this.checkGitServer(GIT_SERVER_FILE) //检查用户远程仓库类型git还是gitee
    await this.checkGitToken() // 检查用户git token
    await this.getUserAndOrgs() // 获取用户信息
    await this.checkGitOwner() // 检查组织和个人
  }
  async checkGitOwner() {
    const ownerPath = path.resolve(this.rootDir, GIT_OWN_FILE)
    const loginPath = path.resolve(this.rootDir, GIT_LOGIN_FILE)
    let owner = null
    let login = null
    // 根据选择，获取登录名
    if (
      !fs.existsSync(ownerPath) ||
      !fs.existsSync(loginPath) ||
      this.cmd.refreshOwner
    ) {
      const ownerObj = await inquirer.prompt({
        type: 'list',
        name: 'owner',
        message: '请选择远程仓库类型',
        default: REPO_OWNER_USER,
        choices: this.orgs.length > 0 ? GIT_OWNER_TYPE : GIT_OWNER_TYPE_ONLY,
      })
      owner = ownerObj.owner
      if (owner === REPO_OWNER_USER) {
        // 选择个人
        login = this.user.login
      } else {
        // 选择哪个组织
        const loginObj = await inquirer.prompt({
          type: 'list',
          name: 'login',
          message: '请选择',
          choices: this.orgs.map((item) => ({
            name: item.login,
            value: item.login,
          })),
        })
        login = loginObj.login
      }
      fs.writeFileSync(ownerPath, owner, { flag: 'w' })
      fs.writeFileSync(loginPath, login, { flag: 'w' })
      log.success('owner写入成功', `${owner} -> ${ownerPath}`)
      log.success('login写入成功', `${login} -> ${loginPath}`)
    } else {
      owner = fs.readFileSync(ownerPath, 'utf-8')
      login = fs.readFileSync(loginPath, 'utf-8')
      log.success('owner获取成功', owner)
      log.success('login获取成功', login)
    }
  }
  async getUserAndOrgs() {
    this.gitServer.setToken(this.token)
    this.user = await this.gitServer.getUser()
    if (!this.user) {
      throw new Error('用户信息获取失败！')
    }
    // 获取组织信息
    this.orgs = await this.gitServer.getOrg(this.user.login)
    if (!this.orgs) {
      throw new Error('组织信息获取失败！')
    }
    log.success(this.gitServer.type + ' 用户和组织信息获取成功')
  }
  async checkGitToken() {
    const tokenPath = path.resolve(this.rootDir, GIT_TOKEN_FILE)
    let token = ''
    if (!fs.existsSync(tokenPath) || this.cmd.refreshToken) {
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
      const tokenObj = await inquirer.prompt({
        type: 'password',
        name: 'token',
        message: '请将token复制到这里',
        default: '',
      })
      token = tokenObj.token
      fs.writeFileSync(tokenPath, token, { flag: 'w' }) // 如果不存在就创建
      log.success('git token写入成功', `${token} => ${tokenPath}`)
    } else {
      token = fs.readFileSync(tokenPath, 'utf-8')
      log.success('git token获取成功', tokenPath)
    }
    this.token = token
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
