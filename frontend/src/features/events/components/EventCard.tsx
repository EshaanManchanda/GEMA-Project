import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Star } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { cn } from '@shared/utils/cn';

interface EventCardProps {
  id: string;
  title: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  location?: { city?: string; address?: string };
  price?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  attendeeCount?: number;
  category?: string;
  isFeatured?: boolean;
  className?: string;
}

export function EventCard({
  id, title, description, image, startDate, location,
  price, currency = 'AED', rating, reviewCount, attendeeCount,
  category, isFeatured, className,
}: EventCardProps) {
  const formattedDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const formattedPrice = price !== undefined
    ? price === 0 ? 'Free' : `${currency} ${price.toLocaleString()}`
    : null;

  return (
    <Card className={cn('overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5', className)}>
      <Link to={`/events/${id}`} className="block">
        {/* Image */}
        <div className="relative aspect-video bg-gray-100 overflow-hidden">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Calendar className="h-8 w-8" />
            </div>
          )}
          {isFeatured && (
            <Badge variant="primary" className="absolute top-2 left-2">Featured</Badge>
          )}
          {category && (
            <Badge variant="default" className="absolute top-2 right-2">{category}</Badge>
          )}
          {formattedPrice && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-medium">
              {formattedPrice}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
          )}

          <div className="space-y-1.5 text-sm text-gray-500">
            {formattedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
            )}
            {location?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{location.city}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {rating !== undefined && rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                  {reviewCount !== undefined && reviewCount > 0 && (
                    <span className="text-gray-400">({reviewCount})</span>
                  )}
                </div>
              )}
              {attendeeCount !== undefined && attendeeCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{attendeeCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
