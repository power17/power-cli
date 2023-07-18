'use strict';
const request = require('@power-cli/request');
const inquirer = require('inquirer');
const log = require('@power-cli/log');
const io = require('socket.io-client');
const TIME_OUT = 5 * 60 * 1000; //5分钟
const CONNECT_TIME_OUT = 5 * 1000; // 连接超时时间
const WS_SERVER = 'http://localhost:7001';
const get = require('lodash/get');

const FAILED_CODE = [
  'prepare failed',
  'download failed',
  'install failed',
  'build failed',
  'pre-publish failed',
  'publish failed',
];
class CloudBuild {
  constructor(git, options) {
    this.git = git;
    this.buildCmd = this.git.buildCmd;
    this.buildCmd = options.buildCmd;
    this.timeout = TIME_OUT;
    this.prod = options.prod;
  }
  doTimeout(fn, timeout) {
    this.timer && clearTimeout(this.timer);
    log.info('设置任务超时时间：', `${timeout / 1000}秒`);
    this.timer = setTimeout(fn, timeout);
  }
  parseMsg(msg) {
    const action = get(msg, 'data.action');
    const message = get(msg, 'data.payload.message');
    return {
      action,
      message,
    };
  }
  init() {
    return new Promise((resolve, reject) => {
      console.log(
        this.git.remote,
        this.git.name,
        this.git.branch,
        this.git.version
      );
      const socket = io(WS_SERVER, {
        query: {
          repo: this.git.remote, // 仓库远程地址
          name: this.git.name,
          branch: this.git.branch,
          version: this.git.version,
          buildCmd: this.buildCmd,
          prod: this.prod,
        },
      });

      socket.on('connect', () => {
        clearTimeout(this.timer);
        const { id } = socket;
        log.success('云构建任务创建成功', `任务ID: ${id}`);
        socket.on('test', (msg) => {
          console.log(msg);
        });
        socket.on(id, (msg) => {
          console.log(msg, '收到服务器消息');
          const parsedMsg = this.parseMsg(msg);
          log.success(parsedMsg.action, parsedMsg.message);
        });
        resolve();
      });
      // 错误处理
      const disconnect = () => {
        clearTimeout(this.timer);
        socket.disconnect();
        socket.close();
      };
      this.doTimeout(() => {
        log.error('云构建服务连接超时，自动终止');
        disconnect();
      }, CONNECT_TIME_OUT);
      socket.on('disconnect', () => {
        log.success('disconnect', '云构建任务断开');
        disconnect();
      });
      socket.on('error', (err) => {
        log.error('error', '云构建出错！', err);
        disconnect();
        reject(err);
      });
      this.socket = socket;
    });
  }
  build() {
    let ret = true;
    return new Promise((resolve, reject) => {
      this.socket.emit('build');
      this.socket.on('build', (msg) => {
        const parsedMsg = this.parseMsg(msg);
        if (FAILED_CODE.indexOf(parsedMsg.action) >= 0) {
          log.error(parsedMsg.action, parsedMsg.message);
          clearTimeout(this.timer);
          this.socket.disconnect();
          this.socket.close();
          ret = false;
        } else {
          log.success(parsedMsg.action, parsedMsg.message);
        }
      });
      this.socket.on('building', (msg) => {
        console.log(msg);
      });
      this.socket.on('disconnect', () => {
        resolve(ret);
      });
      this.socket.on('error', (err) => {
        reject(err);
      });
    });
  }
  async prepare() {
    // 判断是否处于正式发布
    if (this.prod) {
      // 1.获取OSS文件
      const projectName = this.git.name;
      const projectType = this.prod ? 'prod' : 'dev';
      const ossProject = await request({
        url: '/project/oss',
        params: {
          name: projectName,
          type: projectType,
        },
      });
      // 2.判断当前项目的OSS文件是否存在
      if (ossProject.code === 0 && ossProject.data.length > 0) {
        // 3.询问用户是否进行覆盖安装
        const cover = (
          await inquirer.prompt({
            type: 'list',
            name: 'cover',
            choices: [
              {
                name: '覆盖发布',
                value: true,
              },
              {
                name: '放弃发布',
                value: false,
              },
            ],
            defaultValue: true,
            message: `OSS已存在 [${projectName}] 项目，是否强行覆盖发布？`,
          })
        ).cover;
        if (!cover) {
          throw new Error('发布终止');
        }
      }
    }
  }
}

module.exports = CloudBuild;
