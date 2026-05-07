import mongoose, { Document, Schema } from "mongoose";

export interface IGalleryImage {
  url: string;
  caption?: string;
  order: number;
  size: "small" | "medium" | "large";
}

export interface IGallery extends Document {
  eventId: mongoose.Types.ObjectId;
  type: "grid" | "messy";
  images: IGalleryImage[];
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new Schema<IGallery>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    type: {
      type: String,
      enum: ["grid", "messy"],
      default: "grid",
    },
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String, maxlength: 200 },
        order: { type: Number, default: 0 },
        size: {
          type: String,
          enum: ["small", "medium", "large"],
          default: "medium",
        },
      },
    ],
  },
  { timestamps: true },
);

gallerySchema.index({ eventId: 1 });

const Gallery = mongoose.model<IGallery>("Gallery", gallerySchema);
export default Gallery;
