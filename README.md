
> 参考: [vue 官方文档 自定义指令部分](https://cn.vuejs.org/v2/guide/custom-directive.html)

## 一、思路

> **将页面中所有img的src属性用data-src代替（可以自定义），当页面滚动到该图片出现在可视区域时，用js取data-src属性赋给src**

<!-- more -->

## 二、各种宽高

#### 1.网页可见区域宽高

- 低版本混杂模式 document.body.**clientWidth/clientHeight**
- 标准版本和ie低版本标准模式 document.documentElement.**clientWidth/clientHeight** 
- **标准浏览器和ie9+ window.innerWdith/innerHeidht**
- **jquery方法  $(window).width()/height()**

#### 2.网页可见区域宽高（包含边框）

- 兼容混杂模式  document.body.**offsetWidth/offsetHeight**
- 兼容ie低版本标准模式 document.documentElement.**offsetWidth/offsetHeight**

#### 3.网页正文全文宽高（包含滚动部分）

- 兼容混杂模式  document.body.scrollWidth/scrollHeight
- 兼容ie低版本标准模式 document.documentElement.scrollWidth/scrollHeight

#### 4.网页被卷去的高/左

- 兼容混杂模式  document.body.**scrollTop/scrollLeft**
- 兼容ie低版本标准模式 document.documentElement.**scrollTop/scrollLeft** 
- **标准浏览器和ie9+ window.pageYoffset/pageXoffset**
- **jquery方法  $(window).scrollTop()/scrollLeft()**

屏幕正文部分上 window.screenTop
屏幕正文部分左 window.screenLeft
屏幕分辨率的高 window.screen.height
屏幕分辨率的宽 window.screen.width

#### 5.元素

- clientWidth/Height 元素可见内容区宽高
- offsetWidth/Height 元素可见内容区（包含边框）宽高
- scrollWidth/Height 元素实际内容区（包含滚动部分）宽高

#### 6.获取元素尺寸 （左边是jquery方法，右边是原生方法）

- $(el).width() 等同   el.style.width
- $(el).innerWidth()  等同 el.style.width + el.style.padding
- $(el).outWidth() 等同 el.offsetWidth = el.style.width + el.style.padding + el.style.border
- $(el).outWidth(true) 等同 el.style.width + el.style.padding + el.style.border + el.style.margin

**原生 el.getBoundingClientRect().top/left/bottom/right 元素距离视口上左下右的距离**
**jquery $(el).offset().top/left 元素距离视口上左距离**

## 三、算法

1.将含有data-src属性的dom存进数组

2.监听scroll事件，在回调中开启定时器， 遍历数组

3.当数组中元素的**getBoundingClientRect().top 小于 网页可见区域和滚动距离之和（进入屏幕可见区域）
    取出该元素data-src属性的值赋给元素的src， 并将该元素从数组中删除**

## 四、vue-lazy 图片懒加载插件实现

指令 v-lazy

```html
// 使用 img 标签
<img v-lazy="imgSrc">

// 使用 css background-image
<div v-lazy:background-image="imgSrc"></div>
```

插件的整体代码

```javascript
// vue 插件需要包含一个 install 方法，传入 Vue， 并在函数中绑定指令
export default {
	install: function(Vue, options = {}) {
		var init = {
			default: options.loading || 'http://ony85apla.bkt.clouddn.com/18-2-1/40324974.jpg'
		}
		// addListener 为 vue 指令的具体实现功能函数，监听所有使用 v-lazy 指令的元素
		// el 为 dom 元素， binding 为绑定对象
		// 如 <img v-lazy="imgSrc"> el 为 img binding.value 为 imgSrc
		const addListener = (el, binding) => {
			// ...
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
```

对于功能函数 addListener 的实现，具体思路如下：

- 图片是否需要懒加载，分两种情况，一是图片没有到达可视区域，二是图片已经加载过了

- 监听窗口的 scroll 事件，判断哪些图片可以懒加载了

因此需要一个监听懒加载的图片列表和一个需要记录已经加载过的图片列表。同时封装一个数组的 remove 方法方便操作数据

```javascript
// vue 插件需要包含一个 install 方法，传入 Vue， 并在函数中绑定指令
// 用一个立即执行函数传入 定义的插件，判断不同的环境
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
```

## 补充

#### vue 自定义指令

vue 允许注册自定义指令。除了 vue 提供的内置指令外，有的情况下人需要对普通的 dom 元素进行底层操作，这是会需要用到自定义指令

```javascript
// 注册一个全局自定义指令， 'v-focus'
Vue.directive('focus', {
	// 当被绑定元素插入到 dom 中
	inserted: function(el) {
		// 聚焦元素
		el.focus()
	}
})

// 注册局部指令，组件中也接受一个 derectives 选项
export default {
	// mixins: []
	// data computed watch methods ...
	// beforeCreate created beforeMount mounted ...
	directives: {
		// 使用对象形式
		focus: {
			// 指令的定义
			inserted: function(el) {
				el.focus()
			}
		}
	}
}

// 在模板的任何元素上使用 v-focus 属性
```

#### 钩子函数

一个指令定义对象可以提供给几个钩子函数（可选）：

- **bind:** 只调用一次，指令第一次绑定到元素时调用，在这里可以进行一次性的初始化设置

- **inserted:** 被绑定元素插入父节点时调用（父节点存在即可调用，不一定存在于 document 中）

- **update:** 所在组件的 VNode 更新时调用，**但是可能发生在 VNode 更新之前。不论指令的值是否变化**。但是可以通过比较更新前后的值来忽略不必要的模板更新

- **componentUpdated: 指令所在组件的 VNode 以及子 VNode 全部更新后调用**。可以理解为被绑定元素所在模板完成一次更新时调用

- **unbind:** 只调用一次，指令和元素解绑时候调用

#### 钩子函数参数

指令钩子函数会被传入如下参数：

- **el:** 指令所绑定的元素，能直接操作 dom

- **binding:** 一个对象，包含如下属性

	- **name:** 指令名，不包含 v- 前缀

	- **value:** 指令的绑定值，如 v-my-directive='2'，绑定值为2

	- **oldValue:** 指令绑定的前一个值，仅仅在 update 和 componentUpdated 钩子中可用。无论值是否改变都可用
	
	- **expression:** 字符串形式的指令表达式，如 v-my-directive='1 + 1'，表达式为 '1 + 1'
	- **arg:** 传递给指令的参数，可选。如 v-my-directive:foo，参数为 'foo'
	- **modifiers:** 一个包含修饰符的对象。如 v-my-directive.foo.bar，修饰符对象为 { foo: true, bar: true }

- **vnode:** vue 编译生成的虚拟节点

- **oldVnode:** 上一个虚拟节点，仅在 update 和 componentUpdated 钩子中使用

上述参数中除了 el 之外，其他参数都应该是只读的，切勿进行修改

#### 对象字面量

如果指令需要多个值，可以传一个 js 对象字面量

```javascript
<div v-demo="{ color: 'white', text: 'hello!' }"></div>
```