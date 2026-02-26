/* ============================================================
   MongoDB Connection — Love For You ❤️
   ============================================================ */
import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log(`💕 MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        isConnected = false;
        console.error(`\n❌ MongoDB connection failed: ${error.message}`);
        console.log('━'.repeat(50));
        console.log('📋 To fix this, you have two options:\n');
        console.log('   Option 1: Start MongoDB locally');
        console.log('   → Run "mongod" in a separate terminal\n');
        console.log('   Option 2: Use MongoDB Atlas (free cloud DB)');
        console.log('   → Go to https://cloud.mongodb.com');
        console.log('   → Create a free cluster & get connection string');
        console.log('   → Update MONGO_URI in server/.env file');
        console.log('━'.repeat(50));
        console.log('\n⚠️  Server will start without DB. Messages won\'t persist.\n');
    }
};

export { isConnected };
export default connectDB;
