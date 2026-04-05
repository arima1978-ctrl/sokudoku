'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

import { useState, useRef } from 'react'

interface DiaryInputProps {
  onSave: (content: string, inputMethod: 'typing' | 'voice') => Promise<void>
  onSkip: () => void
}

export default function DiaryInput({ onSave, onSkip }: DiaryInputProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [useVoice, setUseVoice] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const charCount = content.length

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声入力に対応していません')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setContent(transcript)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await onSave(content, useVoice ? 'voice' : 'typing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-center text-lg font-bold text-zinc-900">
          今日の感想
        </h3>
        <p className="mb-4 text-center text-xs text-zinc-500">
          今日のトレーニングの振り返りを書いてみよう
        </p>

        {/* 入力方法切り替え */}
        <div className="mb-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setUseVoice(false)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              !useVoice ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            タイピング
          </button>
          <button
            type="button"
            onClick={() => setUseVoice(true)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              useVoice ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            音声入力
          </button>
        </div>

        {/* テキスト入力 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今日のトレーニングはどうでしたか？"
          rows={5}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />

        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-zinc-400">{charCount}文字</span>
          {useVoice && (
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                listening
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {listening ? '録音中... 停止' : '音声で入力'}
            </button>
          )}
        </div>

        {/* ボタン */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            スキップ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}
