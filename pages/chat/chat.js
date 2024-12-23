const API_URL = 'https://towa.fofinvesting.com/api/v1/chat/completions';
const API_KEY = 'towa-sgOYVAahErbbgaUZ6qGBo6jnhNrpQuX4EtqkmLV4zZuyMVecOK6W';

Page({
  data: {
    messages: [],
    inputMessage: '',
    scrollToMessage: '',
    chatId: Date.now().toString() // 生成唯一的会话ID
  },

  onLoad() {
    // 添加欢迎消息
    this.addMessage({
      type: 'bot',
      content: '你好！我是智能客服助手，很高兴为您服务！有什么我可以帮您的吗？'
    });
  },

  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },

  async sendMessage() {
    const { inputMessage, chatId } = this.data;
    if (!inputMessage.trim()) return;

    // 添加用户消息
    this.addMessage({
      type: 'user',
      content: inputMessage
    });

    // 清空输入框
    this.setData({ inputMessage: '' });

    try {
      // 显示加载状态
      wx.showLoading({
        title: '正在思考...',
        mask: true
      });

      // 调用客服机器人API
      const response = await this.callBotAPI(inputMessage);
      
      // 隐藏加载状态
      wx.hideLoading();

      // 添加机器人回复
      if (response && response.choices && response.choices[0] && response.choices[0].message) {
        this.addMessage({
          type: 'bot',
          content: response.choices[0].message.content
        });
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    }
  },

  addMessage(messageData) {
    const message = {
      id: Date.now(),
      time: this.formatTime(new Date()),
      ...messageData
    };

    const messages = [...this.data.messages, message];
    this.setData({
      messages,
      scrollToMessage: `msg-${message.id}`
    });
  },

  formatTime(date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    return `${this.padZero(hour)}:${this.padZero(minute)}`;
  },

  padZero(num) {
    return num < 10 ? `0${num}` : num;
  },

  async callBotAPI(message) {
    try {
      const response = await wx.request({
        url: API_URL,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          chatId: this.data.chatId,
          stream: false,
          detail: false,
          messages: [
            {
              content: message,
              role: 'user'
            }
          ],
          variables: {}
        },
        timeout: 30000 // 30秒超时
      });

      if (response.statusCode === 200) {
        return response.data;
      } else {
        throw new Error(`API request failed with status ${response.statusCode}`);
      }
    } catch (error) {
      console.error('API调用失败:', error);
      throw error;
    }
  }
}); 