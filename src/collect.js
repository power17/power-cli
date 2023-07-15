import { upload } from './upload'
import qs from 'qs'

let beforeCreateParams
let beforeUpload
let afterUpload
let onError
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

  // 3、调用日志上报API
  let params = {
    appId,
    pageId,
    timestamp,
    ua,
    ...customData,
  }
  let data = qs.stringify(params)
  //  data = `appId=${appId}&pageId=${pageId}&timestamp=${timestamp}&ua=${ua}`
  if (beforeUpload) {
    data = beforeUpload(data)
  }
  try {
    let url, uploadData
    const ret = upload(data, { eventType })
    url = ret.url
    uploadData = ret.data
  } catch (e) {
    onError ? onError(e) : console.error(e)
  } finally {
    afterUpload && afterUpload()
  }
}
// 发送pv日志
export const sendPv = () => {
  collect({}, 'PV')
}
// 上报曝光埋点
export const sendExp = (data) => {
  collect(data, 'EXP')
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
