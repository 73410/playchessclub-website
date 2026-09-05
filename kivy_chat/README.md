快速说明

1. 设置环境变量：
   export DASHSCOPE_API_KEY="your_api_key"
   (可选) export DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1"

2. 本地运行（调试）：
   python -m pip install -r requirements.txt
   python main.py

3. 打包成 APK（在 Linux 推荐使用 Ubuntu）：
   安装 buildozer 与 Android SDK/NDK，参照 https://buildozer.readthedocs.io/
   buildozer android debug

注意事项：
- 确保 DASHSCOPE_API_KEY 有调用权限并允许目标模型（示例用 qwen3.8-max）。
- 在移动端上长文本/大响应可能需要额外的分页或流式显示支持。
