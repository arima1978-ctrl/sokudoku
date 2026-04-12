'use client'

import { useState } from 'react'
import { generateParentToken } from '@/app/actions/coachHistory'

interface ParentReportLinkProps {
  studentId: string
  existingToken: string | null
}

export default function ParentReportLink({ studentId, existingToken }: ParentReportLinkProps) {
  const [token, setToken] = useState(existingToken)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const reportUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/parent/report/${token}`
    : null

  async function handleGenerate() {
    setGenerating(true)
    try {
      const newToken = await generateParentToken(studentId)
      setToken(newToken)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!reportUrl) return
    await navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!token) {
    return (
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
      >
        {generating ? '生成中...' : '保護者レポートURL生成'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
    >
      {copied ? 'コピーしました' : '保護者レポートURLをコピー'}
    </button>
  )
}
