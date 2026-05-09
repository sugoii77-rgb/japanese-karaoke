import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'No word provided' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 3600 }, // cache for 1 hour
      }
    );

    if (!res.ok) {
      throw new Error('Jisho API error');
    }

    const data = await res.json();

    // Extract and simplify the response
    const results = (data.data || []).slice(0, 3).map((item: any) => ({
      word: item.japanese?.[0]?.word || word,
      reading: item.japanese?.[0]?.reading || '',
      meanings: (item.senses || []).slice(0, 3).map((sense: any) => ({
        english: (sense.english_definitions || []).slice(0, 3).join(', '),
        partsOfSpeech: (sense.parts_of_speech || []).slice(0, 2).join(', '),
      })),
      jlpt: item.jlpt?.[0] || '',
      common: item.is_common || false,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    // Fallback: return basic info
    return NextResponse.json({
      results: [],
      error: 'Could not fetch definition',
    });
  }
}
