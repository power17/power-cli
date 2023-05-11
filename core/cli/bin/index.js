#!/usr/bin/env node
const importLocal = require('import-local')
console.log(__filename)
console.log(process.cwd() , 'cwd')

if(importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用power-cli本地版本')
}else{
  require('../lib')(process.argv.slice(2))

  // jfls

  
}

