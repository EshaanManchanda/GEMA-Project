import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

const BookingTestPage: React.FC = () => {
  const navigate = useNavigate();

  const testEventId = '68b2d0d63293690deba680a6';

  const handleTestBooking = () => {
    navigate(`/booking/${testEventId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Booking System Test</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Test the booking page with the specific event ID:
          </p>
          <code className="block p-2 bg-gray-100 rounded text-sm">
            {testEventId}
          </code>
          <Button 
            onClick={handleTestBooking}
            variant="primary"
            fullWidth
          >
            Test Booking Page
          </Button>
          <p className="text-xs text-gray-500">
            This will navigate to: /booking/{testEventId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingTestPage;