# 操作
```shell
npm link  
npm unlink -g
npm remove pkg -g
# 链接本地的库
npm link pkg 
# 问题：Current HEAD is already released, skipping change detection.
lerna publish from-package
# 改掉文件后强制发布新版本
lerna publish --force-publish
# 安装依赖
lerna add semver --scope @power-cli/core

```
# 注意点
- 很多包新版本的package.json中设置了type:’module’，commonjs也可以引入esmodule，用动态import()方法

