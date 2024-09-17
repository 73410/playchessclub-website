document.addEventListener('DOMContentLoaded', () => {
  // 获取HTML元素
  const chatBox = document.getElementById('chat-box');
  const messagesDiv = document.getElementById('messages');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const loadingIndicator = document.getElementById('loading');
  const dropdownBtn = document.getElementById('dropdown-btn');
  const dropdownContent = document.getElementById('model-dropdown-content');
  const clearBtn = document.getElementById('clear-btn');
  let selectedModel = 'gpt-4o';  // 默认模型

  // 初始化对话历史
  let conversation = [
    { role: 'system', content: 'You are a helpful assistant.' }
  ];

  // 初始化时隐藏加载动画
  hideLoadingIndicator();

  // 显示/隐藏模型选择下拉框
  dropdownBtn.addEventListener('click', () => {
    dropdownContent.classList.toggle('hidden');  // 切换显示/隐藏
  });

  // 选择模型
  document.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const selected = e.currentTarget.dataset.model;
      selectedModel = selected; // 更新选中的模型
      dropdownBtn.innerHTML = `${e.currentTarget.querySelector('.model-title').innerText} <span class="arrow"></span>`;
      
      // 更新激活状态
      document.querySelectorAll('.model-option').forEach(opt => {
        opt.classList.remove('active');
      });
      e.currentTarget.classList.add('active');
      
      dropdownContent.classList.add('hidden'); // 选择后隐藏下拉框
    });
  });

  // 清除会话按钮点击事件
  clearBtn.addEventListener('click', () => {
    // 重置对话历史
    conversation = [
      { role: 'system', content: 'You are a helpful assistant.' }
    ];
    // 清空聊天窗口
    messagesDiv.innerHTML = '';
  });

  // 发送消息到后端，并接收AI的回复
  async function sendMessage(modelChoice) {
    showLoadingIndicator();  // 发送消息时显示加载动画
    try {
      const response = await fetch('https://openai.mcpcc.fun/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation, modelChoice })  // 发送对话历史
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`服务器错误: ${errorData.error}`);
      }

      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error('发送消息时发生错误:', error);
      // 在聊天窗口显示错误信息
      addMessage('bot', `错误：${error.message}`);
      return null;
    } finally {
      hideLoadingIndicator();  // 确保在请求完成后隐藏加载动画
    }
  }

  // 显示等待动画
  function showLoadingIndicator() {
    loadingIndicator.classList.remove('hidden');
  }

  // 隐藏等待动画
  function hideLoadingIndicator() {
    loadingIndicator.classList.add('hidden');
  }

  // 在页面上显示消息并更新对话历史
  function addMessage(sender, message) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = message;
    messagesDiv.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;  // 滚动到底部

    // 更新对话历史
    const role = sender === 'user' ? 'user' : 'assistant';
    conversation.push({ role: role, content: message });

    // 控制对话历史长度，保留最近的 20 条消息
    if (conversation.length > 20) {
      conversation.splice(1, conversation.length - 20); // 保留系统消息和最近的 19 条对话
    }
  }

  // 处理发送按钮点击事件
  sendBtn.addEventListener('click', async () => {
    const message = userInput.value.trim();

    if (message) {
      addMessage('user', message);  // 显示用户消息并更新对话历史
      userInput.value = '';  // 清空输入框

      // 获取AI回复并显示
      const aiResponse = await sendMessage(selectedModel);
      if (aiResponse) {
        addMessage('bot', aiResponse);  // 显示AI回复并更新对话历史

        // 如果切换了模型，通知用户
        if (aiResponse.includes("gpt-4o-mini")) {
          addMessage('bot', "注意：由于 gpt-4o 速率限制，模型已切换到 gpt-4o-mini。");
        }
      }
    }
  });

  // 处理回车键发送消息
  userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendBtn.click();
    }
  });
});
