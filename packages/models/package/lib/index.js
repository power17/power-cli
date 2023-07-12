"use strict"
const path = require("path")
const fs = require("fs")
const { isObject, formatPath } = require("@power-cli/utils")
const pkgDir = require("pkg-dir")
const npminstall = require("npminstall")
const { getDefaultRegistry, getNewVersion } = require("@power-cli/get-npm-info")
class Package {
  constructor(options = {}) {
    if (!isObject(options)) {
      throw new Error("Package类的options参数必须是对象")
    }
    // package路径
    this.targetPath = options.targetPath
    // 存储在本地的路径
    this.storePath = options.storePath
    // package  name
    this.pkgName = options.packageName
    // pkg version
    this.pkgVersion = options.packageVersion
  }
  async exists() {
    if (this.storePath) {
      // 文件不存在，创建
      if (!fs.existsSync(this.storePath)) {
        fs.mkdir(this.storePath, { recursive: true }, (err) => {
          if (err) {
            console.error("缓存目录创建成功")
          }
        })
      }
      if (this.packageVersion === "latest") {
        this.packageVersion = await getNewVersion(this.packageName)
      }
      console.log("storePath", this.storePath)
      return fs.existsSync(path.resolve(this.storePath, this.pkgName))
    } else {
      return fs.existsSync(this.targetPath)
    }
  }
  async install() {
    return await npminstall({
      // install root dir
      root: path.resolve(this.targetPath),
      storeDir: this.storePath, //安装目录
      registry: getDefaultRegistry(false), //false：淘宝源
      pkgs: [
        {
          name: this.pkgName,
          version: this.pkgVersion,
        },
      ],
    })
  }
  async update() {
    const lastVersion = await getNewVersion(this.pkgName)
    const chacheVersion = this.getSpecificCacheFilePath()
    if (lastVersion !== chacheVersion) {
      await npminstall({
        // install root dir
        root: path.resolve(this.targetPath),
        storeDir: this.storePath, //安装目录
        registry: getDefaultRegistry(false), //false：淘宝源
        pkgs: [
          {
            name: this.pkgName,
            version: lastVersion,
          },
        ],
      })
      this.packageVersion = lastVersion
    }
  }
  // 获取缓存包的版本
  getSpecificCacheFilePath() {
    const pkg =
      require(path.resolve(this.storePath, this.pkgName, "package.json")) || {}
    return pkg.version
  }
  getRootFilePath() {
    console.log(this.targetPath)
    const _getRootFile = (targetPath) => {
      // 找到package.json的目录
      const dir = pkgDir.sync(targetPath)
      if (dir) {
        // 读取package.json
        const pkgFile = require(path.resolve(dir, "package.json"))
        // 入口路径
        if (pkgFile?.main) {
          // 兼容window
          return formatPath(path.resolve(dir, pkgFile.main))
        }
        return null
      }
    }
    if (this.storePath) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }
  get cacheFilePath() {
    const pkg = require(path.resolve(
      this.storePath,
      this.pkgName,
      "package.json"
    ))
    return path.resolve(this.storePath, this.pkgName, pkg.main)
  }
}
module.exports = Package
