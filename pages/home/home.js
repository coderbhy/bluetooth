// pages/home/home.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    connectStatus: false,
    deviceId: '',
    mtu: 22, // 22~512
    readServiceId: '',
    writeServiceId: '',
    notifyServiceId: '',
    indicateServiceId: '',

    currentTemp: 25,
    currentHumi: 58,
    minTemp: 23,
    maxTemp: 25,
    minHumi: 50,
    maxHumi: 70,

    recvStr: ''
  },

  connect() {
    const self = this;
    this
      .initBluetoothAdapter()
      .then(res => {
        console.log(res);
        return self.searchBluetooth();
      })
      .then(res => {
        return self.getAllBluetoothInfo();
      })
      .then(res => {
        // 蓝牙列表
        console.log(res);
        // 获取到设备 deviceId
        const deviceList = res.devices;
        let targetDevice = {};
        if (deviceList.length !== 0) {
          targetDevice = deviceList.find(item => {
            return (item.name === 'ZLzhihuiwenshi' || item.localName === 'ZLzhihuiwenshi')
          })
        }
        const deviceId = targetDevice.deviceId;
        self.setData({
          deviceId
        })
        return self.connectBluetooth(deviceId);
      })
      .then(res => {
        // 停止搜寻附近的蓝牙外围设备
        wx.stopBluetoothDevicesDiscovery();
        self.setData({
          connectStatus: true
        })
      })
      .then(res => {
        const deviceId = self.data.deviceId;
        return self.getBLEMTU(deviceId);
      })
      .then(res => {
        const mtu = res.mtu;
        console.log(mtu);
        const deviceId = self.data.deviceId;
        self.setData({
          mtu
        })
        return self.getServiceId(deviceId);
      })
      .then(res => {
        console.log(res);
        const deviceId = self.data.deviceId; 
        const readServiceId = res.services[0].uuid;
        const writeServiceId = res.services[1].uuid;
        const notifyServiceId = res.services[1].uuid;
        const indicateServiceId = res.services[3].uuid;
        self.setData({
          readServiceId,
          writeServiceId,
          notifyServiceId,
          indicateServiceId
        })
        // return self.getCharacteId(deviceId, notifyServiceId);
        return self.getCharacteId(deviceId, writeServiceId);
      })
      .then(res => {
        const list = res.characteristics;
        console.log(list);
        if (list.length !== 0) {
          list.forEach(item => {
            // 接收数据
            if (item.properties.notify) {
              wx.notifyBLECharacteristicValueChange({
                deviceId: this.data.deviceId,
                serviceId: this.data.notifyServiceId,
                characteristicId: item.uuid,
                state: true,
                success(res) {
                  console.log(res);
                  wx.onBLECharacteristicValueChange((result) => {
                    const fetchStr = self.ab2str(result.value)
                    console.log(fetchStr);
                    let recvStr = self.data.recvStr;
                    if (fetchStr.startsWith("TT")) {
                      recvStr = '';
                    }
                    recvStr += fetchStr;
                    self.setData({
                      recvStr
                    })
                    console.log(recvStr);
                    console.log(recvStr.length);
                    if (recvStr.length === 14) {
                      const currentTemp = recvStr.slice(2, 4);
                      const currentHumi = recvStr.slice(4, 6);
                      const maxTemp = recvStr.slice(6, 8);
                      const minTemp = recvStr.slice(8, 10);
                      const maxHumi = recvStr.slice(10, 12);
                      const minHumi = recvStr.slice(12, 14);
                      console.log(currentTemp, currentHumi, minTemp, maxTemp, minHumi, maxHumi);
                      self.setData({
                        currentTemp,
                        currentHumi,
                        minTemp,
                        maxTemp,
                        minHumi,
                        maxHumi
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })
  },
  disconnect() {
    const deviceId = this.data.deviceId;
    const self = this;
    wx.closeBLEConnection({
      deviceId,
      success(res) {
        console.log('蓝牙连接已断开');
        wx.closeBluetoothAdapter({
          success(res) {
            console.log('蓝牙模块已关闭');
            self.setData({
              connectStatus: false
            })
          }
        })
      }
    })
  },

  ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  },
  ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
  string2buffer(str) {
    let val = ""
    if (!str) return;
    let length = str.length;
    let index = 0;
    let array = []
    while (index < length) {
      array.push(str.substring(index, index + 2));
      index = index + 2;
    }
    val = array.join(",");
    // 将16进制转化为ArrayBuffer
    return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16)
    })).buffer
  },
  str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 每个字符占用2个字节
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
  },

  // 1. 初始化蓝牙适配器
  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: (res) => {
          resolve(res);
        },
        fail: (err) => {
          wx.showToast({
            title: '请您打开蓝牙或检查微信是否授权蓝牙',
            icon: 'none'
          })
        }
      })
    })
  },
  // 2. 开始搜索周边蓝牙设备
  searchBluetooth() {
    return new Promise((resolve, reject) => {
      wx.startBluetoothDevicesDiscovery({
        interval: 1000,
        powerLevel: 'high',
        success: (res) => {
          wx.showLoading({
            title: '正在搜索周边蓝牙',
            mask: true
          })
          resolve(res);
        }
      })
    })
  },
  // 3. 获取搜索到的蓝牙设备信息
  getAllBluetoothInfo() {
    return new Promise((resolve, reject) => {
      wx.getBluetoothDevices({
        success: (res) => {
          resolve(res);
        },
        fail: (err) => { 
          wx.showToast({
            title: '蓝牙搜索失败',
            icon: 'none'
          })
        },
        complete() {
          wx.hideLoading({});
        }
      })
    })
  },
  // 4. 连接设备
  connectBluetooth(deviceId) {
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        success: (res) => {
          wx.showToast({
            title: '蓝牙连接成功',
            icon: 'none'
          })
          resolve(res);
        },
        fail: (err) => {
          wx.showToast({
            title: '蓝牙连接失败',
            icon: 'none'
          })
        }
      })
    })
  },
  // 5. 获取蓝牙低功耗的最大传输单元
  getBLEMTU(deviceId) {
    return new Promise((resolve) => {
      wx.getBLEMTU({
        deviceId,
        success(res) {
          resolve(res);
        }
      })
    })
  },
  // 修改最大传输单元
  setBLEMTU(deviceId) {
    return new Promise((resolve) => {
      wx.setBLEMTU({
        deviceId,
        mtu: 512,
        success(res) {
          resolve(res);
        }
      })
    })
  },
  // 6. 获取蓝牙设备服务的 uuid
  getServiceId(deviceId) {
    return new Promise(resolve => {
      wx.getBLEDeviceServices({
        deviceId,
        success(res) {
          resolve(res);
        }
      })
    })
  },
  // 7. 查看蓝牙某个服务中所有特征
  getCharacteId(deviceId, uuid) {
    return new Promise(resolve => {
      wx.getBLEDeviceCharacteristics({
        deviceId,
        serviceId: uuid,
        success(res) {
          resolve(res);
        },
        fail(err) {
          console.log('出错了');
        }
      })
    })
  },

  handleCode(event) {
    const code = event.detail.statusCode;
    const deviceId = this.data.deviceId;
    const writeServiceId = this.data.writeServiceId;
    console.log(deviceId, writeServiceId);
    const self = this;
    this
      .getCharacteId(deviceId, writeServiceId)
      .then(res => {
        const list = res.characteristics;
        if (list.length !== 0) {
          list.forEach(item => {
            if (item.properties.write == true) {
              const value1 = self.string2buffer(code);
              // const value2 = self.str2ab(code);
              console.log(value1);
              //指令写入到蓝牙设备
              wx.writeBLECharacteristicValue({
                deviceId: self.data.deviceId,
                serviceId: self.data.writeServiceId,
                characteristicId: item.uuid,
                value: value1,
                success(res) {
                  console.log(res)
                },
                fail(res) {
                  console.log(res)
                }
              })
            }
          })
        }
      })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})