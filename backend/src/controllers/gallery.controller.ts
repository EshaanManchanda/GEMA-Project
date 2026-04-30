import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Gallery from "../models/Gallery";
import Event from "../models/Event";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";

export const createGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, type, images } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return next(new AppError("Event not found", 404));

    const gallery = await Gallery.create({ eventId, type: type || "grid", images: images || [] });

    await Event.findByIdAndUpdate(eventId, { galleryId: gallery._id });

    res.status(201).json({ success: true, data: { gallery } });
  } catch (error) {
    next(error);
  }
};

export const updateGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { type, images } = req.body;

    const gallery = await Gallery.findByIdAndUpdate(
      id,
      { ...(type && { type }), ...(images && { images }) },
      { new: true, runValidators: true },
    );

    if (!gallery) return next(new AppError("Gallery not found", 404));

    res.status(200).json({ success: true, data: { gallery } });
  } catch (error) {
    next(error);
  }
};

export const getGalleryByEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return next(new AppError("Invalid event ID", 400));
    }

    const event = await Event.findById(eventId).select("isDeleted").lean();
    if (!event || (event as any).isDeleted) {
      return next(new AppError("Event not found", 404));
    }

    const gallery = await Gallery.findOne({ eventId });
    if (!gallery) return next(new AppError("Gallery not found", 404));

    res.status(200).json({ success: true, data: { gallery } });
  } catch (error) {
    next(error);
  }
};

export const deleteGallery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const gallery = await Gallery.findByIdAndDelete(id);
    if (!gallery) return next(new AppError("Gallery not found", 404));

    await Event.findByIdAndUpdate(gallery.eventId, { $unset: { galleryId: 1 } });

    res.status(200).json({ success: true, message: "Gallery deleted" });
  } catch (error) {
    next(error);
  }
};
