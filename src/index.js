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
  sendPerformance,
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
  sendPerformance,
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
// pv统计
window.addEventListener('load', () => {
  window._powerMonitor = {}
  window._powerMonitor._ENTER_TIME = new Date().getTime()
  sendPv()
})
// 停留时长统计
window.addEventListener('beforeunload', () => {
  if (!window._powerMonitor._ENTER_TIME) {
    console.warn('无法获取页面加载时间')
    return
  }
  window._powerMonitor._LEAVE_TIME = new Date().getTime()
  const stayTime = window._powerMonitor._LEAVE_TIME - window._powerMonitor._ENTER_TIME
  sendStayTime({ stayTime })
})

// 性能监控
const callback = (perf) => {
  let fp = 0
  let fcp = 0
  let lcp = 0
  perf.getEntries().forEach((timing) => {
    if (timing.name === 'first-paint') {
      fp = timing.startTime
    } else if (timing.name === 'first-contentful-paint') {
      fcp = timing.startTime
    } else if (timing.entryType === 'largest-contentful-paint') {
      lcp = timing.startTime
    }
  })
  sendPerformance({
    fp,
    fcp,
    lcp,
  })
}
const observe = new PerformanceObserver(callback)
observe.observe({
  entryTypes: ['paint', 'largest-contentful-paint', 'mark'],
})
