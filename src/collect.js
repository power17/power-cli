export const collect = () => {
  console.log('collect')
}
export const sendPv = () => {
  // 1、采集页面的基本信息
  //    a、应用ID
  //    b、页面ID
  const meta = document.getElementsByTagName('meta')
  let appId
  for (let i = 0; i < meta.length; i++) {
    const metaDom = meta[i]
    if (metaDom.getAttribute('power-app-id')) {
      appId = metaDom.getAttribute('power-app-id')
    }
  }
  const pageId = document.body.getAttribute('power-page-id')
  if (!appId || !pageId) {
    return
  }
  // 时间戳
  const timestamp = new Date().getTime()
  const userAgent = window.navigator.userAgent
  // 2、日志上报
  //    a、应用id和页面id
  //    b、访问时间
  //    c、ua
  // 3、调用日志上报API
}
