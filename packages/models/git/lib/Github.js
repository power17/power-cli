const GitServer = require('./GItServer')
const GithubRequest = require('./GitRequest')
class Github extends GitServer {
  constructor() {
    super('github')
    this.token = null
    this.request = null
  }
  setToken(token) {
    this.token = token
    this.request = new GithubRequest(token, 'github')
  }
  getUser() {
    return this.request.get('/user')
  }
  getOrg() {
    return this.request.get(`/user/orgs`, {
      page: 1,
      per_page: 100,
    })
  }
  getTokenUrl() {
    return 'https://github.com/settings/tokens'
  }
}
module.exports = Github
