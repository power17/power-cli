'use strict'
const request = require('@power-cli/request')

module.exports = () => {
  return request({
    url: '/project/getTemplate'
  })
}