/* ============================================================
   User Model — Love For You ❤️
   Only 2 users allowed: admin & user
   ============================================================ */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false, // Don't return password by default
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user',
    },
    avatar: {
        type: String,
        default: '💕',
    },
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Prevent creating more than 2 users
userSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose.model('User').countDocuments();
        if (count >= 2) {
            const err = new Error('Maximum of 2 users allowed');
            err.statusCode = 403;
            return next(err);
        }
    }
    next();
});

const User = mongoose.model('User', userSchema);

export default User;
