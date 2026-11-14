/**
 * BookingConfirmation: the online-meeting link is private to people who booked, so the public
 * event data no longer carries it. The confirmation screen must not link to a meeting URL; it
 * points to the confirmation email and My Bookings instead.
 */
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import BookingConfirmation from '../BookingConfirmation';

jest.mock('../../../services/api/ticketAPI', () => ({ __esModule: true, default: {} }));
jest.mock('../../../utils/ticketDownload', () => ({ downloadMultipleTickets: jest.fn() }));
jest.mock('../QRCodeModal', () => ({ __esModule: true, default: () => null }));

const MEETING_URL = 'https://meet.example.com/private-room';

const renderConfirmation = (event: Record<string, unknown>) =>
  render(
    <Provider store={configureStore({ reducer: { bookings: (state: object = {}) => state } })}>
      <MemoryRouter>
        <BookingConfirmation
          event={{ title: 'Robotics', category: 'Technology', price: 100, currency: 'AED', ...event } as any}
          onComplete={jest.fn()}
        />
      </MemoryRouter>
    </Provider>,
  );

describe('BookingConfirmation for an online event', () => {
  it('points to the confirmation email and My Bookings for the joining details', () => {
    renderConfirmation({ venueType: 'Online' });

    expect(screen.getByText(/your joining details are in your confirmation email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Bookings' })).toHaveAttribute('href', '/bookings');
  });

  it('never links to a meeting URL, even if one is present on the event object', () => {
    const { container } = renderConfirmation({ venueType: 'Online', meetingLink: MEETING_URL });

    expect(container.querySelector(`a[href="${MEETING_URL}"]`)).toBeNull();
    expect(screen.queryByText(/join meeting/i)).not.toBeInTheDocument();
  });
});

describe('BookingConfirmation for an in-person event', () => {
  it('shows no online-meeting note', () => {
    renderConfirmation({ venueType: 'Offline' });

    expect(screen.queryByText(/joining details/i)).not.toBeInTheDocument();
  });
});
