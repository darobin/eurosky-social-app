import {
  getGiftUrl,
  rememberGiftUrl,
  resetGiftUrls,
  subscribeGiftUrls,
} from './giftUrlStore'

describe('giftUrlStore', () => {
  beforeEach(() => resetGiftUrls())

  it('remembers gift URLs by original link', () => {
    expect(getGiftUrl('https://a.example/1')).toBeUndefined()
    rememberGiftUrl('https://a.example/1', 'https://gift.example/x')
    expect(getGiftUrl('https://a.example/1')).toBe('https://gift.example/x')
    expect(getGiftUrl('https://a.example/2')).toBeUndefined()
  })

  it('notifies subscribers until they unsubscribe', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeGiftUrls(listener)
    rememberGiftUrl('https://a.example/1', 'https://gift.example/x')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    rememberGiftUrl('https://a.example/2', 'https://gift.example/y')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
