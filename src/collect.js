import { upload } from './upload'
import qs from 'qs'

let beforeCreateParams
let beforeUpload
let afterUpload
let onError
// 曝光统计
export const collectAppear = () => {
  // 曝光
  const appearEvent = new CustomEvent('appear')
  const disappearEvent = new CustomEvent('disappear')
  let observe
  if (window.powerMonitorObserve) {
    observe = window.powerMonitorObserve
  } else {
    observe = new IntersectionObserver((e) => {
      for (let event of e) {
        if (event.intersectionRatio > 0) {
          event.target.dispatchEvent(appearEvent)
        } else {
          event.target.dispatchEvent(disappearEvent)
        }
      }
    }, {})
  }
  let obList = []
  const apper = document.querySelectorAll('[appear]')
  Array.from(apper).forEach((item) => {
    if (!obList.includes(item)) {
      observe.observe(item)
      obList.push(item)
    }
  })

  window.powerMonitorObserve = observe
  window.powerMonitorObserveList = obList
}
// 采集上报数据
const collect = (customData, eventType) => {
  // 1、采集页面的基本信息
  //    a、应用ID
  //    b、页面ID
  beforeCreateParams && beforeCreateParams()
  const meta = document.getElementsByTagName('meta')
  let appId
  for (let i = 0; i < meta.length; i++) {
    const metaDom = meta[i]
    if (metaDom.getAttribute('power-app-id')) {
      appId = metaDom.getAttribute('power-app-id')
    }
  }
  // 2、日志上报
  //    a、应用id和页面id
  //    b、访问时间
  //    c、ua
  const pageId = document.body.getAttribute('power-page-id')
  if (!appId || !pageId) {
    console.error('appId和pageId为空')
    return
  }
  // 时间戳
  const timestamp = new Date().getTime()
  const ua = window.navigator.userAgent
  const url = window.location.href
  console.log(url, 'url')

  // 3、调用日志上报API
  let params = {
    appId,
    pageId,
    timestamp,
    ua,
    url,
    ...customData,
  }
  let data = qs.stringify(params, { charset: 'utf-8' })

  //  data = `appId=${appId}&pageId=${pageId}&timestamp=${timestamp}&ua=${ua}`
  if (beforeUpload) {
    data = beforeUpload(data)
  }
  try {
    // let url, uploadData

    const ret = upload(data, { eventType })
    // url = ret.url
    // uploadData = ret.data
  } catch (e) {
    onError ? onError(e) : console.error(e)
  } finally {
    afterUpload && afterUpload()
  }
}
export const sendClick = (data = {}) => {
  console.log('click')
  collect(data, 'CLICK')
}
// 发送pv日志
export const sendPv = (data = {}) => {
  collect(data, 'PV')
}
// 上报曝光埋点
export const sendExp = (data = {}) => {
  collect(data, 'EXP')
}
// 上报曝光埋点
export const sendCustom = (data = {}) => {
  collect(data, 'Custom')
}

export const registerBeforeCreateParams = (fn) => {
  beforeCreateParams = fn
}
export const registerBeforeUpload = (fn) => {
  beforeUpload = fn
}

export const registerAfterUpload = (fn) => {
  afterUpload = fn
}
export const registerOnError = (fn) => {
  onError = fn
}
