const GitServer = require('./GItServer')
class Gitee extends GitServer {
  constructor() {
    super('gitee')
  }
  getTokenUrl() {
    return 'https://gitee.com/personal_access_tokens';
  }
}
module.exports = Gitee