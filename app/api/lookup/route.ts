import { NextRequest, NextResponse } from 'next/server';

// ── 인메모리 번역 캐시 (서버 수명 동안 유지) ─────────────────
const translationCache = new Map<string, string>();

async function translateBatch(texts: string[]): Promise<string[]> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || texts.length === 0) return texts;

  const result = new Array<string>(texts.length);
  const toFetch: { idx: number; text: string }[] = [];

  texts.forEach((text, i) => {
    const cached = translationCache.get(text);
    if (cached !== undefined) {
      result[i] = cached;
    } else {
      toFetch.push({ idx: i, text });
    }
  });

  if (toFetch.length === 0) return result;

  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: toFetch.map((f) => f.text),
          source: 'en',
          target: 'ko',
          format: 'text',
        }),
      }
    );

    if (!res.ok) throw new Error(`Translate API error: ${res.status}`);

    const data = await res.json();
    const translations: { translatedText: string }[] =
      data.data?.translations || [];

    toFetch.forEach(({ idx, text }, i) => {
      const translated = translations[i]?.translatedText || text;
      result[idx] = translated;
      translationCache.set(text, translated);
    });
  } catch {
    // API 실패 시 영어 원문 그대로 반환
    toFetch.forEach(({ idx, text }) => {
      result[idx] = text;
    });
  }

  return result;
}

// ── 품사 한국어 변환 ──────────────────────────────────────
const posToKorean = (pos: string) => {
  if (!pos) return '';

  const normalizePos = (value: string) =>
    value
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim();

  const map: Record<string, string> = {
    'Adverb': '부사',
    'Noun': '명사',
    'Verb': '동사',
    'Expression': '표현',
    'Expressions': '표현',
    'Expressions (phrases, clauses, etc.)': '표현',
    'Particle': '조사',
    'Conjunction': '접속사',
    'Interjection': '감탄사',
    'Pronoun': '대명사',
    'Prefix': '접두사',
    'Suffix': '접미사',
    'Counter': '조수사',
    'Numeric': '수사',

    'I-adjective': 'い형용사',
    'Na-adjective': 'な형용사',
    'No-adjective': 'の형용사',
    'Pre-noun adjectival': '연체사',

    'Ichidan verb': '1단 동사',
    'Godan verb': '5단 동사',
    'Godan verb with u ending': '5단 동사',
    'Godan verb with ku ending': '5단 동사',
    'Godan verb with gu ending': '5단 동사',
    'Godan verb with su ending': '5단 동사',
    'Godan verb with tsu ending': '5단 동사',
    'Godan verb with nu ending': '5단 동사',
    'Godan verb with bu ending': '5단 동사',
    'Godan verb with mu ending': '5단 동사',
    'Godan verb with ru ending': '5단 동사',

    'Transitive verb': '타동사',
    'Intransitive verb': '자동사',
    'Suru verb': 'する 동사',
    'Suru verb - included': 'する 동사',
    'Suru verb - special class': 'する 동사',

    'Auxiliary verb': '조동사',
    'Auxiliary adjective': '보조 형용사',
    'Wikipedia definition': '위키 정의',
  };

  return pos
    .split(',')
    .map((p) => {
      const trimmed = p.trim();
      const normalized = normalizePos(trimmed);
      return map[trimmed] || map[normalized] || trimmed;
    })
    .join(', ');
};

