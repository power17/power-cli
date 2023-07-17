const GitServer = require('./GItServer')
const GiteeRequest = require('./GitRequest')
class Gitee extends GitServer {
  constructor() {
    super('gitee')
    this.token = null
    this.request = null
  }
  getTokenUrl() {
    return 'https://gitee.com/personal_access_tokens'
  }
  setToken(token) {
    this.token = token
    this.request = new GiteeRequest(token, 'gitee')
  }
  getUser() {
    return this.request.get('/user')
  }
  // 获取组织
  getOrg(username) {
    return this.request.get(`/users/${username}/orgs`, {
      page: 1,
      per_page: 100,
    })
  }
}
module.exports = Gitee
