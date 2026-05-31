var nlp = require('./nlp')

var recorderManager = null
var isListening = false
var isProcessing = false
var isStarting = false
var lastStopTime = 0
var callbacksBound = false
var startTimeoutId = null
var forceStopping = false

var currentOnResult = null
var currentOnError = null
var currentOnStart = null
var currentOnStop = null
var currentOnRecognizing = null

var BAIDU_API_KEY = ''
var BAIDU_SECRET_KEY = ''

var MIN_RECORD_INTERVAL = 500

function setBaiduConfig(apiKey, secretKey) {
  BAIDU_API_KEY = apiKey
  BAIDU_SECRET_KEY = secretKey
}

function isSimulator() {
  try {
    var sysInfo = wx.getSystemInfoSync()
    var platform = (sysInfo.platform || '').toLowerCase()
    return platform === 'devtools'
  } catch (e) {
    return false
  }
}

function showTextInputFallback(callback) {
  wx.showModal({
    title: '语音输入',
    content: '请输入您的日程指令：',
    editable: true,
    placeholderText: '例如：明天下午3点开会',
    confirmText: '执行',
    cancelText: '取消',
    success: function (res) {
      if (res.confirm && res.content && res.content.trim()) {
        var text = res.content.trim()
        var parseResult = nlp.parse(text)
        callback && callback({
          rawText: text,
          parseResult: parseResult,
          feedbackText: nlp.generateFeedbackText(parseResult)
        })
      }
    }
  })
}

function getBaiduToken(callback) {
  wx.request({
    url: 'https://aip.baidubce.com/oauth/2.0/token',
    data: {
      grant_type: 'client_credentials',
      client_id: BAIDU_API_KEY,
      client_secret: BAIDU_SECRET_KEY
    },
    success: function (res) {
      if (res.data && res.data.access_token) {
        callback(null, res.data.access_token)
      } else {
        callback(new Error('获取百度token失败: ' + JSON.stringify(res.data)))
      }
    },
    fail: function (err) {
      callback(err)
    }
  })
}

function recognizeByBaidu(audioPath, callback) {
  var fs = wx.getFileSystemManager()
  var audioBase64 = ''
  var fileSize = 0

  try {
    var statRes = fs.statSync(audioPath)
    fileSize = statRes.size
  } catch (e) {
    console.warn('statSync失败', e)
  }

  try {
    audioBase64 = fs.readFileSync(audioPath, 'base64')
  } catch (e) {
    callback(new Error('读取音频文件失败'))
    return
  }

  if (fileSize === 0) {
    fileSize = Math.floor(audioBase64.length * 3 / 4)
  }

  console.log('百度ASR: 文件大小=' + fileSize + ', base64长度=' + audioBase64.length)

  getBaiduToken(function (err, token) {
    if (err) {
      console.error('获取token失败', err)
      callback(err)
      return
    }

    console.log('百度ASR: token获取成功')

    wx.request({
      url: 'https://vop.baidu.com/server_api',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        format: 'm4a',
        rate: 16000,
        channel: 1,
        speech: audioBase64,
        len: fileSize,
        lan: 'zh',
        cuid: 'voice-calendar-mini',
        token: token
      },
      success: function (res) {
        console.log('百度ASR响应:', JSON.stringify(res.data))
        if (res.data && res.data.err_no === 0 && res.data.result && res.data.result.length > 0) {
          callback(null, res.data.result[0])
        } else {
          var errMsg = (res.data && res.data.err_msg) || '识别失败'
          var errNo = (res.data && res.data.err_no) || 'unknown'
          console.error('百度ASR错误: err_no=' + errNo + ', err_msg=' + errMsg)
          callback(new Error(errMsg))
        }
      },
      fail: function (err) {
        console.error('百度ASR请求失败', err)
        callback(err)
      }
    })
  })
}

function clearStartTimeout() {
  if (startTimeoutId) {
    clearTimeout(startTimeoutId)
    startTimeoutId = null
  }
}

function resetAllState() {
  isListening = false
  isProcessing = false
  isStarting = false
  clearStartTimeout()
}

