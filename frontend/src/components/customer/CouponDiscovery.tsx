import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search,
  Tag,
  Percent,
  DollarSign,
  Truck,
  Clock,
  Copy,
  Check,
  Gift,
  Star,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import { fetchActiveCoupons, validateCoupon } from '../../store/slices/couponsSlice';
import { RootState, AppDispatch } from '../../store';

interface CouponDiscoveryProps {
  orderAmount?: number;
  eventIds?: string[];
  onCouponSelect?: (coupon: any) => void;
  showTitle?: boolean;
}

const CouponDiscovery: React.FC<CouponDiscoveryProps> = ({
  orderAmount,
  eventIds = [],
  onCouponSelect,
  showTitle = true
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeCoupons, loading, error } = useSelector((state: RootState) => state.coupons);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchActiveCoupons());
  }, [dispatch]);

  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => setCopiedCode(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Coupon code copied!');
  };

  const handleValidateCoupon = async (code: string) => {
    if (orderAmount) {
      try {
        await dispatch(validateCoupon({
          code,
          orderAmount,
          eventIds
        })).unwrap();
        onCouponSelect?.(code);
      } catch (error) {
        toast.error('Coupon is not valid for this order');
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_shipping':
        return <Truck className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getDiscountDisplay = (coupon: any) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}% OFF`;
      case 'fixed_amount':
        return `${coupon.currency || 'AED'} ${coupon.value} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      default:
        return 'DISCOUNT';
    }
  };

  const getDaysLeft = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isValidForOrder = (coupon: any) => {
    if (!orderAmount) return true;

    // Check minimum amount
    if (coupon.minimumAmount && orderAmount < coupon.minimumAmount) {
      return false;
    }

    // Check applicable events
    if (coupon.applicableEvents?.length > 0 && eventIds.length > 0) {
      return eventIds.some(id => coupon.applicableEvents.includes(id));
    }

    // Check excluded events
    if (coupon.excludedEvents?.length > 0 && eventIds.length > 0) {
      return !eventIds.some(id => coupon.excludedEvents.includes(id));
    }

    return true;
  };

  const filteredCoupons = activeCoupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || coupon.type === selectedType;
    const validForOrder = isValidForOrder(coupon);

    return matchesSearch && matchesType && validForOrder;
  });

  const featuredCoupons = filteredCoupons.filter(coupon => coupon.featured || coupon.value >= 20);
  const regularCoupons = filteredCoupons.filter(coupon => !coupon.featured && coupon.value < 20);

  if (loading.list) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading available coupons...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Coupons</h2>
          <p className="text-gray-600">Save more on your order with these exclusive deals</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="percentage">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
              </select>

              {(searchTerm || selectedType) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('');
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Featured Coupons */}
      {featuredCoupons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Featured Deals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCoupons.map((coupon) => (
              <CouponCard
                key={coupon._id}
                coupon={coupon}
                onCopy={handleCopyCode}
                onValidate={handleValidateCoupon}
                copiedCode={copiedCode}
                orderAmount={orderAmount}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Coupons */}
      {regularCoupons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Gift className="w-5 h-5 text-blue-500 mr-2" />
            All Coupons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularCoupons.map((coupon) => (
              <CouponCard
                key={coupon._id}
                coupon={coupon}
                onCopy={handleCopyCode}
                onValidate={handleValidateCoupon}
                copiedCode={copiedCode}
                orderAmount={orderAmount}
              />
            ))}
          </div>
        </div>
      )}

      {filteredCoupons.length === 0 && !loading.list && (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No coupons available</h3>
          <p className="text-gray-500">
            {searchTerm || selectedType
              ? 'Try adjusting your filters to see more coupons'
              : 'Check back later for new deals and discounts'
            }
          </p>
        </div>
      )}
    </div>
  );
};

interface CouponCardProps {
  coupon: any;
  onCopy: (code: string) => void;
  onValidate: (code: string) => void;
  copiedCode: string;
  orderAmount?: number;
  featured?: boolean;
}

const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  onCopy,
  onValidate,
  copiedCode,
  orderAmount,
  featured = false
}) => {
  const daysLeft = getDaysLeft(coupon.validUntil);
  const isExpiringSoon = daysLeft <= 3;
  const isCopied = copiedCode === coupon.code;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_shipping':
        return <Truck className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getDiscountDisplay = (coupon: any) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}% OFF`;
      case 'fixed_amount':
        return `${coupon.currency || 'AED'} ${coupon.value} OFF`;
      case 'free_shipping':
        return 'FREE SHIPPING';
      default:
        return 'DISCOUNT';
    }
  };

  const getDaysLeft = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className={`relative overflow-hidden ${featured ? 'border-yellow-300 shadow-lg' : ''}`}>
      {featured && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-400 text-white px-3 py-1 text-xs font-bold">
          FEATURED
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${
              coupon.type === 'percentage' ? 'bg-blue-100 text-blue-600' :
              coupon.type === 'fixed_amount' ? 'bg-green-100 text-green-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              {getTypeIcon(coupon.type)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{coupon.name}</h4>
              <p className="text-sm text-gray-500">{coupon.code}</p>
            </div>
          </div>

          {isExpiringSoon && (
            <Badge variant="warning" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              {daysLeft}d left
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {getDiscountDisplay(coupon)}
          </div>
          {coupon.description && (
            <p className="text-sm text-gray-600">{coupon.description}</p>
          )}
        </div>

        {coupon.minimumAmount && (
          <div className="text-xs text-gray-500 text-center">
            Min. order: {coupon.currency || 'AED'} {coupon.minimumAmount}
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onCopy(coupon.code)}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy Code
              </>
            )}
          </Button>

          {orderAmount && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onValidate(coupon.code)}
            >
              Apply
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Expires {new Date(coupon.validUntil).toLocaleDateString()}
          </div>
          {coupon.usageLimit && (
            <div>
              {coupon.usageLimit - coupon.usageCount} left
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CouponDiscovery;