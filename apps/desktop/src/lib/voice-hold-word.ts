// Spoken hold / go-on detection for the voice conversation loop.
//
// "Hold on" while Hermes is speaking means *wait*, not *stop*: the reply is
// paused where it is (the turn keeps generating behind it) until the user says
// "go on". Like the stop words, these match only when the WHOLE utterance is
// the phrase (optionally addressed to Hermes), so "hold on to that file" or
// "continue the refactor" still go through as turns.

import { normalize, stripAddress } from '@/lib/voice-stop-word'

const HOLD_PHRASES: readonly string[] = [
  'hold on',
  'hold on a minute',
  'hold on a moment',
  'hold on a second',
  'hold on a sec',
  'hold on please',
  'hang on',
  'hang on a minute',
  'hang on a moment',
  'hang on a second',
  'hang on a sec',
  'wait',
  'wait a minute',
  'wait a moment',
  'wait a second',
  'wait a sec',
  'one moment',
  'one second',
  'one sec',
  'just a moment',
  'just a minute',
  'just a second',
  'just a sec',
  'pause'
].map(normalize)

const RESUME_PHRASES: readonly string[] = [
  'go on',
  'go on please',
  'please go on',
  'go ahead',
  'carry on',
  'continue',
  'please continue',
  'keep going',
  'resume',
  "i'm ready",
  'i am ready',
  'ready'
].map(normalize)

function matches(transcript: string, phrases: readonly string[]): boolean {
  const normalized = normalize(transcript)

  if (!normalized) {
    return false
  }

  return phrases.includes(normalized) || phrases.includes(stripAddress(normalized))
}

/** True when the whole utterance asks Hermes to hold its spoken reply. */
export function isVoiceHoldCommand(transcript: string): boolean {
  return matches(transcript, HOLD_PHRASES)
}

/** True when the whole utterance asks Hermes to go on with a held reply. */
export function isVoiceResumeCommand(transcript: string): boolean {
  return matches(transcript, RESUME_PHRASES)
}
