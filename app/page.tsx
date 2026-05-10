'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TRANSCRIPT, YOUTUBE_VIDEO_ID, type Segment } from '@/data/transcript';
import WordPopup from '@/components/WordPopup';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VocabWord {
  word: string;
  reading: string;
  meaning: string;
  addedAt: number;
}

function tokenizeJapanese(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter('ja', { granularity: 'word' });
    return [...segmenter.segment(text)].map((s: any) => s.segment).filter((s: string) => s.length > 0);
  }
  return [text];
}

function isWordLike(token: string): boolean {
 return token.split('').some(
    (c) =>
      (c >= '぀' && c <= 'ゟ') ||
      (c >= '゠' && c <= 'ヿ') ||
      (c >= '一' && c <= '鿿') ||
      (c >= '㐀' && c <= '䶿')
  ) && token.trim().length > 0;
}

export default function KaraokePage() {
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentSegmentId, setCurrentSegmentId] = useState(0);
  const [selectedWord, setSelectedWord] = useState<{ word: string; segmentId: number; tokenIndex: number } | null>(null);
  const [readingWord, setReadingWord] = useState<{ segmentId: number; tokenIndex: number } | null>(null);
  const [ttsMode, setTtsMode] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(0.85);
  const [showKorean, setShowKorean] = useState(true);
  const [ytReady, setYtReady] = useState(false);

  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !playerContainerRef.current) return;
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: { cc_load_policy: 0, rel: 0, modestbranding: 1 },
        events: { onReady: () => setYtReady(true) },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, []);

  useEffect(() => {
    if (!ytReady) return;
    syncIntervalRef.current = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
      const time = playerRef.current.getCurrentTime();
      let active = 0;
      for (let i = 0; i < TRANSCRIPT.length; i++) {
        if (TRANSCRIPT[i].startTime <= time) active = i;
        else break;
      }
      setCurrentSegmentId(active);
    }, 500);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [ytReady]);

  useEffect(() => {
    const el = segmentRefs.current[currentSegmentId];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentSegmentId]);

  const stopTts = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsTtsSpeaking(false);
    setReadingWord(null);
  }, []);

  const readFromSegment = useCallback((startSegId: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsTtsSpeaking(true);

    const readNext = (segId: number) => {
      if (segId >= TRANSCRIPT.length) { setIsTtsSpeaking(false); setReadingWord(null); return; }
      setCurrentSegmentId(segId);
      const seg = TRANSCRIPT[segId];
      const utt = new SpeechSynthesisUtterance(seg.text);
      utt.lang = 'ja-JP';
      utt.rate = ttsSpeed;
      utt.pitch = 1.0;

      utt.onboundary = (event) => {
        const tokens = tokenizeJapanese(seg.text);
        let cum = 0;
        for (let ti = 0; ti < tokens.length; ti++) {
          cum += tokens[ti].length;
          if (event.charIndex < cum && isWordLike(tokens[ti])) {
            setReadingWord({ segmentId: segId, tokenIndex: ti });
            break;
          }
        }
      };
      utt.onend = () => { setReadingWord(null); readNext(segId + 1); };
      utt.onerror = () => { setReadingWord(null); setIsTtsSpeaking(false); };
      window.speechSynthesis.speak(utt);
    };
    readNext(startSegId);
  }, [ttsSpeed]);

  const handleWordClick = useCallback((word: string, segmentId: number, tokenIndex: number) => {
    stopTts();
    setSelectedWord({ word, segmentId, tokenIndex });
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(TRANSCRIPT[segmentId].startTime, true);
      playerRef.current.pauseVideo();
    }
  }, [stopTts]);

  const addToVocab = useCallback((word: string, reading: string, meaning: string) => {
    try {
      const saved = localStorage.getItem('vocab');
      const words: VocabWord[] = saved ? JSON.parse(saved) : [];
      if (!words.find((w) => w.word === word)) {
        words.unshift({ word, reading, meaning, addedAt: Date.now() });
        localStorage.setItem('vocab', JSON.stringify(words));
        window.dispatchEvent(new Event('vocabUpdated'));
      }
    } catch {}
  }, []);

  const handleReadFrom = useCallback(() => {
    if (!selectedWord) return;
    if (ttsMode) {
      readFromSegment(selectedWord.segmentId);
    } else {
      if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(TRANSCRIPT[selectedWord.segmentId].startTime, true);
        playerRef.current.playVideo();
      }
    }
  }, [selectedWord, ttsMode, readFromSegment]);

  const renderSegment = (seg: Segment, idx: number) => {
    const isActive = seg.id === currentSegmentId;
    const tokens = tokenizeJapanese(seg.text);

    return (
      <div
        key={seg.id}
        ref={(el) => { segmentRefs.current[idx] = el; }}
        style={{
          padding: '12px 14px', marginBottom: '4px', borderRadius: '10px',
          background: isActive ? '#fff8e7' : 'transparent',
          borderLeft: isActive ? '3px solid #d4a373' : '3px solid transparent',
          transition: 'all 0.3s ease', cursor: 'pointer',
        }}
        onClick={() => {
          if (playerRef.current?.seekTo) { playerRef.current.seekTo(seg.startTime, true); setCurrentSegmentId(seg.id); }
        }}
      >
        <div
          style={{ fontSize: '17px', lineHeight: '2.2', color: isActive ? '#3d2b1f' : '#7a6050', fontFamily: 'Noto Serif JP, Georgia, serif', transition: 'color 0.3s ease' }}
          onClick={(e) => e.stopPropagation()}
        >
          {tokens.map((token, ti) => {
            if (!isWordLike(token)) return <span key={ti}>{token}</span>;
            const isReading = readingWord?.segmentId === seg.id && readingWord?.tokenIndex === ti;
            return (
              <span
                key={ti}
                className={`word-token${isReading ? ' reading' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleWordClick(token, seg.id, ti); }}
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
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', margin: '0 0 4px' }}>
          ☕ マイの日本語ポッドキャスト
        </h1>
        <p style={{ fontSize: '13px', color: '#9d7b6a', margin: 0 }}>
          일본 편의점 이야기 — 단어를 클릭하면 뜻을 확인할 수 있어요 ✨
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ height: '4px', background: '#e9d8c2', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #d4a373, #8b5e3c)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9d7b6a' }}>
          <span>{formatTime(TRANSCRIPT[currentSegmentId]?.startTime || 0)}</span>
          <span>{currentSegmentId + 1} / {TRANSCRIPT.length}</span>
          <span>{formatTime(TRANSCRIPT[TRANSCRIPT.length - 1].startTime)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff8f0', borderRadius: '12px', border: '1px solid #e9d8c2', overflow: 'hidden', boxShadow: '0 2px 12px rgba(139,94,60,0.10)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <div ref={playerContainerRef} style={{ position: 'absolute', inset: 0 }} />
              {!ytReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5ece0', gap: '8px' }}>
                  <span style={{ fontSize: '36px' }}>☕</span>
                  <span style={{ color: '#9d7b6a', fontSize: '13px' }}>영상 불러오는 중...</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#fff8f0', borderRadius: '12px', border: '1px solid #e9d8c2', padding: '14px', boxShadow: '0 2px 12px rgba(139,94,60,0.08)' }}>
            <div style={{ display: 'flex', background: '#f0e8d8', borderRadius: '10px', padding: '3px', gap: '3px', marginBottom: '12px' }}>
              {[{ key: false, icon: '📺', label: 'YouTube 모드' }, { key: true, icon: '🔊', label: 'TTS 읽기 모드' }].map(({ key, icon, label }) => (
                <button
                  key={String(key)}
                  onClick={() => { setTtsMode(key as boolean); if (!key) stopTts(); }}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: ttsMode === key ? '#8b5e3c' : 'transparent', color: ttsMode === key ? 'white' : '#8b5e3c', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {ttsMode && (
              <>
                <button
                  onClick={() => isTtsSpeaking ? stopTts() : readFromSegment(currentSegmentId)}
                  style={{ width: '100%', padding: '10px', background: isTtsSpeaking ? '#8b3a3a' : '#8b5e3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}
                >
                  {isTtsSpeaking ? '⏹ 정지' : '▶ 여기서부터 읽기'}
                </button>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9d7b6a', marginBottom: '4px' }}>
                    <span>읽기 속도</span>
                    <span>{ttsSpeed < 0.75 ? '🐢 느리게' : ttsSpeed < 1.0 ? '👟 보통' : '🐇 빠르게'}</span>
                  </div>
                  <input type="range" min="0.6" max="1.1" step="0.25" value={ttsSpeed} onChange={(e) => setTtsSpeed(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#8b5e3c' }} />
                </div>
              </>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8b5e3c', cursor: 'pointer', paddingTop: ttsMode ? '10px' : '0', borderTop: ttsMode ? '1px solid #e9d8c2' : 'none' }}>
              <input type="checkbox" checked={showKorean} onChange={(e) => setShowKorean(e.target.checked)} style={{ accentColor: '#8b5e3c' }} />
              한국어 번역 보기
            </label>
          </div>

          <div style={{ background: '#fff8f0', borderRadius: '12px', border: '1px solid #e9d8c2', padding: '14px', boxShadow: '0 2px 12px rgba(139,94,60,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#9d7b6a', marginBottom: '8px' }}>🎵 현재 구간</div>
            <div style={{ fontSize: '15px', color: '#3d2b1f', fontFamily: 'Noto Serif JP, serif', lineHeight: '2', marginBottom: '8px' }}>
              {TRANSCRIPT[currentSegmentId]?.text}
            </div>
            {showKorean && (
              <div style={{ fontSize: '12px', color: '#9d7b6a', fontStyle: 'italic', borderTop: '1px solid #e9d8c2', paddingTop: '6px' }}>
                {TRANSCRIPT[currentSegmentId]?.korean}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#fff8f0', borderRadius: '12px', border: '1px solid #e9d8c2', boxShadow: '0 2px 12px rgba(139,94,60,0.10)', padding: '14px', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', position: 'sticky', top: '76px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e9d8c2' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#8b5e3c' }}>📜 트랜스크립트</h2>
            <span style={{ fontSize: '11px', color: '#9d7b6a' }}>💡 단어 클릭 → 의미 확인</span>
          </div>
          <div ref={transcriptRef} style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
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
