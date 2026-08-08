import { render, screen, userEvent } from '@testing-library/react-native';

import { MatchDetailScreen } from './MatchDetailScreen';

describe('MatchDetailScreen', () => {
  it('shows the id of the match it was navigated to', async () => {
    await render(<MatchDetailScreen matchId="abc123" onOpenPointCounter={jest.fn()} />);

    expect(screen.getByText('Match abc123')).toBeOnTheScreen();
  });

  it('offers a minimal, direct way into the point counter for the current/active set', async () => {
    const user = userEvent.setup();
    const onOpenPointCounter = jest.fn();
    await render(<MatchDetailScreen matchId="abc123" onOpenPointCounter={onOpenPointCounter} />);

    await user.press(screen.getByRole('button', { name: 'Punkte zählen' }));

    expect(onOpenPointCounter).toHaveBeenCalledWith('abc123');
  });
});
