import { Request, Response, NextFunction } from 'express';
import { Venue } from '../models/index';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../types/index';

export const createVenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name, address, coordinates, capacity, venueType, facilities, checkInGates, accessRules, wifiCredentials } = req.body;
  
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  const vendorId = req.user._id; // Assuming the vendor creating the venue is authenticated

  try {
    const newVenue = await Venue.create({
      name,
      vendorId,
      address,
      coordinates,
      capacity,
      venueType,
      facilities,
      checkInGates,
      accessRules,
      wifiCredentials,
    });

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: newVenue,
    });
  } catch (error) {
    console.error('Error creating venue:', error);
    next(new AppError('Failed to create venue', 500));
  }
};

export const getVenueDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { venueId } = req.params;
  
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  const vendorId = req.user._id; // Assuming authenticated vendor

  try {
    const venue = await Venue.findOne({ _id: venueId, vendorId });

    if (!venue) {
      return next(new AppError('Venue not found or not associated with your vendor account', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Venue details retrieved successfully',
      data: venue,
    });
  } catch (error) {
    console.error('Error retrieving venue details:', error);
    next(new AppError('Failed to retrieve venue details', 500));
  }
};

export const updateVenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { venueId } = req.params;
  const updates = req.body;
  
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  const vendorId = req.user._id;

  try {
    const venue = await Venue.findOneAndUpdate(
      { _id: venueId, vendorId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!venue) {
      return next(new AppError('Venue not found or not associated with your vendor account', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Venue updated successfully',
      data: venue,
    });
  } catch (error) {
    console.error('Error updating venue:', error);
    next(new AppError('Failed to update venue', 500));
  }
};

export const deleteVenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { venueId } = req.params;
  
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  const vendorId = req.user._id;

  try {
    const venue = await Venue.findOneAndDelete({ _id: venueId, vendorId });

    if (!venue) {
      return next(new AppError('Venue not found or not associated with your vendor account', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Venue deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting venue:', error);
    next(new AppError('Failed to delete venue', 500));
  }
};