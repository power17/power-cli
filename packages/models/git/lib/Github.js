const GitServer = require('./GItServer')
class Github extends GitServer {
  constructor() {
    super('github')
  }
  getTokenUrl() {
    return 'https://github.com/settings/tokens'
  }
}
module.exports = Github
