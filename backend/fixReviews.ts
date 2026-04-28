import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Using URI: ' + uri);
mongoose.connect(uri).then(async () => {
    const collections = await mongoose.connection.db.collections();
    const reviewsCollection = collections.find(c => c.collectionName === 'reviews');
    if (reviewsCollection) {
        const res = await reviewsCollection.updateMany({ status: 'pending' }, { $set: { status: 'approved' } });
        console.log('Updated pending reviews:', res.modifiedCount);
    } else {
        console.log('Collection reviews not found');
    }
    process.exit(0);
}).catch(console.error);
