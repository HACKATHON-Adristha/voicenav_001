(function () {
  const ORDINAL_MAP = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5
  };

  function ordinalToIndex(word) {
    if (!word) return null;
    const w = word.toLowerCase().trim();
    if (ORDINAL_MAP[w]) return ORDINAL_MAP[w] - 1;
    const n = parseInt(w, 10);
    if (!isNaN(n) && n > 0) return n - 1;
    return null;
  }

  function normalize(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/[“”‘’"']/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function extractAfter(text, keywords) {
    for (const k of keywords) {
      const idx = text.indexOf(k);
      if (idx >= 0) return text.slice(idx + k.length).trim();
    }
    return null;
  }

  function parseCommand(rawText) {
    const original = (rawText || '').toString();
    const text = normalize(original);

    if (!text) return { action: 'none', raw: original };

    if (text.includes('scroll down')) return { action: 'scroll', direction: 'down' };
    if (text.includes('scroll up')) return { action: 'scroll', direction: 'up' };
    if (text.includes('scroll top')) return { action: 'scroll', direction: 'top' };
    if (text.includes('scroll bottom')) return { action: 'scroll', direction: 'bottom' };

    if (text.includes('read selection')) return { action: 'read', target: 'selection' };
    if (text.includes('read page') || text.includes('read this')) return { action: 'read', target: 'visible' };

    if (text.includes('go back')) return { action: 'navigate', to: 'back' };
    if (text.includes('go forward')) return { action: 'navigate', to: 'forward' };

    if (text.includes('find') || text.includes('search')) {
      const query = extractAfter(text, ['find ', 'search ', 'search for ']);
      return { action: 'find', query: query || '' };
    }

    if (text.includes('open link')) {
      const ordMatch = text.match(/(first|second|third|\d+|1st|2nd|3rd)/);
      const idx = ordMatch ? ordinalToIndex(ordMatch[0]) : 0;
      const byText = extractAfter(text, ['open link that says', 'open link with text']);
      return { action: 'open', whichIndex: idx ?? 0, byText: byText || null };
    }

    if (text.includes('stop') || text.includes('pause')) return { action: 'stop' };

    return { action: 'read', target: 'visible', raw: original };
  }

  window.VoiceNav = { parseCommand, ordinalToIndex };
})();
