import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { FaTrash, FaMinus, FaPlus, FaArrowLeft, FaShoppingCart } from 'react-icons/fa';
import LoadingSpinner from '@components/common/LoadingSpinner';
import SEO from '../components/common/SEO';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    cartCount,
    cartSummary,
    coupon,
    removeItemFromCart,
    updateItemQuantity,
    applyCouponCode,
    removeCouponCode,
    isValidCoupon
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateItemQuantity(itemId, newQuantity);
    } else {
      removeItemFromCart(itemId);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemFromCart(itemId);
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    // Simulate API call delay
    setTimeout(() => {
      const isValid = isValidCoupon(couponCode);
      if (isValid) {
        applyCouponCode(couponCode);
        setCouponCode('');
      } else {
        setCouponError('Invalid or expired coupon code');
      }
      setIsApplyingCoupon(false);
    }, 800);
  };

  const handleRemoveCoupon = () => {
    removeCouponCode();
  };

  const handleProceedToCheckout = () => {
    navigate('/checkout');
  };

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/events" className="flex items-center text-primary hover:text-primary-dark mb-6">
            <FaArrowLeft className="mr-2" />
            Continue Shopping
          </Link>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FaShoppingCart className="text-gray-400 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added any events to your cart yet.</p>
            <Link 
              to="/events" 
              className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Shopping Cart | Gema Events"
        description="Review your selected events and proceed to checkout."
        noIndex={true}
        noFollow={true}
      />
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/events" className="flex items-center text-primary hover:text-primary-dark mb-6">
          <FaArrowLeft className="mr-2" />
          Continue Shopping
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="border-b border-gray-200 last:border-0 p-6">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-24 sm:h-24 mb-4 sm:mb-0 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow sm:ml-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                          <div className="text-sm text-gray-600 mb-2">
                            <div>{new Date(item.date).toLocaleDateString()} • {item.time}</div>
                            <div>{item.location}</div>
                            <div>Organizer: {item.organizer}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">${item.price ? item.price.toFixed(2) : '0.00'}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center">
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <FaMinus className="text-gray-600 text-xs" />
                          </button>
                          <span className="mx-3 w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <FaPlus className="text-gray-600 text-xs" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors flex items-center"
                        >
                          <FaTrash className="mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${cartSummary.subtotal ? cartSummary.subtotal.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span>${cartSummary.serviceFee ? cartSummary.serviceFee.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>${cartSummary.tax ? cartSummary.tax.toFixed(2) : '0.00'}</span>
                </div>
                
                {coupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center">
                      Discount ({coupon.code})
                      <button 
                        onClick={handleRemoveCoupon}
                        className="ml-2 text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </span>
                    <span>-${cartSummary.discount ? cartSummary.discount.toFixed(2) : '0.00'}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${cartSummary.total ? cartSummary.total.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
              
              {!coupon && (
                <div className="mb-6">
                  <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Coupon Code
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="coupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="flex-grow px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                      className="bg-primary text-white px-4 py-2 rounded-r-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                    >
                      {isApplyingCoupon ? <LoadingSpinner size="small" /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-sm mt-1">{couponError}</p>}
                </div>
              )}
              
              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-dark transition-colors font-medium"
              >
                Proceed to Checkout
              </button>
              
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>Secure checkout powered by Stripe</p>
                <p className="mt-2">Need help? <a href="#" className="text-primary hover:underline">Contact support</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default CartPage;