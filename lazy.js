(function(root, factory) {
  // 判断是否是 模块导出，还是 amd 或者是 浏览器环境使用
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    root.vueLazy = factory()
})(this, function() {
  // vue 插件 导出一个对象，对象中有一个公开方法 install
  return {
    install: function(Vue, options = {}) {
  
      // 数组 item remove 方法
      if (!Array.prototype.remove) {
        Array.prototype.remove = function(item) {
          if (!this.length) return
          let index = this.indexOf(item)
          if (index > -1) {
            this.splice(index, 1)
            return this
          }
        }
      }
  
      let init = {
        default: options.loading || 'http://ony85apla.bkt.clouddn.com/18-2-1/40324974.jpg'
      }
  
      // 需要进行监听的图片列表，还没有加载过
      let listenList = []
  
      // 已经加载过的图片缓存列表
      let imageCacheList = []
  
      // 是否已经加载过
      const isLoaded = imgSrc => {
        if (imageCacheList.indexOf(imgSrc) > -1) {
          return true
        } else {
          return false
        }
      }
  
      // 检测图片是否进入可视区域，如果是则进行加载
      const isCanShow = item => {
        let el = item.el
        let src = item.src
        let bgImage = item.bgImage
        // 图片距离页面顶部的距离
        let top = el.getBoundingClientRect().top
        // 可视区域高度
        let windowHeight = window.innerHeight
        // 设定阈值 top + 10 已经进入可视区域 10 像素
        if (top + 10 < windowHeight) {
          let image = new Image()
          image.src = src
          image.onload = function() {
            if (bgImage) {
              el.style.backgroundImage = "url("+ src +")"
            } else {
              el.src = src
            }
            imageCacheList.push(src)
            listenList.remove(item)
          }
          return true
        } else {
          return false
        }
      }
  
      // 添加监听事件 scrol, 检测是否进入可视区域
      const onListenScroll = () => {
        window.addEventListener('scroll', function() {
          let length = listenList.length
          for (let i = 0; i < length; i++) {
            isCanShow(listenList[i])
          }
        })
      }
  
      // addListener 为 vue 指令的具体实现功能函数，监听所有使用 v-lazy 指令的元素
      // el 为 dom 元素， binding 为绑定对象
      // 如 <img v-lazy="imgSrc"> el 为 img binding.value 为 imgSrc
      const addListener = (el, binding) => {
        // 绑定的图片地址
        let imgSrc = binding.value
        // 如果已经加载过，无需重新记载
        if (isLoaded(imgSrc)) {
          // 如果是 css background
          if (binding.arg === 'background-image') {
            el.style.backgroundImage = "url("+ imgSrc +")"
          } else {
            // 否则是 src
            el.src = imgSrc
          }
          return false
        }
  
        let item = {
          el: el,
          src: imgSrc,
          bgImage: binding.arg === 'background-image' ? true : false
        }
        // 图片显示默认图片
        if (binding.arg === 'background-image') {
          el.style.backgroundImage = "url("+ init.default +")"
        } else {
          // 否则是 src
          el.src = init.default
        }
        // 检测是否可以显示该图片
        if (isCanShow(item)) {
          return
        }
        // 否则将图片地址和元素均放入监听的 listenList 中
        listenList.push(item)
        // 开始监听页面 scroll 事件
        onListenScroll()
      }
  
      // vue 自定义指令
      Vue.directive('lazy', {
        // 被绑定元素插入父节点时调用
        inserted: addListener,
        // VNode 更新时调用
        updated: addListener
      })
    }
  }
})