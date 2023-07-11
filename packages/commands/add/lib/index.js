'use strict';
const Command = require('@power-cli/command');
const inquirer = require('inquirer');
const PAGE_TEMPLATE = [
  {
    name: 'VUe2首页模版',
    npmName: 'imooc-cli-dev-template-page-vue2',
    version: '1.0.0',
    targetPath: 'src/views/Home',
  },
];
class AddCommand extends Command {
  init() {
    console.log('init');
  }
  async exec() {
    // 1、获取页面安装文件夹
    const dir = process.cwd();
    // 2、 选择页面模版
    const pageTemplate = this.getPageTemplate();
  }
  async getPageTemplate() {
    const { pageTemplateName } = await inquirer.prompt({
      type: 'list',
      name: 'pageTemplateName',
      message: '请选择页面模版',
      choices: this.createChoices(),
    });
    const pageTemplate = PAGE_TEMPLATE.find((item) => {
      return item.name === pageTemplateName;
    });
    if (!pageTemplate) {
      throw new Error('页面模版不存在');
    }
    const { pageName } = await inquirer.prompt({
      type: 'input',
      name: 'pageName',
      message: '请输入页面名称',
      default: '',
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done('请输入页面名称');
          return;
        }
        done(null, true);
      },
    });
    pageTemplate.pageName = pageName.trim();
    return pageTemplate;
  }
  createChoices() {
    return PAGE_TEMPLATE.map((item) => {
      return {
        name: item.name,
        npmName: item.npmName,
      };
    });
  }
}
function add(argv) {
  return new AddCommand(argv);
}

module.exports = add;
module.exports.AddCommand = AddCommand;
