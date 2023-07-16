<template>
  <div id="main"></div>
</template>
<script setup lang="ts">
import * as echarts from 'echarts'

// 基于准备好的dom，初始化echarts实例

const initEchart = () => {
  const main = document.getElementById('main') as HTMLElement
  console.log(main)
  var myChart = echarts.init(main)
  // 绘制图表
  myChart.setOption({
    title: {
      text: 'ECharts 入门示例'
    },
    tooltip: {},
    xAxis: {
      data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
    },
    yAxis: {},
    series: [
      {
        name: '销量',
        type: 'bar',
        data: [5, 20, 36, 10, 10, 20]
      }
    ]
  })
}
onMounted(() => {
  initEchart()
})
</script>
<style scoped lang="scss">
#main {
  height: 700px;
}
</style>

<route lang="yaml">
meta:
  layout: default
</route>
