import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const targetUrl = urlParam.trim();

    // Fetch and follow redirects
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url;
    let title = '';
    let isFacebook = false;
    let embedUrl = '';

    // Check if original or resolved URL is Facebook
    if (
      finalUrl.includes('facebook.com') ||
      finalUrl.includes('fb.watch') ||
      targetUrl.includes('facebook.com') ||
      targetUrl.includes('share.google')
    ) {
      isFacebook = true;
      try {
        const html = await response.text();
        const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
        const docTitle = html.match(/<title>([^<]+)<\/title>/i);
        const ogUrl = html.match(/property="og:url"\s+content="([^"]+)"/i);
        const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);

        const canonicalFbUrl = canonical?.[1] || ogUrl?.[1] || finalUrl;

        title = ogTitle?.[1] || docTitle?.[1] || 'Facebook Video';
        title = title.replace(' | Facebook', '').trim();

        embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          canonicalFbUrl
        )}&show_text=0&autoplay=1`;

        return NextResponse.json({
          originalUrl: targetUrl,
          resolvedUrl: canonicalFbUrl,
          title,
          isFacebook: true,
          embedUrl,
        });
      } catch (err) {
        embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          finalUrl
        )}&show_text=0&autoplay=1`;
      }
    }

    return NextResponse.json({
      originalUrl: targetUrl,
      resolvedUrl: finalUrl,
      title: title || 'Video Stream',
      isFacebook,
      embedUrl,
    });
  } catch (err: any) {
    console.error('URL resolution error:', err);
    // If server resolution fails, return original URL gracefully
    return NextResponse.json({
      originalUrl: urlParam,
      resolvedUrl: urlParam,
      title: 'Custom Stream',
      isFacebook: urlParam.includes('facebook.com') || urlParam.includes('fb.watch'),
      embedUrl: urlParam.includes('facebook.com')
        ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(urlParam)}&show_text=0`
        : '',
    });
  }
}
