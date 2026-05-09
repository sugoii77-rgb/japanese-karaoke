'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/', label: '☕ カラオケ', labelKo: '카라오케' },
  { href: '/vocabulary', label: '📖 単語帳', labelKo: '단어장' },
  { href: '/quiz', label: '✏️ クイズ', labelKo: '퀴즈' },
  { href: '/jlpt', label: '🎌 JLPT N3', labelKo: 'JLPT' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    const update = () => {
      try {
        const saved = localStorage.getItem('vocab');
        const words = saved ? JSON.parse(saved) : [];
        setVocabCount(words.length);
      } catch {
        setVocabCount(0);
      }
    };
    update();
    window.addEventListener('vocabUpdated', update);
    return () => window.removeEventListener('vocabUpdated', update);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(255, 248, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e9d8c2',
        boxShadow: '0 2px 12px rgba(139, 94, 60, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🇯🇵</span>
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#8b5e3c',
                lineHeight: 1.2,
                fontFamily: 'Noto Serif JP, serif',
              }}
            >
              マイの日本語
            </div>
            <div style={{ fontSize: '10px', color: '#9d7b6a', lineHeight: 1 }}>
              마이의 일본어 팟캐스트
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  color: isActive ? '#fff' : '#8b5e3c',
                  background: isActive ? '#8b5e3c' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'relative',
                }}
              >
                {item.label}
                {item.href === '/vocabulary' && vocabCount > 0 && (
                  <span
                    style={{
                      background: '#d4a373',
                      color: 'white',
                      fontSize: '10px',
                      borderRadius: '10px',
                      padding: '1px 5px',
                      marginLeft: '2px',
                    }}
                  >
                    {vocabCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
