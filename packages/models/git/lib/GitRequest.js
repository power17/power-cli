const axios = require('axios')
const log = require('@power-cli/log')
const GITEE_BASE_URL = 'https://gitee.com/api/v5'
const GITHUB_BASE_URL = 'https://api.github.com'

class GiteeRequest {
  constructor(token, type = 'github') {
    this.token = token
    this.type = type
    console.log(this.type, 'type')
    let baseUrl = null
    if (this.type === 'github') {
      baseUrl = GITHUB_BASE_URL
    } else if (this.type === 'gitee') {
      baseUrl = GITEE_BASE_URL
    }
    this.service = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
    })
    this.service.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['Authorization'] = `token ${this.token}`
        }
        return config
      },
      (error) => {
        Promise.reject(error)
      }
    )
    this.service.interceptors.response.use(
      (response) => {
        return response.data
      },
      (error) => {
        if (error.response.status !== 200) {
          log.error(
            this.type,
            `请求接口失败,http: ${error.response.status}`,
            error.response.data.message
          )
          return
        }
        if (error.response && error.response.data) {
          return error.response
        } else {
          return Promise.reject(error)
        }
      }
    )
  }

  get(url, params, headers) {
    return this.service({
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      method: 'get',
      headers,
    })
  }

  post(url, data, headers) {
    return this.service({
      url,
      params: {
        access_token: this.token,
      },
      data,
      method: 'post',
      headers,
    })
  }
}

module.exports = GiteeRequest
