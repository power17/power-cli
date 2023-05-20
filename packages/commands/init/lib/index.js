'use strict';
const fs = require('fs')
const { homedir } = require('os')
const path = require('path')
const cp = require('child_process')
const inquirer = require('inquirer')
const semver = require('semver')
const ejs = require('ejs')
const { glob } = require('glob')
const log = require('@power-cli/log')
const Command = require('@power-cli/command')
const { spinnerStart } = require('@power-cli/utils')
const getTemplateRequest = require('./getTemplateRequest');
const Package = require('../../../models/package/lib');
const TYPE_PROJECT = 'type_project'
const TYPE_COMMONENT = 'type_commonent'

const userHome = homedir()

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = this._argv[1]?.force
    this.projectPath = path.resolve(process.cwd(), this.projectName)
    log.verbose(':projectName:', this.projectName)
    log.verbose('force:', this.force)

    // console.log(this.projectName, this.force,1111)
  }
  async exec() {

    try {
      // 初始化   判断目录是否为空
      await this.prepare()
      log.verbose('projectInfo', this.projectInfo)

      if (this.projectInfo) {
        // 下载模版
        await this.downloadTemplate()
        log.verbose('templateInfo', this.templateInfo)
        if (!this.templateInfo) throw new Error('项目模板信息不存在')
        if (this.templateInfo.type === 'normal') {
          if (fs.existsSync(this.templateNpm.storePath)) {
            const spinner = spinnerStart('开始安装')
            await this.normalInstall()
            spinner.stop()
            log.success('模版安装成功')
            // ejs渲染
            await this.ejsRender()

          } else {
            throw new Error('项目模版不存在')
          }
        } else if (this.templateInfo.type === 'custom') {
          await this.insatallCustomTemplate()

        } else {
          throw new Error('无法识别项目类型')
        }

      }
    } catch (e) {
      log.error(e.message)
      if (process.env.LOCAL_LEVEL === 'verbose') {
        console.log(e)
      }
    }
  }
  async insatallCustomTemplate() {
    if (this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      if (fs.existsSync(rootFile)) {
        const templatePath = path.resolve(this.templateNpm.storePath);
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        log.verbose('templatePath', templatePath)

        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        // console.log(rootFile, 'rootFile')
        // 子进程加载包
        const child = cp.spawn('node', ['-e', code], {
          cwd: process.cwd(),
          stdio: 'inherit' // 绑定父类 
        })
        child.on('error', (e) => {
          console.error(e.message)
          process.exit(1)
        })
        child.on('exit', e => {
          log.verbose('自定义模版：加载命令执行成功, 退出子进程' + e)
        })
        child.on('close', e => {
          log.verbose('关闭' + e)

        })
      } else {
        throw new Error('自定义模版入口文件不存在')
      }

    } else {
      throw new Error('自定义模版不存在')
    }

  }
  async ejsRender() {

    const dir = path.resolve(process.cwd(), this.projectName)
    const files = await glob('**', {
      cwd: dir,
      ignore: ['node_modules/**', 'public/**'],
      nodir: true
    })
    console.log('file', files)
    await Promise.all(files.map((file => {
      const filePath = path.resolve(dir, file)
      this.projectInfo.className = this.projectInfo.projectName
      this.projectInfo.version = this.projectInfo.projectVersion
      ejs.renderFile(filePath, this.projectInfo, {}, function (err, str) {
        if (err) throw new Error(err.message)
        fs.writeFileSync(filePath, str)
      })
    })))
    // console.log(file)

  }
  async normalInstall() {
    try {
      console.log(this.projectName, 'this.projectName')
      const copyPath = path.resolve(this.templateNpm.storePath, this.templateNpm.pkgName, 'template')
      const targetPath = path.resolve(process.cwd(), this.projectName)
      fs.mkdirSync(targetPath)
      fs.cpSync(
        copyPath,
        targetPath,
        {
          recursive: true, //拷贝文件夹
          dereference: true, // 拷贝真实目录
          force: false,
        })
    } catch (e) {
      log.error(e.message)
      if (process.env.LOCAL_LEVEL === 'verbose') {
        console.log(e)
      }
    }
  }
  async downloadTemplate() {

    const targetPath = path.resolve(process.env.CLI_HOME_PATH, 'template')
    const storePath = path.resolve(targetPath, 'node_modules')
    // log.verbose('target, store', targetPath, storeDir)
    this.templateInfo = this.template.find(v => v.npmName === this.projectInfo.npmName)

    this.templateNpm = new Package({
      targetPath,
      storePath,
      packageName: this.projectInfo?.npmName,
      packageVersion: this.projectInfo?.projectVersion
    })
    log.verbose('templateNpm', this.templateNpm)
    if (await this.templateNpm.exists()) {
      const spinner = spinnerStart('正在更新版本。。。。。')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await this.templateNpm.update()
      spinner.stop()
    } else {
      const spinner = spinnerStart('正在下载。。。。。')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await this.templateNpm.insatall()
      spinner.stop()




      // spinner.stop()
    }
    // console.log(templateNpm, 'templateNpm')

  }
  async prepare() {
    // 获取模版信息
    this.template = await getTemplateRequest()
    if (!this.template?.length) {
      throw new Error('项目模板不存在')
    }
    // 存在项目
    if (!this.isCmdEmptyDir()) {

      try {
        let isContinue = true
        if (!this.force) {
          isContinue = (await inquirer.prompt({
            type: 'confirm',
            name: 'isContinue',
            message: '当前文件夹存在该项目，创建将覆盖，是否继续？'
          })).isContinue
        }
        if (isContinue) {
          isContinue = (await inquirer.prompt({
            type: 'confirm',
            name: 'isContinue',
            message: `确定覆盖该文件夹${this.projectName}？`
          })).isContinue
        }
        // 清空文件夹
        if (isContinue) {
          fs.rm(this.projectPath, { recursive: true }, (err) => {
            if (err) throw err;
            log.verbose('remove complete!');
          })

        }

        if (!isContinue) return


      } catch (e) {
        log.error(e.message)
        if (process.env.LOCAL_LEVEL === 'verbose') {
          console.log(e)
        }
      }

    }
    this.projectInfo = await this.getProjectInfo()
  }
  async getProjectInfo() {
    let projectInfo = {}
    const { type } = await inquirer.prompt({
      name: 'type',
      type: 'list',
      message: '请选择初始化项目信息',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT
      }, {
        name: '组件',
        value: TYPE_COMMONENT
      }]
    })
    const title = type === 'project' ? '项目' : '组件'
    projectInfo = await inquirer.prompt([{
      type: 'input',
      name: 'projectName',
      default: this.projectName,
      message: `请输入${title}名称`,
      validate(v) {
        const r = /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/

        const done = this.async();
        setTimeout(function () {
          if (!r.test(v)) {
            done(`请输入正确${title}名称，如：aaa, aaa-bbb, aaa_bbb, aaa_b23`);
            return;
          }
          done(null, true);
        }, 0)
      },
      filter(v) {
        return v
      }
    }, {
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本`,
      default: '1.0.0',
      validate(v) {
        // return !!semver.valid(v)
        const done = this.async();
        setTimeout(function () {
          if (!semver.valid(v)) {
            done('请输入正确版本号，如：x.x.x');
            return;
          }
          done(null, true);
        }, 0)

      },
      filter(v) {
        return semver.valid(v) ? semver.valid(v) : v
      }
    }, {
      type: 'list',
      name: 'npmName',
      message: `请选择${title}模版`,
      default: '1.0.0',
      choices: this.getTemplateList()
    },
    ])
    this.template.filter(v => v.tag?.includes(type))
    // 获取基本信息
    if (type === TYPE_PROJECT) {


    }
    return projectInfo
  }
  getTemplateList() {
    return this.template.map(t => ({
      value: t.npmName,
      name: t.name
    }))
  }
  isCmdEmptyDir() {
    return !fs.existsSync(this.projectPath)
  }
}
function init(argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand
