# 前端监控平台

```sh
# git合并提交记录
git rebase i HEAD~3
```

```js
// 监控元素是否可见
const observer = new IntersectionObserver((e) => {
  console.log(e[0].target, e[0].intersectionRatio) // 可见范围
}, {})
observer.observe(document.getElementById('app'))
```