function bindCallbacks() {
  recorderManager.onStart(function () {
    console.log('录音开始')
    isListening = true
    isStarting = false
    clearStartTimeout()
    currentOnStart()
  })

  recorderManager.onStop(function (res) {
    console.log('录音结束, tempFilePath=' + (res.tempFilePath || 'null'))
    isListening = false
    isStarting = false
    lastStopTime = Date.now()
    currentOnStop(res)

    if (!res.tempFilePath) {
      isProcessing = false
      showTextInputFallback(function (result) {
        currentOnResult(result)
      })
      return
    }

    isProcessing = true
    currentOnRecognizing('识别中...')

    recognizeByBaidu(res.tempFilePath, function (err, text) {
      isProcessing = false
      if (err || !text) {
        console.error('语音识别失败，降级为文字输入', err)
        showTextInputFallback(function (result) {
          currentOnResult(result)
        })
        return
      }

      console.log('语音识别成功: ' + text)
      var parseResult = nlp.parse(text.trim())
      currentOnResult({
        rawText: text.trim(),
        parseResult: parseResult,
        feedbackText: nlp.generateFeedbackText(parseResult)
      })
    })
  })

  recorderManager.onError(function (err) {
    if (forceStopping) {
      var msg = (err && err.errMsg) || ''
      if (msg.indexOf('stop record fail') >= 0 || msg.indexOf('stop fail') >= 0) {
        forceStopping = false
        return
      }
    }
    console.error('录音错误', err)
    resetAllState()
    currentOnError(err)
  })

  callbacksBound = true
}

function startRecognize(options) {
  currentOnResult = options.onResult || function () {}
  currentOnError = options.onError || function () {}
  currentOnStart = options.onStart || function () {}
  currentOnStop = options.onStop || function () {}
  currentOnRecognizing = options.onRecognizing || function () {}

  if (isListening || isStarting) {
    stopRecognize()
    return
  }

  if (isProcessing) {
    return
  }

  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    showTextInputFallback(function (result) {
      currentOnResult(result)
    })
    return
  }

  wx.getSetting({
    success: function (res) {
      if (res.authSetting['scope.record'] === false) {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中开启麦克风权限',
          confirmText: '去设置',
          success: function (modalRes) {
            if (modalRes.confirm) {
              wx.openSetting()
            }
          }
        })
        currentOnError({ errMsg: '麦克风权限未授权' })
        return
      }
      doStartRecord()
    },
    fail: function () {
      doStartRecord()
    }
  })
}

function doStartRecord() {
  if (!recorderManager) {
    recorderManager = wx.getRecorderManager()
  }

  if (!callbacksBound) {
    bindCallbacks()
  }

  wx.authorize({
    scope: 'scope.record',
    complete: function () {
      beginRecording()
    }
  })
}

function beginRecording() {
  if (isListening || isProcessing || isStarting) return

  var now = Date.now()
  var elapsed = now - lastStopTime
  if (elapsed < MIN_RECORD_INTERVAL) {
    setTimeout(function () {
      beginRecording()
    }, MIN_RECORD_INTERVAL - elapsed)
    return
  }

  isStarting = true

  forceStopping = true
  try {
    recorderManager.stop()
  } catch (e) {}

  setTimeout(function () {
    forceStopping = false
    if (isProcessing || !isStarting) {
      isStarting = false
      return
    }

    try {
      recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'aac'
      })
    } catch (e) {
      console.error('录音启动异常', e)
      resetAllState()
      currentOnError({ errMsg: '录音启动失败' })
      return
    }

    startTimeoutId = setTimeout(function () {
      if (isStarting && !isListening) {
        console.error('录音启动超时，重置状态')
        resetAllState()
        currentOnError({ errMsg: '录音启动超时，请重试' })
      }
    }, 3000)
  }, 300)
}

function stopRecognize() {
  if (recorderManager && (isListening || isStarting)) {
    try {
      recorderManager.stop()
    } catch (e) {}
  }
  isStarting = false
  lastStopTime = Date.now()
}

function getIsListening() {
  return isListening || isStarting
}

module.exports = {
  startRecognize: startRecognize,
  stopRecognize: stopRecognize,
  getIsListening: getIsListening,
  isSimulator: isSimulator,
  setBaiduConfig: setBaiduConfig
}
