import { ImageResponse } from 'next/og'

// This file is used by Next.js to generate the favicon.
// It must now return an ImageResponse.

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#00B3A4',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '8px'
        }}
      >
      V
      </div>
    ),
    {
      ...size,
    }
  )
}
