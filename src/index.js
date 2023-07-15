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
}
