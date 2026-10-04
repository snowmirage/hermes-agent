import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { $voicePlayback } from '@/store/voice-playback'

import { startSpeechStream, stopVoicePlayback, toggleVoicePlaybackPaused } from './voice-playback'

// Client-direct synthesizes one sentence ahead while the current one plays.
// A pause must hold the reply where it is: a sentence that finishes
// synthesizing during the pause waits, and starts only on resume.

const synth = vi.hoisted(() => ({ calls: [] as { sentence: string; resolve: (bytes: ArrayBuffer) => void }[] }))

vi.mock('@/hermes', () => ({
  getApiRequestConnection: () => null,
  getApiRequestProfile: () => null,
  speakText: vi.fn()
}))
vi.mock('@/lib/voice-client-direct', () => ({
  directTtsConfig: async () => ({ provider: 'test' }),
  synthesizeSpeechClientDirect: (_tts: unknown, sentence: string) =>
    new Promise<ArrayBuffer>(resolve => synth.calls.push({ sentence, resolve })),
  cutSentences: (text: string) => ({ rest: '', sentences: text ? [text] : [] })
}))

class AudioFixture extends EventTarget {
  static instances: AudioFixture[] = []
  paused = true
  constructor(readonly src: string) {
    super()
    AudioFixture.instances.push(this)
  }
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn()
}

beforeEach(() => {
  synth.calls = []
  AudioFixture.instances = []
  vi.stubGlobal('Audio', AudioFixture)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})
afterEach(() => {
  stopVoicePlayback()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

it('holds a sentence that becomes ready during a pause until resume', async () => {
  const session = (await startSpeechStream({ source: 'voice-conversation' }))!
  session.append('One.')
  session.append('Two.')
  session.finish()

  synth.calls[0].resolve(new ArrayBuffer(4))
  await flush()
  expect(AudioFixture.instances).toHaveLength(1)
  expect($voicePlayback.get().status).toBe('speaking')

  // Sentence one ends; sentence two is still synthesizing — the gap.
  AudioFixture.instances[0].dispatchEvent(new Event('ended'))
  await toggleVoicePlaybackPaused()
  expect($voicePlayback.get().status).toBe('paused')

  synth.calls[1].resolve(new ArrayBuffer(4))
  await flush()
  expect(AudioFixture.instances, 'sentence two started while paused').toHaveLength(1)

  await toggleVoicePlaybackPaused()
  await flush()
  expect($voicePlayback.get().status).toBe('speaking')
  expect(AudioFixture.instances).toHaveLength(2)
  expect(AudioFixture.instances[1].play).toHaveBeenCalled()

  AudioFixture.instances[1].dispatchEvent(new Event('ended'))
  expect(await session.done).toBe('done')
})

it('keeps the paused sentence and resumes the same audio', async () => {
  const session = (await startSpeechStream({ source: 'voice-conversation' }))!
  session.append('One.')
  session.append('Two.')
  session.finish()

  synth.calls[0].resolve(new ArrayBuffer(4))
  await flush()
  const first = AudioFixture.instances[0]

  await toggleVoicePlaybackPaused()
  expect(first.pause).toHaveBeenCalled()

  // The lookahead still prepares sentence two, but nothing new plays.
  synth.calls[1].resolve(new ArrayBuffer(4))
  await flush()
  expect(AudioFixture.instances).toHaveLength(1)

  await toggleVoicePlaybackPaused()
  expect(first.play).toHaveBeenCalledTimes(2)
  expect(AudioFixture.instances).toHaveLength(1)

  first.dispatchEvent(new Event('ended'))
  await flush()
  expect(AudioFixture.instances).toHaveLength(2)

  AudioFixture.instances[1].dispatchEvent(new Event('ended'))
  expect(await session.done).toBe('done')
})
