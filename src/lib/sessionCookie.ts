/**
 * HMAC-SHA256 でセッションcookieを署名/検証する。
 * 形式: <base64url(payload)>.<base64url(signature)>
 *
 * 環境変数 SESSION_SECRET が必須。未設定時はサーバー起動時にエラー。
 */
import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET が未設定、または32文字未満です。ランダムな強固な値を .env.local に設定してください')
  }
  return s
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

/** 任意のJSONシリアライズ可能な値を署名付きトークンにする */
export function signSession(payload: unknown): string {
  const json = JSON.stringify(payload)
  const payloadB64 = base64UrlEncode(Buffer.from(json, 'utf8'))
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest()
  const sigB64 = base64UrlEncode(sig)
  return `${payloadB64}.${sigB64}`
}

/** トークンを検証してパース。署名不正なら null。 */
export function verifySession<T = unknown>(token: string): T | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payloadB64, sigB64] = token.split('.', 2)
  if (!payloadB64 || !sigB64) return null
  const expected = createHmac('sha256', getSecret()).update(payloadB64).digest()
  let actual: Buffer
  try {
    actual = base64UrlDecode(sigB64)
  } catch {
    return null
  }
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null
  try {
    const json = base64UrlDecode(payloadB64).toString('utf8')
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
