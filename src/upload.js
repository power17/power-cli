/**
 * 数据上报
 * @param {*} data 上报参数
 * @param {*} options 附加属性
 * eventType: PV EXP CLICK CUSTOM
 */
export const upload = (data, options = {}) => {
  let img = new Image()
  const param = encodeURIComponent(data)
  const { eventType = 'PV' } = options
  img.src = 'http://www.imooc.com?data=' + param + `&eventType=${eventType}`

  console.log(param, img.src)
  img = null //内存释放
}
