import React, { useState } from 'react';
import { GOOGLE_MAPS_KEY } from '@/config/api';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';

interface GoogleMapEmbedProps {
  latitude: number;
  longitude: number;
  address: string;
  eventTitle: string;
}

const GoogleMapEmbed: React.FC<GoogleMapEmbedProps> = ({
  latitude,
  longitude,
  address,
  eventTitle,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Google Maps Embed API URL
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${latitude},${longitude}&zoom=15`;

  // Google Maps Directions URL (opens in new tab)
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  // Google Maps search URL (opens location in Google Maps)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  // Fallback if no API key configured
  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Location Information</h3>
        <p className="text-gray-600 mb-4">{address}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <ExternalLink className="w-4 h-4" />
          View on Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
        {!mapLoaded ? (
          // Placeholder with "Load Map" button (click-to-load to save API quota)
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center">
            <div className="text-center max-w-md px-6">
              <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                View Location Map
              </h3>
              <p className="text-gray-600 mb-6">
                Click below to load the interactive map showing the event location
              </p>
              <button
                onClick={() => setMapLoaded(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg font-medium"
              >
                <MapPin className="w-5 h-5" />
                Load Interactive Map
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Powered by Google Maps
              </p>
            </div>
          </div>
        ) : (
          // Actual Google Maps iframe
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0"
            title={`Map showing location of ${eventTitle}`}
          />
        )}
      </div>

      {/* Location Info & Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h4 className="font-semibold text-gray-900">{eventTitle}</h4>
            </div>
            <p className="text-gray-600 text-sm">{address}</p>
            {latitude && longitude && (
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition whitespace-nowrap text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Maps
            </a>
          </div>
        </div>
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Getting There</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Click "Get Directions" for turn-by-turn navigation from your location</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Save time by checking traffic conditions before you leave</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Consider arriving 15-30 minutes early for parking and check-in</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleMapEmbed;
