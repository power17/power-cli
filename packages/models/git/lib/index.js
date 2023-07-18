'use strict';
const simpleGit = require('simple-git');
const log = require('@power-cli/log');
const { spinnerStart } = require('@power-cli/utils');
const CloudBuild = require('@power-cli/cloudbuild');
const pkg = require(`${process.cwd()}/package.json`);

const path = require('path');
const semver = require('semver');
const { homedir } = require('os');
const fs = require('fs');
const inquirer = require('inquirer');
const terminalLink = require('terminal-link');
const Gitee = require('./Gitee');
const Github = require('./Github');

const DEFAULT_CLI_HOME = '.power-cli';
const GIT_ROOT_DIR = '.git';
const GIT_SERVER_FILE = '.git_server';
const GIT_TOKEN_FILE = '.git_token';
const GIT_OWN_FILE = '.git_own';
const GIT_LOGIN_FILE = '.git_login';
const GIT_IGNORE_FILE = '.gitignore';
const GIT_PUBLISH_FILE = '.git_publish';
const GITHUB = 'github';
const GITEE = 'gitee';
const REPO_OWNER_USER = 'user';
const REPO_OWNER_ORG = 'org';
const VERSION_RELEASE = 'release';
const VERSION_DEVELOP = 'dev';
const TEMPLATE_TEMP_DIR = 'oss';
const COMPONENT_FILE = '.componentrc';

const GIT_SERVER_TYPE = [
  {
    name: 'Github',
    value: GITHUB,
  },
  {
    name: 'Gitee',
    value: GITEE,
  },
];

const GIT_OWNER_TYPE = [
  {
    name: '个人',
    value: REPO_OWNER_USER,
  },
  {
    name: '组织',
    value: REPO_OWNER_ORG,
  },
];

const GIT_OWNER_TYPE_ONLY = [
  {
    name: '个人',
    value: REPO_OWNER_USER,
  },
];

const GIT_PUBLISH_TYPE = [
  {
    name: 'OSS',
    value: 'oss',
  },
];
class Git {
  constructor(cmd, { name, dir, version }) {
    this.homePath =
      process.env.CLI_HOME_PATH || path.resolve(homedir(), DEFAULT_CLI_HOME); // 用户目录 /user/home/.power-cli
    this.rootDir = path.resolve(this.homePath, GIT_ROOT_DIR); // 存储目录.git文件夹 /user/home/.power-cli/.git
    this.git = simpleGit(); // git操作
    this.version = version; //项目版本号
    this.cmd = cmd; // 刷新token或git仓库类型
    this.gitServer = null;
    this.dir = dir; // 源码目录
    this.name = name; // 项目名称
    this.user = null; // 用户信息
    this.orgs = null; // 用户所属组织列表
    this.owner = null; // 远程仓库组织
    this.login = null; // 远程仓库登录名
    this.repo = null; // 远程仓库信息
    this.branch = null; // 本地开发分支
    this.buildCmd = cmd.buildCmd; //自定义打包命令
    // ????
    this.prod = !!this.cmd.prod; //是否正式发布
    log.verbose('git', this);
  }
  async init() {
    await this.prepare(); //检查缓存路径

    // console.log(buffer, 'this.fi', this.filePath)
  }
  async prepare() {
    this.checkHomePath();
    await this.checkGitServer(GIT_SERVER_FILE); //检查用户远程仓库类型git还是gitee
    await this.checkGitToken(); // 检查用户git token
    await this.getUserAndOrgs(); // 获取远程长裤用户信息
    await this.checkGitOwner(); // 检查远程仓库组织和个人
    await this.checkRepo(); // 检查并创建是否存在远程仓库
    this.checkGitIgnore(); // 检查并创建.gitignore文件
    await this.checkComponent(); // 组件合法性检查
    await this.initGit(); // 完成本地仓库初始化
  }
  async commit() {
    // 1.生成开发分支
    await this.getCorrectVersion();
    // 2.检查stash区
    await this.checkStash();
    // 3.检查代码冲突
    await this.checkConflicted();
    // 4.检查未提交代码
    await this.checkNotCommitted();
    // 5.切换开发分支
    await this.checkoutBranch(this.branch);
    // 6.合并远程master分支和开发分支代码
    await this.pullRemoteMasterAndBranch();
    // 7.将开发分支推送到远程仓库
    await this.pushRemoteRepo(this.branch);
  }
  async publish() {
    await this.preparePublish();
    const cloudBuild = new CloudBuild(this, {
      type: this.gitPublish,
      prod: this.prod,
    });
    await cloudBuild.prepare();
    await cloudBuild.init();
    await cloudBuild.build();
  }
  async preparePublish() {
    log.info('开始进行云构建前代码检查');
    // 用户传进来的自定义打包命令
    if (this.buildCmd) {
      const buildCmdArray = this.buildCmd.split(' ');
      // 安全检查，防止执行有害命令
      if (
        buildCmdArray[0] !== 'npm' &&
        buildCmdArray[0] !== 'cnpm' &&
        buildCmdArray[0] !== 'pnpm'
      ) {
        throw new Error('Build命令非法,必须使用npm或cnpm！');
      }
    } else {
      this.buildCmd = 'npm run build';
    }
    log.verbose('buildCmd', this.buildCmd);
    const buildCmdArray = this.buildCmd.split(' ');
    const lastCmd = buildCmdArray[buildCmdArray.length - 1];
    if (!pkg.scripts || !Object.keys(pkg.scripts).includes(lastCmd)) {
      throw new Error(this.buildCmd + '命令不存在！');
    }
    log.success('代码预检查通过');
    const gitPublishPath = path.resolve(this.rootDir, GIT_PUBLISH_FILE);
    let gitPublish = null;
    if (!fs.existsSync(gitPublishPath)) {
      gitPublish = (
        await inquirer.prompt({
          type: 'list',
          choices: GIT_PUBLISH_TYPE,
          message: '请选择您想要上传代码的平台',
          name: 'gitPublish',
        })
      ).gitPublish;
      fs.writeFileSync(gitPublishPath, gitPublish, { flag: 'w' });
      log.success(
        'git publish类型写入成功',
        `${gitPublish} -> ${gitPublishPath}`
      );
    } else {
      gitPublish = fs.readFileSync(gitPublishPath, 'utf-8');
      log.success('git publish类型获取成功', gitPublish);
    }
    this.gitPublish = gitPublish;
  }

  async pullRemoteMasterAndBranch() {
    log.info(`拉取远程[master] -> [${this.branch}]`);
    await this.pullRemoteRepo('master');
    log.success('拉取远程 [master] 分支代码成功');
    await this.checkConflicted();
    log.info('检查远程开发分支');
    // 获取远程分支版本（降序)
    const remoteBranchList = await this.getRemoteBranchList();
    if (remoteBranchList.indexOf(this.version) >= 0) {
      // 如果有这个版本，就拉取
      log.info(`拉取 [${this.branch}] -> [${this.branch}]`);
      await this.pullRemoteRepo(this.branch);
      log.success(`拉取远程 [${this.branch}] 分支代码成功`);
      await this.checkConflicted();
    }
  }
  async pullRemoteRepo(branchName, options) {
    log.info(`同步远程${branchName}分支代码`);
    await this.git.pull('origin', branchName, options).catch((err) => {
      log.error(err.message);
    });
  }
  async checkoutBranch(branch) {
    const localBranchList = await this.git.branchLocal();
    if (localBranchList.all.indexOf(branch) >= 0) {
      // 切换分支
      await this.git.checkout(branch);
    } else {
      // 新建分支
      await this.git.checkoutLocalBranch(branch);
    }
    log.success(`分支切换到${branch}`);
  }
  async checkStash() {
    log.info('检查stash记录');
    const stashList = await this.git.stashList();
    if (stashList.all.length > 0) {
      await this.git.stash(['pop']);
      log.warn('git stash pop,将会把stash代码提交');
    }
  }
  async getCorrectVersion() {
    // 1.获取远程分布分支
    // 版本号规范：release/x.y.z，dev/x.y.z
    // 版本号递增规范：major/minor/patch
    log.info('获取代码分支');
    const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0];
    }
    log.verbose('线上最新版本号', releaseVersion);
    // 2.生成本地开发分支
    const devVersion = this.version;
    if (!releaseVersion) {
      // 没有远程版本号，此项目没有上线
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else if (semver.gt(this.version, releaseVersion)) {
      // 当前版本大于线上最新版本 正常开发
      log.info(
        '当前版本大于线上最新版本',
        `${devVersion} >= ${releaseVersion}`
      );
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else {
      // 当前版本大于等于本地版本，刚从线上拉取
      log.info('当前线上版本大于本地版本', `${releaseVersion} > ${devVersion}`);
      const incType = (
        await inquirer.prompt({
          type: 'list',
          name: 'incType',
          message: '自动升级版本，请选择升级版本类型',
          default: 'patch',
          choices: [
            {
              name: `小版本（${releaseVersion} -> ${semver.inc(
                releaseVersion,
                'patch'
              )}）`,
              value: 'patch',
            },
            {
              name: `中版本（${releaseVersion} -> ${semver.inc(
                releaseVersion,
                'minor'
              )}）`,
              value: 'minor',
            },
            {
              name: `大版本（${releaseVersion} -> ${semver.inc(
                releaseVersion,
                'major'
              )}）`,
              value: 'major',
            },
          ],
        })
      ).incType;
      // semver.inc('1.2.3', 'prerelease', 'beta')
      // '1.2.4-beta.0'
      const incVersion = semver.inc(releaseVersion, incType);
      // 生成开发版本 dev/1.0.2
      this.branch = `${VERSION_DEVELOP}/${incVersion}`;
      this.version = incVersion;
      log.verbose('本地开发分支', this.branch);
      // 3.将version同步到package.json
      this.syncVersionToPackageJson();
    }
  }
  syncVersionToPackageJson() {
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      fs.writeFileSync(
        `${this.dir}/package.json`,
        JSON.stringify(pkg, null, 2)
      );
    }
  }
  async getRemoteBranchList(type) {
    // git ls-remote --refs
    const remoteList = await this.git.listRemote(['--refs']);
    let reg;
    if (type === VERSION_RELEASE) {
      // refs/tags/release1.0.20 匹配
      reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
    } else {
      reg = /.+?refs\/heads\/dev\/(\d+\.\d+\.\d+)/g;
    }
    return remoteList
      .split('\n')
      .map((remote) => {
        const match = reg.exec(remote);
        reg.lastIndex = 0; // 大于字符串长度将不在执行
        if (match && semver.valid(match[1])) {
          return match[1];
        }
      })
      .filter((_) => _)
      .sort((a, b) => {
        // 目的降序
        if (semver.lte(b, a)) {
          if (a === b) return 0;
          return -1; //降序
        }
        return 1;
      });
  }

  async initGit() {
    const isHaveGitWarehouse = await this.getRemote();
    // 如果有.git文件，就终止
    if (!isHaveGitWarehouse) {
      await this.initAndAddRemote();
    }
    // 初始化.git

    await this.initCommit();
  }
  async initAndAddRemote() {
    log.info('执行git初始化');
    await this.git.init(this.dir);
    log.info('添加git remote');
    const remotes = await this.git.getRemotes();
    log.verbose('git remotes', remotes);
    if (!remotes.find((item) => item.name === 'origin')) {
      await this.git.addRemote('origin', this.remote);
    }
  }
  async initCommit() {
    await this.checkConflicted(); // 检查冲突
    await this.checkNotCommitted(); // 检查代码是否未提交
    // 检查远程是否有更新，推送master分支
    if (await this.checkRemoteMaster()) {
      // 拉取master分支
      await this.pullRemoteRepo('master', {
        '--allow-unrelated-histories': null, //历史记录不一样的远程分支和本地合并
      });
    }
    await this.pushRemoteRepo('master');
  }
  async pushRemoteRepo(branchName) {
    log.info(`推送代码至${branchName}分支`);
    await this.git.push('origin', branchName);
    log.success('推送代码成功');
  }

  async checkRemoteMaster() {
    // git ls-remote 远程分支
    return (
      (await this.git.listRemote(['--refs'])).indexOf('refs/heads/master') >= 0
    );
  }
  async checkNotCommitted() {
    const status = await this.git.status();
    // 是否有代码没提交
    if (
      status.not_added.length > 0 || // 工作区中存在但是还没有被添加到 git 中的文件
      status.created.length > 0 || // 新建的但是还没有被添加到 git 中的文件列表
      status.deleted.length > 0 || //已经被删除但是还没有被提交到 git 中的文件
      status.modified.length > 0 || // 已经被修改但是还没有被提交到 git 中的文件列表
      status.renamed.length > 0 // 已经被重命名但是还没有被提交到 git 中的文件列表
    ) {
      log.verbose('status', status);
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed);
      let message;
      // 防止commit的信息为空的情况，当没有输入commit信息时会一直处于输入commit的状态。
      while (!message) {
        message = (
          await inquirer.prompt({
            type: 'text',
            name: 'message',
            message: '请输入commit信息：',
          })
        ).message;
      }
      await this.git.commit(message);
      log.success('本次commit提交成功');
    }
  }
  async checkConflicted() {
    log.info('代码冲突检查');
    const status = await this.git.status();
    if (status.conflicted.length > 0) {
      throw new Error('当前代码存在冲突，请手动处理合并后再试！');
    }
    log.success('代码冲突检查通过');
  }
  getRemote() {
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
    this.remote = this.gitServer.getRemote(this.login, this.name);
    if (fs.existsSync(gitPath)) {
      log.success('git已完成初始化');
      return true;
    }
    return false;
  }
  checkGitIgnore() {
    const gitIgnore = path.resolve(this.dir, GIT_IGNORE_FILE);
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
      );
      log.success(`自动写入${GIT_IGNORE_FILE}文件成功`);
    }
  }
  async checkComponent() {
    let componentFile = this.isComponent();
  }
  isComponent() {
    const componentFilePath = path.resolve(this.dir, COMPONENT_FILE);
  }
  // 检查仓库，如果没有就创建
  async checkRepo() {
    let repo = await this.gitServer.getRepo(this.login, this.name);

    if (!repo) {
      const spinner = spinnerStart('开始创建远程仓库...');
      try {
        // 个人创建仓库 user为个人
        if (this.owner === REPO_OWNER_USER) {
          repo = await this.gitServer.createRepo(this.name);
        } else {
          // 组织创建仓库
          repo = await this.gitServer.createOrgRepo(
            this.name,
            this.login,
            this.owner
          );
        }
      } catch (e) {
        log.error(e);
      } finally {
        spinner.stop(true);
      }

      if (repo) {
        log.success('远程仓库创建成功');
      } else {
        throw new Error('远程仓库创建失败');
      }
    } else {
      log.success('远程仓库信息获取成功');
    }
    this.repo = repo;
  }
  async checkGitOwner() {
    const ownerPath = path.resolve(this.rootDir, GIT_OWN_FILE);
    const loginPath = path.resolve(this.rootDir, GIT_LOGIN_FILE);
    let owner = null;
    let login = null;
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
      });
      owner = ownerObj.owner;
      if (owner === REPO_OWNER_USER) {
        // 选择个人
        login = this.user.login;
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
        });
        login = loginObj.login;
      }
      fs.writeFileSync(ownerPath, owner, { flag: 'w' });
      fs.writeFileSync(loginPath, login, { flag: 'w' });
      log.success('owner写入成功', `${owner} -> ${ownerPath}`);
      log.success('login写入成功', `${login} -> ${loginPath}`);
    } else {
      owner = fs.readFileSync(ownerPath, 'utf-8');
      login = fs.readFileSync(loginPath, 'utf-8');
      log.success('owner获取成功', owner);
      log.success('login获取成功', login);
    }
    this.owner = owner;
    this.login = login;
  }
  async getUserAndOrgs() {
    this.gitServer.setToken(this.token);
    this.user = await this.gitServer.getUser();
    if (!this.user) {
      throw new Error('用户信息获取失败！');
    }
    // 获取组织信息
    this.orgs = await this.gitServer.getOrg(this.user.login);
    if (!this.orgs) {
      throw new Error('组织信息获取失败！');
    }
    log.success(this.gitServer.type + ' 用户和组织信息获取成功');
  }
  async checkGitToken() {
    const tokenPath = path.resolve(this.rootDir, GIT_TOKEN_FILE);
    log.verbose('env', process.env);
    let token = '';
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
      );
      const tokenObj = await inquirer.prompt({
        type: 'password',
        name: 'token',
        message: '请将token复制到这里',
        default: '',
      });
      token = tokenObj.token;
      fs.writeFileSync(tokenPath, token, { flag: 'w' }); // 如果不存在就创建
      log.success('git token写入成功', `${token} => ${tokenPath}`);
    } else {
      token = fs.readFileSync(tokenPath, 'utf-8');
      log.success('git token获取成功', tokenPath);
    }
    this.token = token;
  }
  async checkGitServer(file) {
    const gitServerPath = path.resolve(this.rootDir, file); // .git_server文件
    // 创建缓存目录
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
    // 创建.git_server文件
    let gitServer = '';
    if (!fs.existsSync(gitServerPath) || this.cmd?.refreshServer) {
      const gitServerObj = await inquirer.prompt({
        type: 'list',
        name: 'gitServer',
        message: '请选择您想要托管的Git平台',
        default: GITHUB,
        choices: GIT_SERVER_TYPE,
      });
      gitServer = gitServerObj.gitServer;
      fs.writeFileSync(gitServerPath, gitServer, { flag: 'w' }); // 如果不存在就创建
      log.success('git server写入成功', `${gitServer} => ${gitServerPath}`);
    } else {
      gitServer = fs.readFileSync(gitServerPath, 'utf-8');
      log.success('git server获取成功', gitServer);
    }
    this.gitServer = this.createGitServer(gitServer);
    if (!this.gitServer) {
      throw new Error('gitServer 初始化失败');
    }
  }
  createGitServer(gitServer) {
    if (gitServer === GITHUB) {
      return new Github();
    } else if (gitServer === GITEE) {
      return new Gitee();
    }
  }
  checkHomePath() {
    if (!fs.existsSync(this.homePath)) {
      throw new Error('缓存目录不存在');
    }
    log.verbose(this.homePath);
  }
}
module.exports = Git;
