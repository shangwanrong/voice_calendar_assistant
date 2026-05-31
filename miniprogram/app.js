App({
  onLaunch: function () {
    this.globalData = {
      userInfo: null,
      settings: {
        defaultReminder: 15,
        voiceFeedback: true
      }
    }
    this.loadSettings()
    this.initVoice()
  },

  initVoice: function () {
    var config = require('./utils/config')
    var voice = require('./utils/voice')
    if (config.BAIDU_API_KEY && config.BAIDU_SECRET_KEY) {
      voice.setBaiduConfig(config.BAIDU_API_KEY, config.BAIDU_SECRET_KEY)
    }
  },

  loadSettings: function () {
    try {
      var settings = wx.getStorageSync('calendar_settings')
      if (settings) {
        this.globalData.settings = Object.assign(this.globalData.settings, settings)
      }
    } catch (e) {
      console.error('读取设置失败', e)
    }
  },

  saveSettings: function (settings) {
    this.globalData.settings = Object.assign(this.globalData.settings, settings)
    try {
      wx.setStorageSync('calendar_settings', this.globalData.settings)
    } catch (e) {
      console.error('保存设置失败', e)
    }
  }
})
