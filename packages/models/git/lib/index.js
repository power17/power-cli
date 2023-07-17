'use strict';
const simpleGit = require('simple-git')
const log = require('@power-cli/log')
const path = require('path')
const { homedir } = require("os")
const fs = require('fs')
const inquirer = require('inquirer')
const DEFAULT_CLI_HOME = '.power-cli'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'

// const GIT_TOKEN_FILE = '.git_token';
// const GIT_OWN_FILE = '.git_own';
// const GIT_LOGIN_FILE = '.git_login';
// const GIT_IGNORE_FILE = '.gitignore';
// const GIT_PUBLISH_FILE = '.git_publish';
const GITHUB = 'github';
const GITEE = 'gitee';
// const REPO_OWNER_USER = 'user';
// const REPO_OWNER_ORG = 'org';
// const VERSION_RELEASE = 'release';
// const VERSION_DEVELOP = 'dev';
// const TEMPLATE_TEMP_DIR = 'oss';
// const COMPONENT_FILE = '.componentrc';


const GIT_SERVER_TYPE = [{
  name: 'Github',
  value: GITHUB,
}, {
  name: 'Gitee',
  value: GITEE,
}];

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
  constructor(cmd, projectInfo ) {
   
    this.simpleGit = simpleGit()
    this.cmd = cmd
    this.init()
  }
  init() {
    this.prepare() //检查缓存路径
   
    // console.log(buffer, 'this.fi', this.filePath)
  }
  async checkGitServer(file) {
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR) // 存储目录.git文件夹
    const gitServerPath = path.resolve(rootDir, file) // .git_server文件
    // 创建缓存目录
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true })
    }
    // 创建.git_server文件
    if (!fs.existsSync(gitServerPath) || this.cmd?.refresh) {
      const { gitServer } = await inquirer.prompt({
        type: 'list',
        name: 'gitServer',
        message: '请选择您想要托管的Git平台',
        default: GITHUB,
        choices: GIT_SERVER_TYPE,
      })
      fs.writeFileSync(gitServerPath, gitServer, {flag: 'w'}) // 如果不存在就创建
      log.success('git server写入成功', `${gitServer} => ${gitServerPath}`)
    } else {
      const gitServer = fs.readFileSync(gitServerPath, 'utf-8')
      log.success('git server获取成功', gitServer)
    }
    

  }
  async prepare() {
    this.checkHomePath()
    this.gitServer = await this.checkGitServer(GIT_SERVER_FILE) //检查用户远程仓库类型git还是gitee
    
  }
  checkHomePath() {
    this.homePath = process.env.CLI_HOME_PATH || path.resolve(homedir(), DEFAULT_CLI_HOME)
    if (!fs.existsSync(this.homePath)) {
      throw new Error('缓存目录不存在')
    }
    log.verbose(this.homePath)
  }
 
}
module.exports = Git;
