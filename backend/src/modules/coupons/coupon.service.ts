import mongoose from "mongoose";
import Coupon from "./coupon.model";
import { AppError } from "../../middleware/index";
import logger from "../../config/logger";

export interface CouponValidationResult {
  isValid: boolean;
  coupon: {
    id: string;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
  };
  discountAmount: number;
  finalAmount: number;
}

export class CouponService {
  static async validateCoupon(
    code: string,
    userId: string,
    orderAmount: number,
    eventIds: string[] = [],
  ): Promise<CouponValidationResult> {
    const coupon = await Coupon.findByCode(code);
    if (!coupon) {
      throw new AppError("Invalid coupon code", 404);
    }

    const isValidForUser = await coupon.isValidForUser(
      new mongoose.Types.ObjectId(userId),
    );
    if (!isValidForUser) {
      throw new AppError("Coupon is not valid for this user", 400);
    }

    let events: any[] = [];
    if (eventIds.length > 0) {
      const Event = require("../../models/Event").default;
      events = await Event.find({ _id: { $in: eventIds } }).select(
        "category vendorId type price",
      );
    }

    const isValidForOrder = coupon.isValidForOrder(
      orderAmount,
      eventIds.map((id) => new mongoose.Types.ObjectId(id)),
      events,
    );
    if (!isValidForOrder) {
      throw new AppError("Coupon is not applicable to this order", 400);
    }

    const discountAmount = coupon.calculateDiscount(orderAmount);

    return {
      isValid: true,
      coupon: {
        id: coupon._id.toString(),
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
      },
      discountAmount,
      finalAmount: Math.max(0, orderAmount - discountAmount),
    };
  }

  static async applyCoupon(
    couponId: string,
    orderId: string,
    userId: string,
  ): Promise<{ discountAmount: number }> {
    const Order = mongoose.model("Order");
    const [coupon, order] = await Promise.all([
      Coupon.findById(couponId),
      Order.findById(orderId),
    ]);

    if (!coupon) {
      throw new AppError("Coupon not found", 404);
    }
    if (!order) {
      throw new AppError("Order not found", 404);
    }
    if (order.userId.toString() !== userId) {
      throw new AppError("Unauthorized access to order", 403);
    }

    const isValidForUser = await coupon.isValidForUser(
      new mongoose.Types.ObjectId(userId),
    );
    if (!isValidForUser) {
      throw new AppError("Coupon is not valid for this user", 400);
    }

    const eventIds = order.items.map((item: any) => item.eventId);

    const Event = require("../../models/Event").default;
    const events = await Event.find({ _id: { $in: eventIds } }).select(
      "category vendorId type price",
    );

    const isValidForOrder = coupon.isValidForOrder(
      order.subtotal,
      eventIds,
      events,
    );
    if (!isValidForOrder) {
      throw new AppError("Coupon is not applicable to this order", 400);
    }

    const discountAmount = coupon.calculateDiscount(order.subtotal);

    order.couponCode = coupon.code;
    order.couponDiscount = discountAmount;
    await order.save();

    await coupon.incrementUsage(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(orderId),
      discountAmount,
    );

    logger.info("Coupon applied to order", {
      couponCode: coupon.code,
      orderId,
      discountAmount,
    });

    return { discountAmount };
  }

  static async calculateDiscount(
    code: string,
    orderAmount: number,
  ): Promise<number> {
    const coupon = await Coupon.findByCode(code);
    if (!coupon) {
      throw new AppError("Invalid coupon code", 404);
    }
    return coupon.calculateDiscount(orderAmount);
  }
}
