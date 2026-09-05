import os
from openai import OpenAI

API_KEY = os.getenv("DASHSCOPE_API_KEY")
BASE_URL = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1")

client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
)


def send_prompt(prompt: str):
    """Send prompt to Dashscope-compatible endpoint and return (answer, [reasoning_strings])

    Returns:
      answer: str or None
      reasoning: list of str (possibly empty)
    """
    if not API_KEY:
        raise RuntimeError("DASHSCOPE_API_KEY not set in environment")

    resp = client.responses.create(
        model="qwen3.8-max",
        input=prompt,
        extra_body={
            "enable_thinking": True,
        },
    )

    answer_texts = []
    reasoning_texts = []

    # The response structure from Dashscope-compatible endpoint can contain multiple output items
    for item in getattr(resp, 'output', []) or []:
        t = getattr(item, 'type', None)
        if t == 'message':
            # item.content is often a list; each content element may have text
            for c in getattr(item, 'content', []) or []:
                text = getattr(c, 'text', None)
                if text:
                    answer_texts.append(text)
        elif t == 'reasoning':
            # reasoning may have summary list
            for s in getattr(item, 'summary', []) or []:
                txt = getattr(s, 'text', None)
                if txt:
                    reasoning_texts.append(txt)

    answer = '\n'.join(answer_texts).strip() if answer_texts else None
    return answer, reasoning_texts
