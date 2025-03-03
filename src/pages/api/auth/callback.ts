import type { NextApiRequest, NextApiResponse } from 'next'
import { siteConfig } from '../../../config/site.config'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code parameter' })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: siteConfig.github.clientId,
          client_secret: siteConfig.github.clientSecret,
          code,
        }),
      }
    )

    const data = await tokenResponse.json()

    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    // Redirect to admin page with token
    res.redirect(
      `/admin?token=${data.access_token}`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect('/error?message=Authentication failed')
  }
} 