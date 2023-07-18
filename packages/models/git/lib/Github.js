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
  getRepo(login, name) {
    return this.request.get(`/repos/${login}/${name}`).then((response) => {
      return response
    })
  }
  getTokenUrl() {
    return 'https://github.com/settings/tokens'
  }
  createRepo(name) {
    return this.request.post(
      '/user/repos',
      {
        name,
      },
      {
        'X-GitHub-Api-Version': '2022-11-28',
      }
    )
  }

  createOrgRepo(name, login) {
    return this.request.post(
      `/orgs/${login}/repos`,
      {
        name,
      },
      {
        Accept: 'application/vnd.github.v3+json',
      }
    )
  }
  getRemote(login, name) {
    return `git@github.com:${login}/${name}.git`
  }
}
module.exports = Github
