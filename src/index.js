import {
  sendPv,
  registerBeforeCreateParams,
  registerBeforeUpload,
  registerAfterUpload,
  registerOnError,
  sendExp,
  collectAppear,
  sendClick,
  sendCustom,
  sendStayTime,
} from './collect'
import { upload } from './upload'

window.powerMonitor = {
  sendPv,
  upload,
  registerBeforeCreateParams,
  registerBeforeUpload,
  registerAfterUpload,
  registerOnError,
  sendExp,
  collectAppear,
  sendClick,
  sendCustom,
  sendStayTime,
}

// 曝光统计
window.addEventListener('load', () => {
  collectAppear()
})
// 全局点击统计
if (!window.disableClickMonitor) {
  window.addEventListener('click', (e) => {
    e.target.className && sendClick({ target: e.target.className })
  })
}
// 停留时长
window.addEventListener('load', () => {
  window._powerMonitor = {}
  window._powerMonitor._ENTER_TIME = new Date().getTime()
})
window.addEventListener('beforeunload', () => {
  console.log('beforeUnload')
  window._powerMonitor._LEAVE_TIME = new Date().getTime()
  const stayTime = window._powerMonitor._LEAVE_TIME - window._powerMonitor._ENTER_TIME
  sendStayTime({ stayTime })
})
