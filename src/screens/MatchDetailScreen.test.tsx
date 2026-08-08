import { render, screen } from '@testing-library/react-native';

import { MatchDetailScreen } from './MatchDetailScreen';

describe('MatchDetailScreen', () => {
  it('shows the id of the match it was navigated to', async () => {
    await render(<MatchDetailScreen matchId="abc123" />);

    expect(screen.getByText('Match abc123')).toBeOnTheScreen();
  });
});
