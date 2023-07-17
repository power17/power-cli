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
  getRepo(login, name) {
    return new Promise((resolve, reject) => {
      this.request
        .get(`/repos/${login}/${name}`)
        .then((response) => {
          resolve(response)
        })
        .catch((err) => reject(err))
    })
  }
  createRepo(name) {
    return this.request.post('/user/repos', {
      name,
    })
  }

  createOrgRepo(name, login) {
    return this.request.post(`/orgs/${login}/repos`, {
      name,
      org: login,
    })
  }
  getRemote(login, name) {
    return `git@gitee.com:${login}/${name}.git`
  }
}
module.exports = Gitee
