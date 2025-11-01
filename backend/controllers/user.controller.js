import express from "express";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyEmail } from "../verifyEmail/verify.email.js";
import { Session } from "../models/session.model.js";


const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if(!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false , message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if(user) {
      return res.status(409).json({ success: false,  message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        firstName,
        lastName, 
        email, 
        password: hashedPassword,
    });

    const token = await jwt.sign({ id:newUser._id }, process.env.SECRET_KEY, { expiresIn: '10m' });
    verifyEmail(token, email);
    newUser.token = token;

    await newUser.save();
    res.status(201).json({ 
        success: true,  
        message: "User registered successfully",
        user: newUser,
    });

  } catch (error) {
    res.status(500).json({ 
        message: "Server error", 
        error: error.message 
    });
  }

};

const verify = async (req, res) => {
  try {
    
    const authHeader = req.headers['authorization'];
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Authorization header missing" });
    }

    const token = authHeader && authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
       if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: "Token has expired" });
       }

       return res.status(401).json({ success: false, message: "Token verification failed" });
    }

    const user = await User.findById(decoded.id);
    if(!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.token = null;
    user.isVerified = true;
    await user.save();
    return res.status(200).json({ success: true, message: "Email verified successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const reVerify = async (req, res) => {
    try {
       const { email } = req.body;
       
       const user = await User.findOne({ email });
       if(!user) {
        return res.status(404).json({ success: false, message: "User not found" });
       }

       const token = await jwt.sign({ id:user._id }, process.env.SECRET_KEY, { expiresIn: '10m' });
       verifyEmail(token, email);
       user.token = token;
       await user.save();

       return res.status(200).json({ success: true, message: "Verification email sent" , token: user.token });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

const login = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    if(!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if(!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if(!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    if(!existingUser.isVerified) {
      return res.status(403).json({ success: false, message: "Email not verified" });
    }

    const accessToken = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY, { expiresIn: '10d' });
    const refreshToken = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY, { expiresIn: '30d' });

    existingUser.isLoggedIn = true;
    await existingUser.save();

    const existingSession = await Session.findOne({ userId: existingUser._id });
    if(existingSession) {
      await Session.deleteOne({ userId: existingUser._id });
    }

    await Session.create({ userId: existingUser._id });

    return res.status(200).json({ 
      success: true, 
      message: `Welcome back, ${existingUser.firstName}`, 
      user: existingUser,
      accessToken,
      refreshToken
    });


  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Authorization header missing" });
    }
    const token = authHeader && authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
       return res.status(401).json({ success: false, message: "Token verification failed" });
    }
    const user = await User.findById(decoded.id);
    if(!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.isLoggedIn = false;
    await user.save();
    await Session.deleteOne({ userId: user._id });

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export { register, login, verify, reVerify };