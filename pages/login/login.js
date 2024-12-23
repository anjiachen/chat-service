Page({
  data: {
    username: ''
  },

  handleLogin() {
    const { username } = this.data;
    if (!username.trim()) {
      wx.showToast({
        title: '请输入您的名字',
        icon: 'none'
      });
      return;
    }

    // 保存用户信息
    wx.setStorageSync('userInfo', {
      username: username.trim()
    });

    // 跳转到聊天页面
    wx.redirectTo({
      url: '/pages/chat/chat'
    });
  }
}); 