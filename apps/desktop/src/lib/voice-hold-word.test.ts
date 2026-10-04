import { describe, expect, it } from 'vitest'

import { isVoiceHoldCommand, isVoiceResumeCommand } from './voice-hold-word'

describe('isVoiceHoldCommand', () => {
  it.each(['hold on', 'Hold on a minute.', 'Hang on, a sec', 'Wait!', 'Hermes, hold on', 'one moment', 'Pause.'])(
    'holds on %j',
    phrase => expect(isVoiceHoldCommand(phrase)).toBe(true)
  )

  it.each(['hold on to that file', 'wait for the build to finish', 'pause the container', 'go on', ''])(
    'ignores %j',
    phrase => expect(isVoiceHoldCommand(phrase)).toBe(false)
  )
})

describe('isVoiceResumeCommand', () => {
  it.each(['go on', 'Go on.', 'Okay, go ahead', 'carry on', "I'm ready", 'Hermes continue', 'keep going'])(
    'resumes on %j',
    phrase => expect(isVoiceResumeCommand(phrase)).toBe(true)
  )

  it.each(['continue the refactor', 'go on to the next file', 'are you ready', 'hold on', ''])('ignores %j', phrase =>
    expect(isVoiceResumeCommand(phrase)).toBe(false)
  )
})
