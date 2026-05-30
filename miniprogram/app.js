App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true
      })
    }
    this.globalData = {
      userInfo: null,
      settings: {
        defaultReminder: 15,
        voiceFeedback: true
      }
    }
    this.loadSettings()
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
