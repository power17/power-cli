import { collect, sendPv, registerBeforeCreateParams, registerBeforeUpload, registerAfterUpload, registerOnError, sendExp } from './collect'
import { upload } from './upload'
// 曝光
const appearEvent = new CustomEvent('appear')
const disappearEvent = new CustomEvent('disappear')
const observe = new IntersectionObserver((e) => {
  for (let event of e) {
    if (event.intersectionRatio > 0) {
      event.target.dispatchEvent(appearEvent)
    } else {
      event.target.dispatchEvent(disappearEvent)
    }
  }
}, {})
const apper = document.querySelectorAll('[appear]')
Array.from(apper).forEach((item) => {
  observe.observe(item)
})
window.powerMonitor = {
  sendPv,
  upload,
  registerBeforeCreateParams,
  registerBeforeUpload,
  registerAfterUpload,
  registerOnError,
  sendExp,
}
