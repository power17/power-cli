'use strict';
const path = require('path')
const axios = require('axios')
const semver = require('semver');
async function getNpmInfo(pkgName, registry = '') {
  if(!pkgName) {return}
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = path.join(registryUrl, pkgName)
  const res = await axios.get(npmInfoUrl)
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
async function getNpmVersion(pkgName, registry) {
  const data = await getNpmInfo(pkgName) || {}

  return data.versions? Object.keys(data.versions) : ""
}
async function getNewVersion(pkgName, registry) {
  const data = await getNpmInfo(pkgName) || {}

  return data['dist-tags']?.latest
}
// 获取满足版本号 （废弃）
function getSemverVersion(baseVersion, versions = []){
  versions = versions.filter(version => semver.satisfies(version, `^${baseVersion}`))

  return versions
}



module.exports = {
  getNpmInfo,
  getNpmVersion,
  getSemverVersion,
  getNewVersion,
  getDefaultRegistry
};
