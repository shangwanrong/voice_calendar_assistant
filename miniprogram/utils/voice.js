var nlp = require('./nlp')
var INTENT_TYPES = require('./constants').INTENT_TYPES

var recognizerContext = null
var isListening = false

function createRecognizer() {
  if (typeof wx.createRecognizerContext === 'function') {
    recognizerContext = wx.createRecognizerContext()
  }
  return recognizerContext
}

function checkRecordAuth(callback) {
  wx.getSetting({
    success: function (res) {
      if (res.authSetting['scope.record'] === false) {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中开启麦克风权限，以便使用语音功能',
          confirmText: '去设置',
          success: function (modalRes) {
            if (modalRes.confirm) {
              wx.openSetting()
            }
          }
        })
        callback && callback(false)
      } else {
        wx.authorize({
          scope: 'scope.record',
          success: function () {
            callback && callback(true)
          },
          fail: function () {
            callback && callback(false)
          }
        })
      }
    }
  })
}

function startRecognize(options) {
  var onResult = options.onResult || function () {}
  var onError = options.onError || function () {}
  var onStart = options.onStart || function () {}
  var onStop = options.onStop || function () {}
  var onRecognizing = options.onRecognizing || function () {}

  if (isListening) {
    stopRecognize()
    return
  }

  checkRecordAuth(function (authed) {
    if (!authed) {
      onError({ errMsg: '麦克风权限未授权' })
      return
    }

    if (!recognizerContext) {
      createRecognizer()
    }

    if (!recognizerContext) {
      onError({ errMsg: '当前微信版本不支持语音识别，请升级微信' })
      return
    }

    recognizerContext.onRecognize(function (res) {
      var result = res.result
      if (result) {
        onRecognizing(result)
      }
    })

    recognizerContext.onStop(function (res) {
      isListening = false
      var result = res.result
      if (result) {
        var parseResult = nlp.parse(result)
        onResult({
          rawText: result,
          parseResult: parseResult,
          feedbackText: nlp.generateFeedbackText(parseResult)
        })
      }
      onStop(res)
    })

    recognizerContext.onError(function (err) {
      isListening = false
      onError(err)
    })

    recognizerContext.start({
      lang: 'zh_CN',
      continuous: true
    })

    isListening = true
    onStart()
  })
}

function stopRecognize() {
  if (recognizerContext && isListening) {
    recognizerContext.stop()
    isListening = false
  }
}

function getIsListening() {
  return isListening
}

module.exports = {
  createRecognizer: createRecognizer,
  checkRecordAuth: checkRecordAuth,
  startRecognize: startRecognize,
  stopRecognize: stopRecognize,
  getIsListening: getIsListening
}
