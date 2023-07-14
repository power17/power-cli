import { collect, sendPv, registerBeforeCreateParams, registerBeforeUpload, registerAfterUpload, registerOnError } from './collect'
import { upload } from './upload'
window.powerMonitor = {
  collect,
  sendPv,
  upload,
  registerBeforeCreateParams,
  registerBeforeUpload,
  registerAfterUpload,
  registerOnError,
}