// ── 수동 override 조회 (매칭 없으면 null 반환 → Google Translate로 넘김) ──
function getManualOverride(
  originalWord: string,
  resultWord: string,
  reading: string,
  english: string
): string | null {
  if (!english) return null;

  const normalizedEnglish = english.toLowerCase().trim();

  const wordMap: Record<string, string> = {
    '皆さん': '여러분',
    'こんにちは': '안녕하세요',
    'ようこそ': '어서 오세요, 환영합니다',
    'お元気': '건강함, 잘 지냄',
    '私': '나, 저',
    '昨日': '어제',
    '韓国': '한국',
    '日本': '일본',
    '寒い': '춥다, 차갑다',
    '夜ごはん': '저녁밥',
    '晩ごはん': '저녁밥',
    'おでん': '오뎅',
    '本当に': '정말로, 진짜로',
    '本当': '정말, 진짜, 사실',
    '最高': '최고',
    '大好き': '매우 좋아함',
    'やっぱり': '역시, 역시나, 아무래도, 결국',
    '矢っ張り': '역시, 역시나, 아무래도, 결국',
    '矢張り': '역시, 역시나, 아무래도, 결국',
    'ときどき': '때때로, 가끔',
    '時々': '때때로, 가끔',
    '恋しい': '그립다',
    '恋しく': '그립게',
    '懐かしい': '그립다, 추억이 떠오르다',
    '寂しい': '외롭다, 쓸쓸하다',
    '気持ち': '마음, 기분',
    '感情': '감정',
    '特に': '특히',
    'コンビニ': '편의점',
    '味': '맛',
    '特別': '특별함',
    '人気': '인기',
    '外国人': '외국인',
    '今日': '오늘',
    '話し': '이야기',
    '紹介': '소개',
    '最後': '마지막',
    '聞いて': '듣고',
    '有名': '유명함',
    '三つ': '세 개',
    '特徴': '특징',
    '一つ目': '첫 번째',
    '二つ目': '두 번째',
    '三つ目': '세 번째',
    '店舗': '점포',
    '一番': '가장, 제일',
    '多い': '많다',
    '最大': '최대',
    '規模': '규모',
    '呼び方': '부르는 방식',
    '東京': '도쿄',
    '周辺': '주변',
    '地域': '지역',
    '関西': '간사이',
    '大阪': '오사카',
    '京都': '교토',
    '人': '사람',
    '呼ぶ': '부르다',
    'お弁当': '도시락',
    '弁当': '도시락',
    'おにぎり': '주먹밥',
    '惣菜': '반찬, 즉석 반찬',
    'クオリティ': '품질, 퀄리티',
    '高い': '높다, 비싸다',
    '種類': '종류',
    '豊富': '풍부함',
    'おいしい': '맛있다',
    'たくさん': '많이',
    'スイーツ': '디저트',
    '商品': '상품',
    'ファミリーマート': '패밀리마트',
    'ファミマ': '파미마',
    '関東': '간토',
    '同じく': '마찬가지로',
    '少し': '조금, 약간',
    'イントネーション': '억양',
    '違います': '다릅니다',
    '実は': '사실은',
    '今まで': '지금까지',
    '一度も': '한 번도',
    '分からなくて': '몰라서',
    '調べて': '찾아보고',
    '外側': '바깥쪽',
    '中': '안, 속',
    '肉汁': '육즙',
    '若い': '젊다',
    '世代': '세대',
    '普通': '보통',
    '辛い': '맵다',
    'チーズ': '치즈',
    '期間限定': '기간 한정',
    '限定': '한정',
    '時期': '시기',
    '何度も': '몇 번이나',
    '個人的': '개인적으로',
    'おすすめ': '추천',
    '丸い': '둥근',
    '販売': '판매',
    '世界的': '세계적',
    '比べる': '비교하다',
    '値段': '가격',
    '高め': '비교적 높음',
    '健康': '건강',
    '向け': '대상, ~을 위한',
    '意識': '의식',
    '価格帯': '가격대',
    '高級': '고급',
    '印象': '인상',
    '略して': '줄여서',
    '説明': '설명',
    '駅前': '역 앞',
    '近く': '근처',
    '会社': '회사',
    '歩いて': '걸어서',
    '見つかります': '찾을 수 있습니다',
    '営業': '영업',
    '日本人': '일본인',
    '存在': '존재',
    '物': '물건',
    '買う': '사다',
    '便利': '편리함',
    'サービス': '서비스',
    '利用': '이용',
    '銀行': '은행',
    '発行': '발급',
    '現金': '현금',
    '引き出す': '인출하다',
    '旅行': '여행',
    '足りなく': '부족하게',
    '宅配': '택배',
    '荷物': '짐, 화물',
    '発送': '발송',
    '公共料金': '공공요금, 공과금',
    '支払い': '지불, 납부',
    '電気代': '전기요금',
    '水道代': '수도요금',
    'ついでに': '~하는 김에',
    'コピー機': '복사기',
    '印刷': '인쇄',
    '写真': '사진',
    '簡単': '간단함',
    '急に': '갑자기',
    '必要': '필요함',
    'トイレ': '화장실',
    '借りて': '빌려서',
    '必ず': '반드시',
    'お店': '가게',
    '生活': '생활',
    '魅力': '매력',
    '季節': '계절',
    'イベント': '이벤트',
    '春': '봄',
    '桜': '벚꽃',
    'いちご': '딸기',
    '夏': '여름',
    '冷たい': '차가운',
    '麺': '면',
    '熱中症': '열사병',
    '毎年': '매년',
    '倒れる': '쓰러지다',
    '対策': '대책',
    '塩分': '염분',
    '補給': '보충',
    '秋': '가을',
    'さつまいも': '고구마',
    '栗': '밤',
    'かぼちゃ': '호박',
    '冬': '겨울',
    '温かい': '따뜻하다',
    'スープ': '수프',
    '鍋料理': '냄비 요리',
    '食べ物': '음식',
    '中華まん': '중화 찐빵류',
    '肉まん': '고기만두',
    'あんまん': '팥찐빵',
    'ピザまん': '피자만두',
    '熱々': '뜨끈뜨끈함',
    'レジ': '계산대',
    '横': '옆',
    'ケース': '케이스',
    '会計': '계산',
    '買おう': '사야겠다',
    '子ども': '아이, 어린 시절',
    '思い出': '추억',
    '毎日': '매일',
    '母': '어머니',
    '当時': '당시',
    '仕事': '일',
    '忙しくて': '바빠서',
    '疲れて': '피곤해서',
    '意味': '의미',
    'うれしくて': '기뻐서',
    '答えて': '대답해서',
    '二人': '두 사람',
    '記憶': '기억',
    '温かい記憶': '따뜻한 기억',
    'クリスマス': '크리스마스',
    'お正月': '설날, 정월',
    '予約': '예약',
    '購入': '구매',
    '料理': '요리',
    '四角い': '네모난',
    '箱': '상자',
    '重箱': '찬합, 주바코',
    '豪華': '호화로움',
    '地域限定': '지역 한정',
    '楽しみ': '즐거움',
    '高校生': '고등학생',
    '向かい': '맞은편',
    '朝': '아침',
    '朝ごはん': '아침밥',
    '休み時間': '쉬는 시간',
    'お菓子': '과자',
    '友達': '친구',
    '放課後': '방과 후',
    '約束': '약속',
    '待ち合わせ': '약속 장소에서 만남',
    '授業': '수업',
    '大人': '어른',
    '頻繁': '빈번함, 자주',
    'まつわる': '관련된',
    'コメント': '댓글',
    '表現': '표현',
    '欲しい': '원하다',
    '床': '바닥',
    '足': '발',
    '形': '모양',
    '矢印': '화살표',
    'お客さん': '손님',
    '店員': '점원',
    'お客様': '손님',
    'こちら': '이쪽',
    'どうぞ': '부디, 이쪽으로',
    '温めます': '데워 드립니다',
    '電子レンジ': '전자레인지',
    '状態': '상태',
    '場合': '경우',
    'お願いします': '부탁드립니다',
    '反対': '반대',
    '大丈夫': '괜찮음',
    'お箸': '젓가락',
    '何膳': '몇 쌍',
    '単位': '단위',
    '一組': '한 쌍',
    '一膳': '젓가락 한 쌍',
    '二膳': '젓가락 두 쌍',
    '三膳': '젓가락 세 쌍',
    '酒': '술',
    'タバコ': '담배',
    '年齢確認': '나이 확인',
    '押してください': '눌러 주세요',
    '画面': '화면',
    'タッチ': '터치',
    '飲酒': '음주',
    '喫煙': '흡연',
    '質問': '질문',
    '表示': '표시',
    '袋': '봉투',
    '有料': '유료',
    'いらない': '필요 없다',
    '勇気': '용기',
    'ありがとうございました': '감사했습니다',
    'また': '또, 다시',
    '会いましょう': '만나요',
  };

  const englishMap: Record<string, string> = {
    'as expected, sure enough, just as one thought': '역시, 예상대로, 생각한 대로',
    'after all (is said and done), in the end, as one would expect': '결국, 아무래도, 역시',
    'too, also, as well': '또한, 역시, ~도',
    'really, truly': '정말로, 진짜로',
    'truth, reality, actuality, fact': '진실, 실제, 사실',
    'convenience store': '편의점',
    'japan': '일본',
    'korea': '한국',
    'popular': '인기 있는',
    'convenient': '편리한',
    'cold': '추운, 차가운',
    'best, supreme, wonderful': '최고, 훌륭함',
    'to eat': '먹다',
    'to drink': '마시다',
    'to buy': '사다',
    'to go': '가다',
    'to come': '오다',
    'to see': '보다',
    'to hear': '듣다',
    'to listen': '듣다',
    'to speak': '말하다',
    'to say': '말하다',
    'to think': '생각하다',
    'to know': '알다',
    'to understand': '이해하다',
    'to use': '사용하다',
    'to make': '만들다',
    'to sell': '팔다',
    'to wait': '기다리다',
    'to choose': '고르다, 선택하다',
    'to warm up': '데우다',
    'to heat': '데우다, 가열하다',
    'bag': '봉투, 가방',
    'chopsticks': '젓가락',
    'customer': '손님',
    'clerk': '점원',
    'store': '가게, 점포',
    'shop': '가게',
    'station': '역',
    'near': '가까운, 근처',
    'around': '주변, 근처',
    'today': '오늘',
    'yesterday': '어제',
    'tomorrow': '내일',
    'now': '지금',
    'old times': '옛날, 예전',
    'memory': '기억, 추억',
    'season': '계절',
    'spring': '봄',
    'summer': '여름',
    'autumn': '가을',
    'fall': '가을',
    'winter': '겨울',
    'food': '음식',
    'meal': '식사',
    'rice': '밥, 쌀',
    'sweet': '달콤한 것, 디저트',
    'sweets': '디저트',
    'quality': '품질, 퀄리티',
    'price': '가격',
    'expensive': '비싼',
    'cheap': '싼',
    'health': '건강',
    'service': '서비스',
    'payment': '지불, 납부',
    'money': '돈',
    'cash': '현금',
    'card': '카드',
    'question': '질문',
    'answer': '대답',
    'expression': '표현',
    'word': '단어',
    'meaning': '의미',
  };

  return (
    wordMap[originalWord] ||
    wordMap[resultWord] ||
    wordMap[reading] ||
    englishMap[normalizedEnglish] ||
    null
  );
}

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
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) throw new Error('Jisho API error');

    const data = await res.json();

    // 1차 패스: 기본 데이터 수집 + 수동 override 조회
    type SenseRaw = {
      english: string;
      manualKorean: string | null;
      partsOfSpeech: string;
      partsOfSpeechKo: string;
    };
    type ItemRaw = {
      word: string;
      reading: string;
      senses: SenseRaw[];
      jlpt: string;
      common: boolean;
    };

    const items: ItemRaw[] = (data.data || []).slice(0, 3).map((item: any) => {
      const resultWord = item.japanese?.[0]?.word || word;
      const reading = item.japanese?.[0]?.reading || '';

      const senses: SenseRaw[] = (item.senses || []).slice(0, 3).map((sense: any) => {
        const english = (sense.english_definitions || []).slice(0, 3).join(', ');
        const partsOfSpeech = (sense.parts_of_speech || []).slice(0, 2).join(', ');
        return {
          english,
          manualKorean: getManualOverride(word, resultWord, reading, english),
          partsOfSpeech,
          partsOfSpeechKo: posToKorean(partsOfSpeech),
        };
      });

      return { word: resultWord, reading, senses, jlpt: item.jlpt?.[0] || '', common: item.is_common || false };
    });

    // 2차 패스: 수동 override 없는 영어 뜻만 모아 Google Translate 일괄 번역
    const toTranslate: string[] = [];
    const translateMap: { itemIdx: number; senseIdx: number }[] = [];

    items.forEach((item, itemIdx) => {
      item.senses.forEach((sense, senseIdx) => {
        if (sense.manualKorean === null && sense.english) {
          toTranslate.push(sense.english);
          translateMap.push({ itemIdx, senseIdx });
        }
      });
    });

    if (toTranslate.length > 0) {
      const translated = await translateBatch(toTranslate);
      translateMap.forEach(({ itemIdx, senseIdx }, i) => {
        items[itemIdx].senses[senseIdx].manualKorean = translated[i];
      });
    }

    // 최종 결과 조립
    const results = items.map((item) => ({
      word: item.word,
      reading: item.reading,
      meanings: item.senses.map((sense) => ({
        english: sense.english,
        korean: sense.manualKorean ?? sense.english,
        partsOfSpeech: sense.partsOfSpeech,
        partsOfSpeechKo: sense.partsOfSpeechKo,
      })),
      jlpt: item.jlpt,
      common: item.common,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'Could not fetch definition' });
  }
}
