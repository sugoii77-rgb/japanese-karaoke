'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface VocabWord {
  word: string;
  reading: string;
  meaning: string;
  addedAt: number;
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [filter, setFilter] = useState('');
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem('vocab');
        setWords(saved ? JSON.parse(saved) : []);
      } catch { setWords([]); }
    };
    load();
    window.addEventListener('vocabUpdated', load);
    return () => window.removeEventListener('vocabUpdated', load);
  }, []);

  const speak = useCallback((word: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingWord(word);
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'ja-JP';
    utt.rate = 0.8;
    utt.onend = () => setSpeakingWord(null);
    window.speechSynthesis.speak(utt);
  }, []);

  const deleteWord = (word: string) => {
    const updated = words.filter((w) => w.word !== word);
    localStorage.setItem('vocab', JSON.stringify(updated));
    setWords(updated);
    window.dispatchEvent(new Event('vocabUpdated'));
  };

  const clearAll = () => {
    if (confirm('모든 단어를 삭제할까요?')) {
      localStorage.setItem('vocab', JSON.stringify([]));
      setWords([]);
      window.dispatchEvent(new Event('vocabUpdated'));
    }
  };

  const filtered = words.filter(
    (w) =>
      w.word.includes(filter) ||
      w.reading.includes(filter) ||
      w.meaning.toLowerCase().includes(filter.toLowerCase())
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#8b5e3c', fontFamily: 'Noto Serif JP, serif', margin: '0 0 4px' }}>
          📖 マイ単語帳
        </h1>
        <p style={{ fontSize: '13px', color: '#9d7b6a', margin: 0 }}>
          내가 모은 일본어 단어 컬렉션 ✨
        </p>
      </div>

      {/* Stats & Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: '#fff8f0', borderRadius: '10px', border: '1px solid #e9d8c2', padding: '10px 16px', flex: 1 }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#8b5e3c' }}>{words.length}</div>
          <div style={{ fontSize: '11px', color: '#9d7b6a' }}>저장된 단어</div>
        </div>
        <Link href="/quiz" style={{ flex: 1, display: 'block', textDecoration: 'none' }}>
          <div style={{ background: '#8b5e3c', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '16px', color: 'white', fontWeight: 'bold' }}>✏️ 퀴즈 풀기</div>
            <div style={{ fontSize: '11px', color: '#e9d8c2', marginTop: '2px' }}>단어 복습하기</div>
          </div>
        </Link>
        {words.length > 0 && (
          <button
            onClick={clearAll}
            style={{ padding: '10px 16px', background: '#fde8e8', color: '#8b3a3a', border: '1px solid #f5c6c6', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
          >
            🗑️ 전체 삭제
          </button>
        )}
      </div>

      {/* Search */}
      {words.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="🔍 단어 검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid #e9d8c2', background: '#fff8f0',
              fontSize: '14px', color: '#3d2b1f', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Word list */}
      {words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9d7b6a' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>아직 단어가 없어요</div>
          <div style={{ fontSize: '13px', marginBottom: '20px' }}>
            카라오케 페이지에서 단어를 클릭하면<br />여기에 저장됩니다!
          </div>
          <Link
            href="/"
            style={{
              display: 'inline-block', padding: '10px 24px',
              background: '#8b5e3c', color: 'white', borderRadius: '10px',
              textDecoration: 'none', fontSize: '14px', fontWeight: 'bold',
            }}
          >
            ☕ 카라오케로 이동
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9d7b6a' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <div>"{filter}"에 해당하는 단어가 없어요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((w, i) => (
            <div
              key={w.word + i}
              style={{
                background: '#fff8f0', borderRadius: '12px', border: '1px solid #e9d8c2',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 1px 6px rgba(139,94,60,0.07)',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              {/* Word */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '24px', color: '#3d2b1f', fontFamily: 'Noto Serif JP, serif', fontWeight: 'bold' }}>
                    {w.word}
                  </span>
                  {w.reading && (
                    <span style={{ fontSize: '14px', color: '#8b5e3c' }}>
                      {w.reading}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#c4a882', marginLeft: 'auto' }}>
                    {formatDate(w.addedAt)}
                  </span>
                </div>
                {w.meaning && (
                  <div style={{ fontSize: '13px', color: '#6b5040', marginTop: '4px' }}>
                    {w.meaning}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => speak(w.word)}
                  title="발음 듣기"
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    border: 'none', cursor: 'pointer',
                    background: speakingWord === w.word ? '#8b5e3c' : '#f0e8d8',
                    color: speakingWord === w.word ? 'white' : '#8b5e3c',
                    fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🔊
                </button>
                <button
                  onClick={() => deleteWord(w.word)}
                  title="삭제"
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    border: 'none', cursor: 'pointer',
                    background: '#fde8e8', color: '#8b3a3a',
                    fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px', background: '#f5ece0', borderRadius: '10px', border: '1px solid #e9d8c2' }}>
          <div style={{ fontSize: '13px', color: '#9d7b6a', marginBottom: '10px' }}>
            {filtered.length}개 단어를 모았어요! 퀴즈로 복습해볼까요? 🌸
          </div>
          <Link
            href="/quiz"
            style={{ display: 'inline-block', padding: '10px 24px', background: '#8b5e3c', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}
          >
            ✏️ 단어 퀴즈 시작
          </Link>
        </div>
      )}
    </div>
  );
}
