import { nanoid } from 'nanoid'
/**
 * 数据上报
 * @param {*} data 上报参数
 * @param {*} options 附加属性
 * eventType: PV EXP CLICK CUSTOM
 */
export const upload = (param, options = {}, isSendBeacon = false) => {
  // 获取user_id和vistor_id
  let userId = window.localStorage.getItem('user_id')
  let visitorId = window.localStorage.getItem('visitor_id')
  if (!visitorId) {
    visitorId = nanoid(10)
    window.localStorage.setItem('visitor_id', visitorId)
  }
  if (!userId) {
    userId = visitorId
  }
  const { eventType = 'PV' } = options
  const src = 'http://localhost:7001/monitor/upload?' + param + `&eventType=${eventType}&userId=${userId}&visitorId=${visitorId}`
  if (isSendBeacon) {
    console.log('issendbeacon')
    // 页面关闭前发送请求
    window.navigator.sendBeacon(src)
  } else {
    let img = new Image()
    img.src = src
    img = null //内存释放
  }
}
