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
const PAGE_TEMPLATE = [
  {
    name: "VUe2首页模版",
    npmName: "imooc-cli-dev-template-page-vue2",
    version: "1.0.4",
    targetPath: "src/views/Home",
  },
]
process.on("unhandledRejection", (e) => {
  log.error(e)
})
class AddCommand extends Command {
  init() {
    console.log("init")
  }
  async exec() {
    // 1、获取页面安装文件夹
    this.dir = process.cwd()

    // 2、 选择页面模版
    this.pageTemplate = await this.getPageTemplate()
    // 3、安装模版
    // 检查
    await this.prepare()
    await this.downloadTemplate()
    // 4、安装模版
    await this.installTemplate()
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
  }
  async prepare() {
    //  最终拷贝的路径
    this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName)
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
    const spinner = spinnerStart("正在下载页面模版")
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
          log.success("下载页面模板成功")
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
          log.success("更新页面模板成功")
        }
      }
    }
    this.pageTemplatePackage = pageTemplatePackage
  }
  async getPageTemplate() {
    const { pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplateName",
      message: "请选择页面模版",
      choices: this.createChoices(),
    })
    const pageTemplate = PAGE_TEMPLATE.find((item) => {
      return item.name === pageTemplateName
    })
    if (!pageTemplate) {
      throw new Error("页面模版不存在")
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入页面名称",
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
    log.verbose(pageTemplate, "pageTemplate")
    return pageTemplate
  }
  createChoices() {
    return PAGE_TEMPLATE.map((item) => {
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
