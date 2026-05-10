'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TRANSCRIPT, type Segment } from '@/data/transcript';
import WordPopup from '@/components/WordPopup';

interface VocabWord {
  word: string;
  reading: string;
  meaning: string;
  addedAt: number;
}

function tokenizeJapanese(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter('ja', { granularity: 'word' });
    return [...segmenter.segment(text)]
      .map((s: any) => s.segment)
      .filter((s: string) => s.length > 0);
  }

  return [text];
}

function isWordLike(token: string): boolean {
  return (
    token
      .split('')
      .some(
        (c) =>
          (c >= '぀' && c <= 'ゟ') ||
          (c >= '゠' && c <= 'ヿ') ||
          (c >= '一' && c <= '鿿') ||
          (c >= '㐀' && c <= '䶿')
      ) && token.trim().length > 0
  );
}

export default function KaraokePage() {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    segmentId: number;
    tokenIndex: number;
  } | null>(null);
  const [readingWord, setReadingWord] = useState<{
    segmentId: number;
    tokenIndex: number;
  } | null>(null);

  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(0.85);
  const [showKorean, setShowKorean] = useState(true);

  useEffect(() => {
    const el = segmentRefs.current[currentSegmentId];
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentSegmentId]);

  const stopTts = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsTtsSpeaking(false);
    setReadingWord(null);
  }, []);

  const readFromSegment = useCallback(
    (startSegId: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      setIsTtsSpeaking(true);

      const readNext = (segId: number) => {
        if (segId >= TRANSCRIPT.length) {
          setIsTtsSpeaking(false);
          setReadingWord(null);
          return;
        }

        setCurrentSegmentId(segId);

        const seg = TRANSCRIPT[segId];
        const utterance = new SpeechSynthesisUtterance(seg.text);

        utterance.lang = 'ja-JP';
        utterance.rate = ttsSpeed;
        utterance.pitch = 1.0;

        utterance.onboundary = (event) => {
          const tokens = tokenizeJapanese(seg.text);
          let cumulativeLength = 0;

          for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            cumulativeLength += tokens[tokenIndex].length;

            if (event.charIndex < cumulativeLength && isWordLike(tokens[tokenIndex])) {
              setReadingWord({
                segmentId: segId,
                tokenIndex,
              });
              break;
            }
          }
        };

        utterance.onend = () => {
          setReadingWord(null);
          readNext(segId + 1);
        };

        utterance.onerror = () => {
          setReadingWord(null);
          setIsTtsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      };

      readNext(startSegId);
    },
    [ttsSpeed]
  );

  const handleWordClick = useCallback(
    (word: string, segmentId: number, tokenIndex: number) => {
      stopTts();
      setCurrentSegmentId(segmentId);
      setSelectedWord({ word, segmentId, tokenIndex });
    },
    [stopTts]
  );

  const addToVocab = useCallback((word: string, reading: string, meaning: string) => {
    try {
      const saved = localStorage.getItem('vocab');
      const words: VocabWord[] = saved ? JSON.parse(saved) : [];

      if (!words.find((w) => w.word === word)) {
        words.unshift({
          word,
          reading,
          meaning,
          addedAt: Date.now(),
        });

        localStorage.setItem('vocab', JSON.stringify(words));
        window.dispatchEvent(new Event('vocabUpdated'));
      }
    } catch {
      // localStorage 사용 불가 환경에서는 조용히 무시
    }
  }, []);

  const handleReadFrom = useCallback(() => {
    if (!selectedWord) return;
    readFromSegment(selectedWord.segmentId);
  }, [selectedWord, readFromSegment]);

  const renderSegment = (seg: Segment, idx: number) => {
    const isActive = seg.id === currentSegmentId;
    const tokens = tokenizeJapanese(seg.text);

    return (
      <div
        key={seg.id}
        ref={(el) => {
          segmentRefs.current[idx] = el;
        }}
        style={{
          padding: '12px 14px',
          marginBottom: '4px',
          borderRadius: '10px',
          background: isActive ? '#fff8e7' : 'transparent',
          borderLeft: isActive ? '3px solid #d4a373' : '3px solid transparent',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
        onClick={() => {
          setCurrentSegmentId(seg.id);
        }}
      >
        <div
          style={{
            fontSize: '17px',
            lineHeight: '2.2',
            color: isActive ? '#3d2b1f' : '#7a6050',
            fontFamily: 'Noto Serif JP, Georgia, serif',
            transition: 'color 0.3s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {tokens.map((token, tokenIndex) => {
            if (!isWordLike(token)) {
              return <span key={tokenIndex}>{token}</span>;
            }

            const isReading =
              readingWord?.segmentId === seg.id && readingWord?.tokenIndex === tokenIndex;

            return (
              <span
                key={tokenIndex}
                className={`word-token${isReading ? ' reading' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordClick(token, seg.id, tokenIndex);
                }}
                title="클릭하면 단어 뜻을 확인해요"
              >
                {token}
              </span>
            );
          })}
        </div>

        {showKorean && (
          <div
            style={{
              fontSize: '12px',
              color: isActive ? '#8b5e3c' : '#9d7b6a',
              marginTop: '4px',
              lineHeight: '1.6',
              fontStyle: 'italic',
              borderTop: isActive ? '1px solid #e9d8c2' : 'none',
              paddingTop: isActive ? '6px' : '2px',
              opacity: isActive ? 1 : 0.72,
            }}
          >
            {seg.korean}
          </div>
        )}
      </div>
    );
  };

  const progress = ((currentSegmentId + 1) / TRANSCRIPT.length) * 100;

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')}`;

  const currentSegment = TRANSCRIPT[currentSegmentId];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: '22px',
            color: '#8b5e3c',
            fontFamily: 'Noto Serif JP, serif',
            margin: '0 0 4px',
          }}
        >
          ☕ マイの日本語ポッドキャスト
        </h1>
        <p style={{ fontSize: '13px', color: '#9d7b6a', margin: 0 }}>
          일본 편의점 이야기 — 단어를 클릭하면 뜻을 확인할 수 있어요 ✨
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            height: '4px',
            background: '#e9d8c2',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(to right, #d4a373, #8b5e3c)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#9d7b6a',
          }}
        >
          <span>{formatTime(currentSegment?.startTime || 0)}</span>
          <span>
            {currentSegmentId + 1} / {TRANSCRIPT.length}
          </span>
          <span>{formatTime(TRANSCRIPT[TRANSCRIPT.length - 1].startTime)}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '76px',
          }}
        >
          <div
            style={{
              background: '#fff8f0',
              borderRadius: '12px',
              border: '1px solid #e9d8c2',
              padding: '14px',
              boxShadow: '0 2px 12px rgba(139,94,60,0.08)',
            }}
          >
            <button
              onClick={() =>
                isTtsSpeaking ? stopTts() : readFromSegment(currentSegmentId)
              }
              style={{
                width: '100%',
                padding: '12px',
                background: isTtsSpeaking ? '#8b3a3a' : '#8b5e3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              {isTtsSpeaking ? '⏹ 정지' : '▶ 현재 구간부터 읽기'}
            </button>

            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#9d7b6a',
                  marginBottom: '4px',
                }}
              >
                <span>읽기 속도</span>
                <span>
                  {ttsSpeed < 0.75
                    ? '🐢 느리게'
                    : ttsSpeed < 1.0
                      ? '👟 보통'
                      : '🐇 빠르게'}
                </span>
              </div>

              <input
                type="range"
                min="0.6"
                max="1.1"
                step="0.25"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5e3c' }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#8b5e3c',
                cursor: 'pointer',
                paddingTop: '10px',
                borderTop: '1px solid #e9d8c2',
              }}
            >
              <input
                type="checkbox"
                checked={showKorean}
                onChange={(e) => setShowKorean(e.target.checked)}
                style={{ accentColor: '#8b5e3c' }}
              />
              한국어 번역 보기
            </label>
          </div>
        </div>

        <div
          style={{
            background: '#fff8f0',
            borderRadius: '12px',
            border: '1px solid #e9d8c2',
            boxShadow: '0 2px 12px rgba(139,94,60,0.10)',
            padding: '14px',
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '76px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid #e9d8c2',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#8b5e3c',
              }}
            >
              📜 트랜스크립트
            </h2>
            <span style={{ fontSize: '11px', color: '#9d7b6a' }}>
              💡 단어 클릭 → 의미 확인
            </span>
          </div>

          <div
            style={{
              background: '#fff8e7',
              border: '1px solid #e9d8c2',
              borderLeft: '4px solid #d4a373',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '12px',
              boxShadow: '0 2px 8px rgba(139,94,60,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#9d7b6a',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              🎵 현재 구간
            </div>

            <div
              style={{
                fontSize: '18px',
                color: '#3d2b1f',
                fontFamily: 'Noto Serif JP, serif',
                lineHeight: '2',
              }}
            >
              {currentSegment?.text}
            </div>

            {showKorean && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#9d7b6a',
                  fontStyle: 'italic',
                  borderTop: '1px solid #e9d8c2',
                  paddingTop: '6px',
                  marginTop: '6px',
                  lineHeight: '1.6',
                }}
              >
                {currentSegment?.korean}
              </div>
            )}
          </div>

          <div
            ref={transcriptRef}
            style={{
              overflowY: 'auto',
              flex: 1,
              paddingRight: '4px',
            }}
          >
            {TRANSCRIPT.map((seg, idx) => renderSegment(seg, idx))}
          </div>
        </div>
      </div>

      {selectedWord && (
        <WordPopup
          word={selectedWord.word}
          onClose={() => setSelectedWord(null)}
          onAddVocab={addToVocab}
          onReadFrom={handleReadFrom}
        />
      )}
    </div>
  );
}