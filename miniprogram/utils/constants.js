var CATEGORIES = {
  work: { label: '工作', color: '#4A90D9' },
  life: { label: '生活', color: '#27AE60' },
  study: { label: '学习', color: '#F39C12' },
  health: { label: '健康', color: '#E74C3C' },
  other: { label: '其他', color: '#95A5A6' }
}

var REMINDER_OPTIONS = [
  { value: 0, label: '不提醒' },
  { value: 5, label: '5分钟前' },
  { value: 10, label: '10分钟前' },
  { value: 15, label: '15分钟前' },
  { value: 30, label: '30分钟前' },
  { value: 60, label: '1小时前' },
  { value: 1440, label: '1天前' }
]

var WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']

var INTENT_TYPES = {
  ADD_EVENT: 'add_event',
  DELETE_EVENT: 'delete_event',
  QUERY_EVENT: 'query_event',
  MODIFY_EVENT: 'modify_event',
  SET_REMINDER: 'set_reminder',
  UNKNOWN: 'unknown'
}

var CATEGORY_KEYWORDS = {
  work: ['会议', '开会', '汇报', '加班', '出差', '项目', '评审', '面试', '培训', '工作', '上班', '打卡', '报告'],
  life: ['买菜', '做饭', '接孩子', '送孩子', '聚餐', '约会', '购物', '理发', '缴费', '快递', '搬家'],
  study: ['上课', '考试', '复习', '预习', '作业', '读书', '学习', '讲座', '网课'],
  health: ['体检', '看病', '吃药', '运动', '健身', '跑步', '瑜伽', '医院', '复诊', '挂号']
}

module.exports = {
  CATEGORIES: CATEGORIES,
  REMINDER_OPTIONS: REMINDER_OPTIONS,
  WEEK_DAYS: WEEK_DAYS,
  INTENT_TYPES: INTENT_TYPES,
  CATEGORY_KEYWORDS: CATEGORY_KEYWORDS
}
