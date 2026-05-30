const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { text, audioBase64 } = event

  if (!text && !audioBase64) {
    return { success: false, error: '请提供文本或音频数据' }
  }

  let recognizedText = text || ''

  if (audioBase64 && !text) {
    return {
      success: false,
      error: '第三方ASR未配置，请使用微信内置语音识别',
      hint: '请在前端使用 wx.createRecognizerContext() 进行语音识别'
    }
  }

  const ADD_KEYWORDS = ['添加', '新增', '安排', '定', '有', '加', '建', '创建', '设置', '记', '提醒我']
  const DELETE_KEYWORDS = ['删除', '取消', '去掉', '删掉', '移除', '不要']
  const QUERY_KEYWORDS = ['什么', '安排', '日程', '事件', '有哪些', '有没有']
  const MODIFY_KEYWORDS = ['修改', '改', '调整', '换成', '改为', '改到']

  let intent = 'add_event'
  if (DELETE_KEYWORDS.some(k => recognizedText.includes(k))) intent = 'delete_event'
  else if (MODIFY_KEYWORDS.some(k => recognizedText.includes(k))) intent = 'modify_event'
  else if (QUERY_KEYWORDS.some(k => recognizedText.includes(k)) && /今天|明天|后天|这周|下周/.test(recognizedText)) intent = 'query_event'

  return {
    success: true,
    intent: intent,
    rawText: recognizedText,
    confidence: 0.85
  }
}
