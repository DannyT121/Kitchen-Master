// Kitchen Master palette: basil greens with a saffron highlight, like a market stall.
export const colors = {
  bg: '#F2F5EC',        // pale sage page
  surface: '#FFFFFF',
  basil: '#1F5E3B',     // primary actions, headers
  basilSoft: '#DCEBDD', // selected chips, soft fills
  saffron: '#F2B705',   // the single highlight (scan plate ring, badges)
  saffronSoft: '#FFF2C7',
  ink: '#18241D',
  muted: '#5E6E63',
  line: '#D5DDD0',
  danger: '#B3402A',
  dangerSoft: '#FBE6E1',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.ink },
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.ink },
  heading: { fontSize: 16, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
};
