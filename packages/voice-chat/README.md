# voice-chat — 语音输入 · 文字回复

最小网页聊天演示：浏览器 **Web Speech API** 将语音转为文字，填入输入框；可勾选「语音结束自动发送」，助手以**文字**回复（当前为本地模拟，可替换为 API）。

## 运行

在仓库根目录：

```bash
npm install
npm run start -w voice-chat
```

浏览器打开 **http://localhost:5175**（建议 **Chrome**，且使用 **HTTPS** 或 **localhost** 以便麦克风权限）。

## 操作

- **麦克风**：开始/停止连续识别（中文 `zh-CN`）。
- **Ctrl+M**：切换开始/停止。
- **语音结束自动发送**：停止识别后，将本次转写合并进输入框并自动发送；关闭则仅填入输入框，可编辑后点「发送」。
- **清空转写**：清除本次 hook 内的转写缓冲（不影响已发消息）。

## 降级

不支持 `SpeechRecognition` 的浏览器会禁用麦克风并提示使用 Chrome 或纯文字输入。

权限拒绝、网络错误等会显示对应说明。

## 接入真实对话

在 `ChatApp.tsx` 中把 `replyForUserText` 替换为你的后端或 Agent 调用即可。

## 后续（语音回复）

可在助手消息渲染后调用 `speechSynthesis.speak(...)`（需另加开关与浏览器兼容处理）。
