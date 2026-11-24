# ARY Services — Requirements Contract

## Core Architectural Guarantees
1. **Zero Raw-IP Network Calls**: Client applications must never attempt unencrypted direct IP requests (`http://...:4000/api`) in production. All production traffic routes through `https://aryservices.adksoftwares.com/api`.
2. **Capacitor Mobile Isolation**: Because Capacitor webviews serve from `http://localhost` or `capacitor://localhost`, all API requests must resolve explicitly against `API_BASE`.
3. **Backend Immutability Safety**: Backend API server entrypoint `server/src/server.js` maintains strict architecture contracts and must remain intact without arbitrary ad-hoc overrides.
4. **WCAG Accessibility & High Contrast**: Touch targets must maintain >= 48px on mobile viewports. Dark Luxury mode must maintain >= 4.5:1 text contrast on OLED `#000000` / `#050811` surfaces.
5. **Multi-Language Parity**: Tamil (`ta`), Sinhala (`si`), and English (`en`) strings must render without text truncation, layout breakages, or overlapping glyphs.
