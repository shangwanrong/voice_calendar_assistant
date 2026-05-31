var config = require('./config')

var currentAudio = null

function getToken(callback) {
  wx.request({
    url: 'https://aip.baidubce.com/oauth/2.0/token',
    data: {
      grant_type: 'client_credentials',
      client_id: config.BAIDU_API_KEY,
      client_secret: config.BAIDU_SECRET_KEY
    },
    success: function (res) {
      if (res.data && res.data.access_token) {
        callback(null, res.data.access_token)
      } else {
        callback(new Error('获取TTS token失败'))
      }
    },
    fail: function (err) {
      callback(err)
    }
  })
}

function speak(text) {
  if (!text || !text.trim()) return

  var app = getApp()
  if (app.globalData && app.globalData.settings && app.globalData.settings.voiceFeedback === false) return

  stop()

  getToken(function (err, token) {
    if (err) {
      console.error('TTS: 获取token失败', err)
      return
    }

    console.log('TTS: 开始合成语音, text=' + text)

    wx.request({
      url: 'https://tsn.baidu.com/text2audio',
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'tex=' + encodeURIComponent(text) +
        '&tok=' + token +
        '&cuid=voice-calendar-tts' +
        '&ctp=1' +
        '&lan=zh' +
        '&spd=6' +
        '&pit=5' +
        '&vol=6' +
        '&per=0' +
        '&aue=3',
      responseType: 'arraybuffer',
      success: function (res) {
        var contentType = (res.header && res.header['Content-Type']) || (res.header && res.header['content-type']) || ''
        console.log('TTS: 响应 contentType=' + contentType + ', dataLen=' + (res.data ? res.data.byteLength : 0))

        if (contentType.indexOf('audio') >= 0 && res.data && res.data.byteLength > 0) {
          var fs = wx.getFileSystemManager()
          var filePath = wx.env.USER_DATA_PATH + '/tts_' + Date.now() + '.mp3'

          try {
            fs.writeFileSync(filePath, res.data, 'binary')
            console.log('TTS: 文件已保存, path=' + filePath)
            playAudio(filePath)
          } catch (e) {
            console.error('TTS: 保存文件失败', e)
          }
        } else {
          var errMsg = ''
          if (typeof res.data === 'string') {
            errMsg = res.data.substring(0, 200)
          } else {
            try {
              var decoder = new TextDecoder('utf-8')
              errMsg = decoder.decode(new Uint8Array(res.data)).substring(0, 200)
            } catch (e2) {
              errMsg = 'binary data, len=' + (res.data ? res.data.byteLength : 0)
            }
          }
          console.error('TTS: 合成失败, response=' + errMsg)
        }
      },
      fail: function (err) {
        console.error('TTS: 请求失败', err)
      }
    })
  })
}

function playAudio(filePath) {
  currentAudio = wx.createInnerAudioContext()

  currentAudio.onEnded(function () {
    console.log('TTS: 播放结束')
    destroyAudio()
    cleanTempFile(filePath)
  })

  currentAudio.onError(function (err) {
    console.error('TTS播放错误', err)
    destroyAudio()
    cleanTempFile(filePath)
  })

  currentAudio.src = filePath
  currentAudio.play()
  console.log('TTS: 开始播放')
}

function cleanTempFile(filePath) {
  try {
    var fs = wx.getFileSystemManager()
    fs.unlinkSync(filePath)
  } catch (e) {}
}

function stop() {
  if (currentAudio) {
    try {
      currentAudio.stop()
    } catch (e) {}
    destroyAudio()
  }
}

function destroyAudio() {
  if (currentAudio) {
    try {
      currentAudio.destroy()
    } catch (e) {}
    currentAudio = null
  }
}

module.exports = {
  speak: speak,
  stop: stop
}
