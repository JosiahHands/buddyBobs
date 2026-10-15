import { describe, expect, it } from '@jest/globals'
import { getPostImage } from '../../src/lemmy/postImage.ts'
import { makePost } from '../testUtils.ts'

describe('getPostImage', () => {
  it('uses the full image for image posts', () => {
    const postView = {
      ...makePost(1, { url: 'https://img/pig.jpg', url_content_type: 'image/jpeg', alt_text: 'A pig' }),
      image_details: { width: 400, height: 300 },
    }
    expect(getPostImage(postView)).toEqual({ src: 'https://img/pig.jpg', alt: 'A pig', width: 400, height: 300 })
  })

  it('uses the preview for link posts', () => {
    const postView = makePost(1, {
      url: 'https://news/article',
      url_content_type: 'text/html',
      thumbnail_url: 'https://img/thumb.jpg',
    })
    expect(getPostImage(postView)).toEqual({ src: 'https://img/thumb.jpg', alt: '', width: undefined, height: undefined })
  })

  it('shows nothing for posts without an image', () => {
    expect(getPostImage(makePost(1))).toBeNull()
  })

  it('never shows NSFW images', () => {
    const postView = makePost(1, { nsfw: true, url: 'https://img/x.jpg', url_content_type: 'image/jpeg' })
    expect(getPostImage(postView)).toBeNull()
  })
})
