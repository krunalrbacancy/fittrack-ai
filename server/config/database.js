import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not defined in .env file');
      console.error('Please add MONGODB_URI to your server/.env file');
      process.exit(1);
    }

    // Validate MongoDB URI format
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && 
        !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      console.error('❌ Error: Invalid MongoDB URI format');
      console.error('MongoDB URI should start with mongodb:// or mongodb+srv://');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check your MongoDB Atlas connection string');
      console.error('   2. Verify the cluster hostname is correct');
      console.error('   3. Make sure your IP is whitelisted in MongoDB Atlas');
      console.error('   4. Check your internet connection');
      console.error('\n   Example format:');
      console.error('   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fittrack-ai?retryWrites=true&w=majority\n');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check your MongoDB username and password');
      console.error('   2. Make sure password is URL-encoded if it contains special characters');
      console.error('   3. Verify database user has proper permissions\n');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check if your IP is whitelisted (0.0.0.0/0 for all IPs)\n');
    }
    
    console.error('📖 For help, see: TROUBLESHOOTING.md\n');
    process.exit(1);
  }
};

export default connectDB;

