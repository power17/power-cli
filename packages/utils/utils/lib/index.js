'use strict';
const path = require('path')
const Ora = require('ora')
const utils = {
  isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]'
  },
  // 兼容mac和window
  formatPath(p) {
    if (path.sep === '/') {
      return p
    } else {
      // window上的路径是反斜杠，全部替换
      return p.replace(/\\/g, '/')
    }
  },
  spinnerStart(text) {
    const spinner = new Ora(text);
    spinner.start()
    spinner.color = 'red';
    spinner.spinner = 'moon'
    // spinner.prefixText = '正在下载。。。。。。。'
    return spinner
  }
}
module.exports = utils;
