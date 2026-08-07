import { render, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('renders the welcome message', async () => {
    await render(<PlaceholderScreen />);

    expect(screen.getByText('Tabletennis Counter')).toBeOnTheScreen();
  });
});
