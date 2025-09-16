import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Event } from '@types/event';
import { toast } from 'react-hot-toast';

export interface CartItem {
  id: string;
  event: Event;
  quantity: number;
  selectedDate?: string;
  selectedTimeSlot?: string;
  participants: {
    name: string;
    age: number;
    specialRequirements?: string;
  }[];
  unitPrice: number;
  totalPrice: number;
  currency: string;
  addedAt: string;
}

export interface CartSummary {
  subtotal: number;
  tax: number;
  serviceFee: number;
  discount: number;
  total: number;
  currency: string;
}

interface CartState {
  items: CartItem[];
  summary: CartSummary;
  appliedCoupon: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  summary: {
    subtotal: 0,
    tax: 0,
    serviceFee: 0,
    discount: 0,
    total: 0,
    currency: 'AED',
  },
  appliedCoupon: null,
  isLoading: false,
  error: null,
};

// Helper functions
const calculateItemTotal = (item: CartItem): number => {
  return item.unitPrice * item.quantity;
};

const calculateCartSummary = (items: CartItem[], appliedCoupon: CartState['appliedCoupon']): CartSummary => {
  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const serviceFee = subtotal * 0.05; // 5% service fee
  const tax = (subtotal + serviceFee) * 0.05; // 5% tax
  
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = subtotal * (appliedCoupon.discount / 100);
    } else {
      discount = appliedCoupon.discount;
    }
  }
  
  const total = Math.max(0, subtotal + serviceFee + tax - discount);
  
  return {
    subtotal,
    tax,
    serviceFee,
    discount,
    total,
    currency: items[0]?.currency || 'AED',
  };
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{
      event: Event;
      quantity: number;
      selectedDate?: string;
      selectedTimeSlot?: string;
      participants: CartItem['participants'];
    }>) => {
      const { event, quantity, selectedDate, selectedTimeSlot, participants } = action.payload;
      
      // Check if item already exists in cart
      const existingItemIndex = state.items.findIndex(
        item => item.event._id === event._id && 
                item.selectedDate === selectedDate && 
                item.selectedTimeSlot === selectedTimeSlot
      );
      
      const unitPrice = event.pricing?.basePrice || event.price || 0;
      const totalPrice = unitPrice * quantity;
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const existingItem = state.items[existingItemIndex];
        existingItem.quantity += quantity;
        existingItem.participants = [...existingItem.participants, ...participants];
        existingItem.totalPrice = calculateItemTotal(existingItem);
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${event._id}-${selectedDate}-${selectedTimeSlot}-${Date.now()}`,
          event,
          quantity,
          selectedDate,
          selectedTimeSlot,
          participants,
          unitPrice,
          totalPrice,
          currency: event.pricing?.currency || event.currency || 'AED',
          addedAt: new Date().toISOString(),
        };
        state.items.push(newItem);
      }
      
      // Recalculate summary
      state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      
      toast.success('Added to cart!');
    },
    
    removeFromCart: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      state.items = state.items.filter(item => item.id !== itemId);
      
      // Recalculate summary
      state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      
      toast.success('Removed from cart');
    },
    
    updateQuantity: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          state.items = state.items.filter(item => item.id !== itemId);
          toast.success('Removed from cart');
        } else {
          item.quantity = quantity;
          item.totalPrice = calculateItemTotal(item);
        }
        
        // Recalculate summary
        state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      }
    },
    
    updateParticipants: (state, action: PayloadAction<{ itemId: string; participants: CartItem['participants'] }>) => {
      const { itemId, participants } = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        item.participants = participants;
        item.quantity = participants.length;
        item.totalPrice = calculateItemTotal(item);
        
        // Recalculate summary
        state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      }
    },
    
    applyCoupon: (state, action: PayloadAction<{
      code: string;
      discount: number;
      type: 'percentage' | 'fixed';
    }>) => {
      state.appliedCoupon = action.payload;
      state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      toast.success(`Coupon "${action.payload.code}" applied!`);
    },
    
    removeCoupon: (state) => {
      const couponCode = state.appliedCoupon?.code;
      state.appliedCoupon = null;
      state.summary = calculateCartSummary(state.items, null);
      if (couponCode) {
        toast.success(`Coupon "${couponCode}" removed`);
      }
    },
    
    clearCart: (state) => {
      state.items = [];
      state.appliedCoupon = null;
      state.summary = initialState.summary;
      state.error = null;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    updateCurrency: (state, action: PayloadAction<string>) => {
      const newCurrency = action.payload;
      
      // Update currency for all items and summary
      state.items.forEach(item => {
        item.currency = newCurrency;
      });
      
      state.summary.currency = newCurrency;
    },
    
    syncCartWithServer: (state, action: PayloadAction<CartItem[]>) => {
      // Sync cart with server data (useful after login)
      state.items = action.payload;
      state.summary = calculateCartSummary(state.items, state.appliedCoupon);
    },
    
    moveToWishlist: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        state.items = state.items.filter(item => item.id !== itemId);
        state.summary = calculateCartSummary(state.items, state.appliedCoupon);
        toast.success('Moved to wishlist');
      }
    },
    
    validateCartItems: (state) => {
      // Remove items that are no longer available or have invalid data
      const validItems = state.items.filter(item => {
        // Check if event is still active and available
        if (item.event.status !== 'active') {
          toast.error(`"${item.event.title}" is no longer available`);
          return false;
        }
        
        // Check if selected date is still valid
        if (item.selectedDate) {
          const selectedDate = new Date(item.selectedDate);
          const now = new Date();
          if (selectedDate < now) {
            toast.error(`"${item.event.title}" date has passed`);
            return false;
          }
        }
        
        return true;
      });
      
      if (validItems.length !== state.items.length) {
        state.items = validItems;
        state.summary = calculateCartSummary(state.items, state.appliedCoupon);
      }
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateParticipants,
  applyCoupon,
  removeCoupon,
  clearCart,
  setLoading,
  setError,
  updateCurrency,
  syncCartWithServer,
  moveToWishlist,
  validateCartItems,
} = cartSlice.actions;

export default cartSlice.reducer;

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartSummary = (state: { cart: CartState }) => state.cart.summary;
export const selectAppliedCoupon = (state: { cart: CartState }) => state.cart.appliedCoupon;
export const selectCartLoading = (state: { cart: CartState }) => state.cart.isLoading;
export const selectCartError = (state: { cart: CartState }) => state.cart.error;

// Helper selectors
export const selectCartItemsCount = (state: { cart: CartState }) => {
  return state.cart.items.reduce((total, item) => total + item.quantity, 0);
};

export const selectCartTotal = (state: { cart: CartState }) => {
  return state.cart.summary.total;
};

export const selectCartSubtotal = (state: { cart: CartState }) => {
  return state.cart.summary.subtotal;
};

export const selectIsItemInCart = (eventId: string, selectedDate?: string, selectedTimeSlot?: string) => (
  state: { cart: CartState }
) => {
  return state.cart.items.some(
    item => item.event._id === eventId && 
            item.selectedDate === selectedDate && 
            item.selectedTimeSlot === selectedTimeSlot
  );
};

export const selectCartItemById = (itemId: string) => (state: { cart: CartState }) => {
  return state.cart.items.find(item => item.id === itemId);
};

export const selectCartItemsByEvent = (eventId: string) => (state: { cart: CartState }) => {
  return state.cart.items.filter(item => item.event._id === eventId);
};

export const selectCartCurrency = (state: { cart: CartState }) => {
  return state.cart.summary.currency;
};

export const selectIsCartEmpty = (state: { cart: CartState }) => {
  return state.cart.items.length === 0;
};

export const selectCartValidation = (state: { cart: CartState }) => {
  const hasExpiredItems = state.cart.items.some(item => {
    if (item.selectedDate) {
      const selectedDate = new Date(item.selectedDate);
      const now = new Date();
      return selectedDate < now;
    }
    return false;
  });
  
  const hasInactiveItems = state.cart.items.some(item => item.event.status !== 'active');
  
  return {
    isValid: !hasExpiredItems && !hasInactiveItems,
    hasExpiredItems,
    hasInactiveItems,
  };
};