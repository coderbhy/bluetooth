// pages/home/childCpns/control-list/control-list.js
const app = getApp();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    connectStatus: {
      type: Boolean
    },
    currentTemp: {
      type: Number
    },
    currentHumi: {
      type: Number
    },
    minTemp: {
      type: Number
    },
    maxTemp: {
      type: Number
    },
    minHumi: {
      type: Number
    },
    maxHumi: {
      type: Number
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    emitEvent(event) {
      // console.log(event);
      const statusCode = event.target.dataset.statusCode
      this.triggerEvent('emitEvent', {
        statusCode
      })
    }
  }
})
