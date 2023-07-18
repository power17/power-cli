'use strict';
const log = require('@power-cli/log');
class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('command 参数不能为空');
    }
    if (!Array.isArray(argv)) {
      throw new Error('command 参数必须为数组');
    }
    if (argv.length < 1) {
      throw new Error('command 参数不能为空');
    }

    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      // 命令执行
      chain.then(() => {
        this.initArgs();
      });
      chain.then(() => {
        this.init();
      });
      chain.then(() => {
        this.exec();
      });
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    // this._argv = this._argv.slice(0, this._argv.length - 1)
  }
  init() {
    throw new Error('init 必须实现');
  }
  exec() {
    throw new Error('exec 必须实现');
  }
}

module.exports = Command;
