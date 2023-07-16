"use strict"
const Command = require("@power-cli/command")
const inquirer = require("inquirer")
const { homedir } = require("os")
const path = require("path")
const Package = require("@power-cli/package")
const { spinnerStart } = require("@power-cli/utils")
const log = require("@power-cli/log")
const fs = require("fs")
const { glob } = require("glob")
const ejs = require("ejs")
const pkgUp = require("pkg-up")
const { execSync } = require("child_process")
const semver = require("semver")
const request = require("../../../utils/request/lib")

let PAGE_TEMPLATE = [
  {
    name: "VUe2首页模版",
    npmName: "imooc-cli-dev-template-page-vue2",
    version: "1.0.4",
    targetPath: "src/views/Home",
  },
]
let SECTION_TEMPLATE = [
  {
    name: "Vue2代码片段",
    npmName: "imooc-cli-dev-template-section-vue",
    version: "latest",
    targetPath: "",
  },
  {
    name: "vue2代码片段webpack处理过",
    npmName: "imooc-cli-dev-template-section-vue-template",
    version: "latest",
    targetPath: "src/",
  },
]

const ADD_MODE_SECTION = "section"
const ADD_MODE_PAGE = "page"

process.on("unhandledRejection", (e) => {
  log.error(e)
})
class AddCommand extends Command {
  async init() {
    const pageTemplateData = await this.getPageTemplate()
    PAGE_TEMPLATE = pageTemplateData
    const sectionTemplateData = await this.getSectionTemplate()
    SECTION_TEMPLATE = sectionTemplateData
  }
  async exec() {
    // 1、 代码片段
    const { addMode } = await this.getAddMode()
    this.addMode = addMode
    if (this.addMode === "section") {
      // 代码片段
      await this.installSectionTemplate()
    } else {
      // 页面模版
      await this.installPageTemplate()
    }
  }
  async getPageTemplate() {
    return request({
      url: "/page/template",
      method: "get",
    })
  }
  getSectionTemplate() {
    return request({
      url: "/section/template",
      method: "get",
    })
  }
  async installSectionTemplate() {
    // 1、获取页面安装文件夹
    this.dir = process.cwd()
    // 2、 选择代码片段
    this.pageTemplate = await this.getTemplate(ADD_MODE_SECTION)
    // 检查
    await this.prepare(ADD_MODE_SECTION)
    // 代码片段下载
    await this.downloadTemplate()
    // 代码片段安装
    await this.installSection()
  }
  async installSection() {
    // 选择要插入的源码文件
    let files = fs.readdirSync(this.dir, { withFileTypes: true }) // 读取文件类型
    files = files
      .map((file) => (file.isFile() ? file.name : null))
      .filter((item) => item)
    files = files.map((file) => ({ name: file, value: file }))
    if (files.length === 0) {
      throw new Error("该文件夹下没有目录")
    }
    const { codeFile } = await inquirer.prompt({
      type: "list",
      message: "请选择要插入代码片段的源码文件",
      name: "codeFile",
      choices: files,
    })

    // 需要用户输入行数
    const { lineNumber } = await inquirer.prompt({
      type: "input",
      message: "请输入要插入的行数",
      name: "lineNumber",
      validate(value) {
        const done = this.async()
        if (!value || !value.trim()) {
          done("请输入要插入的行数")
          return
        } else if (value >= 0 && Math.floor(value) === Number(value)) {
          done(null, true)
        } else {
          done("插入的行数必须是整数")
        }
      },
    })
    log.verbose("codeFile", codeFile)
    log.verbose("lineNumber", lineNumber)
    // 读取源码文件分割成数组
    const codeFilePath = path.resolve(this.dir, codeFile)
    const codeContent = fs.readFileSync(codeFilePath, "utf-8")
    const codeContentArr = codeContent.split("\n")
    // 插入代码片段
    const componentName = this.pageTemplate.pageName.toLocaleLowerCase()
    codeContentArr.splice(
      lineNumber,
      0,
      `<${componentName}></${componentName}>`
    )
    // 插入import语句
    const componentNameOriginal = this.pageTemplate.pageName
    const scriptIndex = codeContentArr.findIndex(
      (code) => code.replace(/\s/g, "") === "<script>"
    )
    codeContentArr.splice(
      scriptIndex + 1,
      0,
      `import ${componentNameOriginal} from './components/${componentNameOriginal}/index.vue'`
    )
    // 转化为字符串
    const newCodeContent = codeContentArr.join("\n")
    fs.writeFileSync(codeFilePath, newCodeContent, "utf-8")
    log.success("代码写入成功")

    const templatePath = path.resolve(
      this.pageTemplatePackage.storePath,
      this.pageTemplatePackage.pkgName,
      "template",
      this.pageTemplate.targetPath
    )
    log.verbose("codeFilePath", codeFilePath)
    log.verbose("tempaltePath", templatePath)
    log.verbose("targetPath", this.targetPath)
    fs.mkdirSync(this.targetPath, { recursive: true })
    fs.cpSync(templatePath, this.targetPath, {
      recursive: true, //拷贝文件夹
      dereference: true, // 拷贝真实目录
      force: false,
    })
  }
  async installPageTemplate() {
    // 1、获取页面安装文件夹
    this.dir = process.cwd()
    // 2、 选择页面模版
    this.pageTemplate = await this.getTemplate(ADD_MODE_PAGE)
    // 3、安装模版
    // 检查
    await this.prepare(ADD_MODE_PAGE)
    await this.downloadTemplate()
    // 4、安装模版
    await this.installTemplate()
  }
  async getAddMode() {
    return inquirer.prompt({
      type: "list",
      message: "请选择代码添加模式",
      name: "addMode",
      choices: [
        {
          name: "代码片段",
          value: ADD_MODE_SECTION,
        },
        {
          name: "页面模版",
          value: ADD_MODE_PAGE,
        },
      ],
    })
  }
  transformArr(obj) {
    const result = Object.entries(obj).map((item) => {
      const o = {}
      o.key = item[0]
      o.value = item[1]
      return o
    })
    return result
  }
  async dependenciesMerge(options) {
    const { templatePath, targetPath } = options
    const templatePkgPath = await pkgUp({ cwd: templatePath })
    const targetPkgPath = await pkgUp({ cwd: targetPath })
    // 读取模板和目标的package值
    const templatePkg = require(templatePkgPath)
    const targetPkg = require(targetPkgPath)
    const templateDepdencies = templatePkg.dependencies || {}
    const targetDepdencies = targetPkg.dependencies || {}
    // 转化成数组
    const templateDepdenciesArr = this.transformArr(templateDepdencies)
    const targetDepdenciesArr = this.transformArr(targetDepdencies)
    // diff算法
    const newDep = await this.depDiff(
      templateDepdenciesArr,
      targetDepdenciesArr
    )
    // 写入target package里
    newDep.forEach((item) => {
      targetPkg.dependencies[item.key] = item.value
    })
    fs.writeFileSync(targetPkgPath, JSON.stringify(targetPkg, null, 2), {
      encoding: "utf-8",
    })
    // 自动安装依赖
    log.info("正在安装模板依赖")
    await this.exeCommand("npm install", path.dirname(targetPkgPath))
    log.success("安装模板依赖成功")
  }
  async exeCommand(command, cwd) {
    execSync(command, {
      cwd,
      stdio: "inherit", // 显示在父进程中
    })
  }
  async depDiff(temArr, tarArr) {
    let arr = []
    temArr.forEach((temDep) => {
      const findDep = tarArr.find((tarDep) => tarDep.key === temDep.key)
      if (findDep) {
        log.verbose("查询到重复依赖", findDep)
        const templateRange = semver.validRange(temDep.value).split("<")[1]
        const targetRange = semver.validRange(findDep.value).split("<")[1]
        if (templateRange !== targetRange) {
          log.warn(`${temDep.key}冲突， ${temDep.value} => ${findDep.value}`)
        }
      } else {
        arr.push(temDep)
      }
    })
    return arr
  }
  async ejsRender(options) {
    const { targetPath } = options
    const pageTemplate = this.pageTemplate

    try {
      const files = await glob("**", {
        cwd: targetPath,
        nodir: true,
        ignore: "assets/**",
      })
      files.map(async (file) => {
        const filePath = path.resolve(targetPath, file)
        const result = await ejs.renderFile(
          filePath,
          {
            name: pageTemplate.pageName,
          },
          {}
        )
        // 写入å
        fs.writeFileSync(filePath, result)
      })
    } catch (e) {
      throw new Error(e)
    }
  }
  async installTemplate() {
    // 模版路径
    const templatePath = path.resolve(
      this.pageTemplatePackage.storePath,
      this.pageTemplatePackage.pkgName,
      "template",
      this.pageTemplate.targetPath
    )

    if (!fs.existsSync(templatePath)) {
      throw new Error("拷贝地址不存在")
    }
    // 目标路径
    const targetPath = this.targetPath
    log.verbose("templatePath", templatePath)
    log.verbose("targetPath", targetPath)
    fs.mkdirSync(targetPath)
    fs.cpSync(templatePath, targetPath, {
      recursive: true, //拷贝文件夹
      dereference: true, // 拷贝真实目录
      force: false,
    })

    await this.ejsRender({ targetPath })
    // 5、依赖合并
    await this.dependenciesMerge({ templatePath, targetPath })
  }
  async prepare(addMode) {
    //  最终拷贝的路径
    if (addMode === ADD_MODE_PAGE) {
      this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName)
    } else {
      this.targetPath = path.resolve(
        this.dir,
        "components",
        this.pageTemplate.pageName
      )
    }
    if (fs.existsSync(this.targetPath)) {
      throw new Error("页面模版已存在")
    }
  }
  async downloadTemplate() {
    // 缓存文件夹
    const targetPath = path.resolve(homedir(), ".power-cli", "template")
    // 缓存真实路径
    const storeDir = path.resolve(targetPath, "node_modules")

    // 构建package
    const { npmName, version } = this.pageTemplate
    const spinner = spinnerStart("正在下载模板")
    const pageTemplatePackage = new Package({
      targetPath,
      storePath: storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    log.verbose("pageTemplatePackage", pageTemplatePackage)
    if (!(await pageTemplatePackage.exists())) {
      try {
        await pageTemplatePackage.install()
      } catch (e) {
        throw new Error(e)
      } finally {
        spinner.stop(true)
        if (await pageTemplatePackage.exists()) {
          log.success("下载模板成功")
        }
      }
    } else {
      try {
        await pageTemplatePackage.update()
      } catch (e) {
        throw new Error(e)
      } finally {
        spinner.stop(true)
        if (await pageTemplatePackage.exists()) {
          log.success("更新模板成功")
        }
      }
    }
    this.pageTemplatePackage = pageTemplatePackage
  }
  async getTemplate(addMode) {
    const name = addMode === ADD_MODE_PAGE ? "页面模板" : "代码片段"
    const TEMPLATE =
      addMode === ADD_MODE_PAGE ? PAGE_TEMPLATE : SECTION_TEMPLATE

    const { pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplateName",
      message: "请选择" + name,
      choices: this.createChoices(addMode),
    })
    const pageTemplate = TEMPLATE.find((item) => {
      return item.name === pageTemplateName
    })
    if (!pageTemplate) {
      throw new Error("页面模版不存在")
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入" + name + "名称",
      default: "",
      validate(value) {
        const done = this.async()
        if (!value || !value.trim()) {
          done("请输入页面名称")
          return
        }
        done(null, true)
      },
    })
    pageTemplate.pageName = pageName.trim()
    log.verbose(JSON.stringify(pageTemplate, null, 2), "pageTemplate")
    return pageTemplate
  }
  createChoices(addMode) {
    return addMode === ADD_MODE_PAGE
      ? PAGE_TEMPLATE.map((item) => {
          return {
            name: item.name,
            npmName: item.npmName,
          }
        })
      : SECTION_TEMPLATE.map((item) => {
          return {
            name: item.name,
            npmName: item.npmName,
          }
        })
  }
}
function add(argv) {
  return new AddCommand(argv)
}

module.exports = add
module.exports.AddCommand = AddCommand
