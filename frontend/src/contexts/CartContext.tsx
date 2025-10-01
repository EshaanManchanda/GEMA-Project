import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  applyCoupon,
  removeCoupon,
  selectCartItems,
  selectCartSummary,
  selectAppliedCoupon,
  selectCartItemsCount,
  CartItem
} from '../store/slices/cartSlice';
import { toast } from 'react-hot-toast';

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartSummary: {
    subtotal: number;
    tax: number;
    serviceFee: number;
    discount: number;
    total: number;
    currency: string;
  };
  coupon: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null;
  addItemToCart: (event: any, quantity: number) => void;
  removeItemFromCart: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  applyCouponCode: (code: string) => boolean;
  removeCouponCode: () => void;
  isValidCoupon: (code: string) => boolean;
  isItemInCart: (itemId: string, selectedDate?: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

// Mock coupon codes for demo purposes
const VALID_COUPONS = [
  { code: 'WELCOME10', discount: 10, type: 'percentage' as const },
  { code: 'SUMMER20', discount: 20, type: 'percentage' as const },
  { code: 'FLAT50', discount: 50, type: 'fixed' as const }
];

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartSummary = useAppSelector(selectCartSummary);
  const coupon = useAppSelector(selectAppliedCoupon);
  const cartCount = useAppSelector(selectCartItemsCount);

  const addItemToCart = (event: any, quantity: number) => {
    // Note: Toast notification is handled by the Redux slice
    dispatch(addToCart({
      event,
      quantity,
      selectedDate: event.date, // Pass the selected date from the event
      participants: []
    }));
  };

  const removeItemFromCart = (itemId: string) => {
    dispatch(removeFromCart(itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    dispatch(updateQuantity({ itemId, quantity }));
  };

  const isValidCoupon = (code: string): boolean => {
    return VALID_COUPONS.some(coupon => coupon.code === code);
  };

  const applyCouponCode = (code: string): boolean => {
    const couponToApply = VALID_COUPONS.find(coupon => coupon.code === code);
    
    if (couponToApply) {
      dispatch(applyCoupon({
        code: couponToApply.code,
        discount: couponToApply.discount,
        type: couponToApply.type
      }));
      return true;
    }
    
    toast.error('Invalid coupon code');
    return false;
  };

  const removeCouponCode = () => {
    dispatch(removeCoupon());
  };

  const isItemInCart = (itemId: string, selectedDate?: string): boolean => {
    return cartItems.some(item => {
      if (selectedDate) {
        return item.event._id === itemId && item.selectedDate === selectedDate;
      }
      return item.event._id === itemId;
    });
  };

  const value = {
    cartItems,
    cartCount,
    cartSummary,
    coupon,
    addItemToCart,
    removeItemFromCart,
    updateItemQuantity,
    applyCouponCode,
    removeCouponCode,
    isValidCoupon,
    isItemInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;