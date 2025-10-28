import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded';
  readAt?: Date;
  respondedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContactModel extends Model<IContact> {
  getContactStats(): Promise<any>;
}

const contactSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address'
      }
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      enum: {
        values: ['General Inquiry', 'Booking Support', 'Vendor Partnership', 'Technical Support', 'Feedback', 'Other'],
        message: 'Invalid subject selection'
      }
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters long'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['new', 'read', 'responded'],
      default: 'new'
    },
    readAt: {
      type: Date
    },
    respondedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient querying
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Static method to get contact statistics
contactSchema.statics.getContactStats = async function(): Promise<any> {
  const stats = await this.aggregate([
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        totalCount: [
          {
            $count: 'total'
          }
        ],
        subjectCounts: [
          {
            $group: {
              _id: '$subject',
              count: { $sum: 1 }
            }
          }
        ],
        recentContacts: [
          {
            $sort: { createdAt: -1 }
          },
          {
            $limit: 10
          }
        ]
      }
    }
  ]);

  return stats[0] || {};
};

const Contact = mongoose.model<IContact, IContactModel>('Contact', contactSchema);

export default Contact;
