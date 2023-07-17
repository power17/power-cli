'use strict'
const simpleGit = require('simple-git')
const log = require('@power-cli/log')
const { spinnerStart } = require('@power-cli/utils')
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
  constructor(cmd, { name, dir }) {
    this.homePath =
      process.env.CLI_HOME_PATH || path.resolve(homedir(), DEFAULT_CLI_HOME) // 用户目录 /user/home/.power-cli
    this.rootDir = path.resolve(this.homePath, GIT_ROOT_DIR) // 存储目录.git文件夹 /user/home/.power-cli/.git
    this.git = simpleGit() // git操作
    this.cmd = cmd // 刷新token或git仓库类型
    this.gitServer = null
    this.dir = dir // 源码目录
    this.name = name // 项目名称
    this.user = null // 用户信息
    this.orgs = null // 用户所属组织列表
    this.owner = null // 远程仓库组织
    this.login = null // 远程仓库登录名
    this.repo = null // 远程仓库信息
  }
  async init() {
    await this.prepare() //检查缓存路径

    // console.log(buffer, 'this.fi', this.filePath)
  }

  async prepare() {
    this.checkHomePath()
    await this.checkGitServer(GIT_SERVER_FILE) //检查用户远程仓库类型git还是gitee
    await this.checkGitToken() // 检查用户git token
    await this.getUserAndOrgs() // 获取远程长裤用户信息
    await this.checkGitOwner() // 检查远程仓库组织和个人
    await this.checkRepo() // 检查并创建是否存在远程仓库
    this.checkGitIgnore() // 检查并创建.gitignore文件
    await this.checkComponent() // 组件合法性检查
    await this.initGit() // 完成本地仓库初始化
  }
  async initGit() {
    const isHaveRemote = await this.getRemote()
    if (!isHaveRemote) {
      // 初始化提交
      await this.initAndAddRemote()
    }
    await this.initCommit()
  }
  async initAndAddRemote() {
    log.info('执行git初始化')

    await this.git.init(this.dir)
    log.info('添加git remote')
    const remotes = await this.git.getRemotes()
    log.verbose('git remotes', remotes)
    if (!remotes.find((item) => item.name === 'origin')) {
      await this.git.addRemote('origin', this.remote)
    }
  }
  async initCommit() {
    await this.checkConflicted() // 检查冲突
    await this.checkNotCommitted() // 检查代码是否未提交
    // 检查远程是否有更新，推送master分支
    if (await this.checkRemoteMaster()) {
      // 拉取master分支
      await this.pullRemoteRepo('master', {
        '--allow-unrelated-histories': null,
      })
    } else {
      await this.pushRemoteRepo('master')
    }
  }
  async pushRemoteRepo(branchName) {
    // log.info(`推送代码至${branchName}分支`);
    await this.git.push('origin', branchName)
    log.success('推送代码成功')
  }
  async pullRemoteRepo(branchName, options) {
    log.info(`同步远程${branchName}分支代码`)
    await this.git.pull('origin', branchName, options).catch((err) => {
      log.error(err.message)
    })
  }
  async checkRemoteMaster() {
    return (
      (await this.git.listRemote(['--refs'])).indexOf('refs/heads/master') >= 0
    )
  }
  async checkNotCommitted() {
    const status = await this.git.status()
    // 是否有代码没提交
    if (
      status.not_added.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.modified.length > 0 ||
      status.renamed.length > 0
    ) {
      log.verbose('status', status)
      await this.git.add(status.not_added)
      await this.git.add(status.created)
      await this.git.add(status.deleted)
      await this.git.add(status.modified)
      await this.git.add(status.renamed)
      let message
      while (!message) {
        message = (
          await inquirer.prompt({
            type: 'text',
            name: 'message',
            message: '请输入commit信息：',
          })
        ).message
      }
      await this.git.commit(message)
      log.success('本次commit提交成功')
    }
  }
  async checkConflicted() {
    log.info('代码冲突检查')
    const status = await this.git.status()
    if (status.conflicted.length > 0) {
      throw new Error('当前代码存在冲突，请手动处理合并后再试！')
    }
    log.success('代码冲突检查通过')
  }
  getRemote() {
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR)
    this.remote = this.gitServer.getRemote(this.login, this.name)
    if (fs.existsSync(gitPath)) {
      log.success('git已完成初始化')
      return true
    }
    return false
  }
  checkGitIgnore() {
    const gitIgnore = path.resolve(this.dir, GIT_IGNORE_FILE)
    if (!fs.existsSync(gitIgnore)) {
      fs.writeFileSync(
        gitIgnore,
        `.DS_Store
node_modules
/dist

# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`,
        {
          flag: 'w',
        }
      )
      log.success(`自动写入${GIT_IGNORE_FILE}文件成功`)
    }
  }
  async checkComponent() {
    let componentFile = this.isComponent()
  }
  isComponent() {
    const componentFilePath = path.resolve(this.dir, COMPONENT_FILE)
  }
  // 检查仓库，如果没有就创建
  async checkRepo() {
    let repo = await this.gitServer.getRepo(this.login, this.name)

    if (!repo) {
      const spinner = spinnerStart('开始创建远程仓库...')
      try {
        // 个人创建仓库 user为个人
        if (this.owner === REPO_OWNER_USER) {
          repo = await this.gitServer.createRepo(this.name)
        } else {
          // 组织创建仓库
          repo = await this.gitServer.createOrgRepo(
            this.name,
            this.login,
            this.owner
          )
        }
      } catch (e) {
        log.error(e)
      } finally {
        spinner.stop(true)
      }

      if (repo) {
        log.success('远程仓库创建成功')
      } else {
        throw new Error('远程仓库创建失败')
      }
    } else {
      log.success('远程仓库信息获取成功')
    }
    log.verbose('repo', repo)
    this.repo = repo
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
    this.owner = owner
    this.login = login
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
