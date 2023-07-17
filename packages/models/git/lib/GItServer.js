// 父类
class GitServer {
  constructor(type, token) {
    this.type = type
    this.token = token
  }
  setToken() {
    throw new Error('setToken function much realize')
  }
  createRepo() {
    throw new Error('createRepo function much realize')
  }
  getRemote() {
    throw new Error('getRemote function much realize')
  }
  getUser() {
    throw new Error('getUser function much realize')
  }
  getOrg() {
    throw new Error('getOrg function much realize')
  }
  getSSHkeyUrl() {
    throw new Error('getSSHkeyUrl function much realize')
  }
  getTokenHelpUrl() {
    throw new Error('getTokenHelpUrl function much realize')
  }
}
module.exports = GitServer
