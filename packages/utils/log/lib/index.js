'use strict';
const log = require('npmlog')
// log 自定义颜色
log.level = process.env.LOCAL_LEVEL? process.env.LOCAL_LEVEL: 'info'
log.addLevel('success', 2000, {color: 'greed', bold: true})
log.heading = 'power-cli:' //修改前缀
log.headingStyle ={fg: 'red',bold: true}//前缀颜色




module.exports = log;