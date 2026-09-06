import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppButton } from '../src/components/ui/app-button';

describe('<AppButton />', () => {
  test('runs the command when pressed', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Đặt món" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Đặt món' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not run while loading', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Đặt món" loading onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Đặt món' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
