// 获取HTML元素
const chatBox = document.getElementById('chat-box');
const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// 发送消息到后端，并接收AI的回复
async function sendMessage(message) {
  try {
    const response = await fetch('https://openai.mcpcc.fun/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })  // 发送用户的消息
    });

    // 检查响应是否成功
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error('Error occurred while sending message:', error.message);
    return 'There was an error with the server. Please try again later.';
  }
}

// 在页面上显示消息
function addMessage(sender, message) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = message;
  messagesDiv.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;  // 滚动到底部
}

// 处理发送按钮点击事件
sendBtn.addEventListener('click', async () => {
  const message = userInput.value.trim();
  
  if (message) {
    addMessage('user', message);  // 显示用户消息
    userInput.value = '';  // 清空输入框
    
    // 获取AI回复并显示
    const aiResponse = await sendMessage(message);
    addMessage('bot', aiResponse);
  }
});

// 处理回车键发送消息
userInput.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    sendBtn.click();
  }
});
