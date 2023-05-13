'use strict';
const path = require('path')
const axios = require('axios')
async function getNpmInfo(pkgName, registry = '') {
  if(!pkgName) {return}
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = path.join(registryUrl, pkgName)
  const res = await axios.get(npmInfoUrl)
  console.log( res,'res', npmInfoUrl)
  try{
    if(res.status === 200) {
      return res.data
    }
    return null
  }catch (err){
    console.log('获取npm版本信息接口报错')
    return Promise.reject(err)
  }
}
function getDefaultRegistry(isOrigin = false) {
  return isOrigin ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'


}

module.exports = {getNpmInfo};
