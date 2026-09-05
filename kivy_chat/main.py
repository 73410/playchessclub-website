import os
import threading
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.clock import mainthread

from ai_client import send_prompt

class ChatUI(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(orientation='vertical', spacing=6, padding=6, **kwargs)

        self.scroll = ScrollView(size_hint=(1, 1))
        self.chat_label = Label(size_hint_y=None, markup=True)
        self.chat_label.bind(texture_size=self._update_label_height)
        self.scroll.add_widget(self.chat_label)

        self.input_box = TextInput(size_hint_y=None, height=40, multiline=False)
        self.send_btn = Button(text='发送', size_hint_y=None, height=40)
        self.send_btn.bind(on_release=self.on_send)

        bottom = BoxLayout(size_hint_y=None, height=40)
        bottom.add_widget(self.input_box)
        bottom.add_widget(self.send_btn)

        self.add_widget(self.scroll)
        self.add_widget(bottom)

        self._append_text("[b]系统[/b]: 连接就绪，输入你的问题。\n")

    def _update_label_height(self, instance, value):
        self.chat_label.height = self.chat_label.texture_size[1]
        # scroll到底
        self.scroll.scroll_y = 0

    @mainthread
    def _append_text(self, text):
        self.chat_label.text += text

    def on_send(self, *args):
        prompt = self.input_box.text.strip()
        if not prompt:
            return
        # 显示用户消息
        self._append_text(f"[b]我[/b]: {prompt}\n")
        self.input_box.text = ""
        self._append_text("[i]等待响应...\n[/i]")

        # 后台发送请求
        threading.Thread(target=self._background_send, args=(prompt,), daemon=True).start()

    def _background_send(self, prompt):
        try:
            answer, reasoning = send_prompt(prompt)
            # 更新 UI
            self._append_text("[i]响应接收完毕。\n[/i]")
            if answer:
                self._append_text(f"[b]机器人[/b]: {answer}\n")
            if reasoning:
                self._append_text("[b]【推理过程】[/b]\n")
                for r in reasoning:
                    self._append_text(r + "\n")
        except Exception as e:
            self._append_text(f"[b]错误[/b]: {e}\n")

class ChatApp(App):
    def build(self):
        return ChatUI()

if __name__ == '__main__':
    ChatApp().run()
