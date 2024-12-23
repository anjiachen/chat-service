// API配置
const CHAT_API_URL = 'https://towa.fofinvesting.com/api/v1/chat/completions';
const CHAT_API_KEY = 'towa-sgOYVAahErbbgaUZ6qGBo6jnhNrpQuX4EtqkmLV4zZuyMVecOK6W';
const REPORT_API_KEY = 'towa-j2eLAftGzQ03Gaxl0oFxXgdbc6IXaUPjFi2UCyLp23kLohSOmXCh';

// DOM元素
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const chatMessages = document.getElementById('chatMessages');
const generateReportBtn = document.getElementById('generateReportBtn');
const reportContainer = document.getElementById('reportContainer');

// 生成唯一的会话ID
const chatId = Date.now().toString();

// 存储所有对话记录
let chatHistory = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 添加欢迎消息
    addMessage({
        type: 'bot',
        content: 'hi，我们是达人经纪公司，有个非常好的商单机会想了解下吗？'
    });

    // 监听输入框变化
    messageInput.addEventListener('input', () => {
        sendButton.disabled = !messageInput.value.trim();
    });

    // 监听发送按钮点击
    sendButton.addEventListener('click', sendMessage);

    // 监听输入框回车键
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 监听生成报告按钮点击
    generateReportBtn.addEventListener('click', generateReport);
});

// 发送消息
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // 添加用户消息
    addMessage({
        type: 'user',
        content: message
    });

    // 清空输入框
    messageInput.value = '';
    sendButton.disabled = true;

    // 显示加载动画
    showTypingIndicator();

    try {
        // 调用API
        const response = await callBotAPI(message);
        
        // 移除加载动画
        hideTypingIndicator();

        // 添加机器人回复
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
            addMessage({
                type: 'bot',
                content: response.choices[0].message.content
            });
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        hideTypingIndicator();
        showError('发送失败，请重试');
    }
}

// 格式化消息内容，处理特殊标记
function formatMessage(content) {
    // 处理加粗标记 **text**
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理标题标记 ###
    content = content.replace(/###(.*?)(?:\n|$)/g, '<h3>$1</h3>');
    
    // 处理换行
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// 添加消息到界面
function addMessage({ type, content }) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit'
    });

    const avatar = type === 'user' ? '👤' : '🤖';
    
    // 格式化消息内容
    const formattedContent = type === 'bot' ? formatMessage(content) : content;

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${formattedContent}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    // 保存��聊天历史（保存原始内容）
    chatHistory.push({
        type,
        content,
        time
    });
}

// 调用API
async function callBotAPI(message) {
    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CHAT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: chatId,
                stream: false,
                detail: false,
                messages: [
                    {
                        content: message,
                        role: 'user'
                    }
                ],
                variables: {}
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 生成报告
async function generateReport() {
    if (chatHistory.length === 0) {
        showError('暂无对话记录');
        return;
    }

    // 禁用按钮并显示loading状态
    generateReportBtn.disabled = true;
    generateReportBtn.classList.add('loading');

    // 构建对话记录文本
    const conversationText = chatHistory.map(msg => 
        `${msg.type === 'user' ? '用户' : '经纪人'}：${msg.content}`
    ).join('\n');

    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REPORT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: chatId,
                stream: false,
                detail: false,
                messages: [
                    {
                        content: conversationText,
                        role: 'user'
                    }
                ],
                variables: {}
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        
        if (result.choices && result.choices[0] && result.choices[0].message) {
            // 显示报告
            showReport(result.choices[0].message.content);
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('生成报告失败:', error);
        showError('生成报告失败，请重试');
    } finally {
        // 移除loading状态并启用按钮
        generateReportBtn.disabled = false;
        generateReportBtn.classList.remove('loading');
    }
}

// 显示报告
function showReport(content) {
    const reportDiv = document.createElement('div');
    reportDiv.className = 'report-message';
    
    const time = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit'
    });

    // 使用相同的格式化函数处理报告内容
    const formattedContent = formatMessage(content);

    reportDiv.innerHTML = `
        <h3>沟通报告 (${time})</h3>
        <div class="report-content">${formattedContent}</div>
    `;

    // 清空之前的报告
    reportContainer.innerHTML = '';
    reportContainer.appendChild(reportDiv);
    reportContainer.scrollTop = reportContainer.scrollHeight;
}

// 显示加载动画
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

// 隐藏加载动画
function hideTypingIndicator() {
    const typingIndicator = messagesContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 显示错误提示
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message system';
    errorDiv.innerHTML = `
        <div class="message-content error">
            <div class="message-text">${message}</div>
        </div>
    `;
    messagesContainer.appendChild(errorDiv);
    scrollToBottom();

    // 3秒后移除错误提示
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
} 