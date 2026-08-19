import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setServers } from "node:dns";

import User from "../src/models/User.js";
import Subscription from "../src/models/Subscription.js";
import connectDB from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Use public DNS for MongoDB Atlas SRV resolution
setServers(["8.8.8.8", "1.1.1.1"]);

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Clearing old demo user...");
    const demoEmail = "demo@stackwise.com";
    await User.deleteOne({ email: demoEmail });

    console.log("Creating new demo user...");
    const demoUser = await User.create({
      name: "Jawad Chowdhury",
      email: demoEmail,
      password: "password123", // Pre-save hook hashes this
      role: "individual",
      workType: "freelancer",
      baseCurrency: "BDT",
      onboardingCompleted: true,
    });

    console.log(`Demo user created with ID: ${demoUser._id}`);

    console.log("Clearing old subscriptions for demo user...");
    await Subscription.deleteMany({ user: demoUser._id });

    // Calculate dates relative to now to demonstrate trial alerts/countdowns:
    // ChatGPT trial ends in 8 days and 3 hours (195 hours)
    const chatGptRenewal = new Date();
    chatGptRenewal.setHours(chatGptRenewal.getHours() + 8 * 24 + 3);

    // Midjourney trial ends in 1 day and 14 hours (38 hours) - inside the 48-hour alert window!
    const midjourneyRenewal = new Date();
    midjourneyRenewal.setHours(midjourneyRenewal.getHours() + 1 * 24 + 14);

    // Netflix paid renewing in 12 days
    const netflixRenewal = new Date();
    netflixRenewal.setDate(netflixRenewal.getDate() + 12);

    // Spotify paid renewing in 25 days
    const spotifyRenewal = new Date();
    spotifyRenewal.setDate(spotifyRenewal.getDate() + 25);

    const subscriptionsData = [
      {
        user: demoUser._id,
        name: "ChatGPT",
        planName: "PRO TIER",
        amount: 20,
        currency: "USD",
        billingCycle: "monthly",
        renewalDate: chatGptRenewal,
        paymentPortalUrl: "https://chatgpt.com/#settings",
        registeredEmail: "amimachkhai27@gmail.com",
        paymentMethod: "Visa | **** 2466",
        isTrial: true,
        trialAlert: true,
        category: "AI",
        capabilities: ["Chat", "Code Generation", "Image Analysis", "API Access"],
        status: "active",
      },
      {
        user: demoUser._id,
        name: "Midjourney",
        planName: "Basic Plan",
        amount: 10,
        currency: "USD",
        billingCycle: "monthly",
        renewalDate: midjourneyRenewal,
        paymentPortalUrl: "https://midjourney.com/account",
        registeredEmail: "amimachkhai27@gmail.com",
        paymentMethod: "Visa | **** 2466",
        isTrial: true,
        trialAlert: true,
        category: "AI",
        capabilities: ["Image Generation", "Upscaling", "Style Transfer"],
        status: "active",
      },
      {
        user: demoUser._id,
        name: "Netflix",
        planName: "Premium 4K",
        amount: 14.99,
        currency: "USD",
        billingCycle: "monthly",
        renewalDate: netflixRenewal,
        paymentPortalUrl: "https://netflix.com/youraccount",
        registeredEmail: "amimachkhai27@gmail.com",
        paymentMethod: "Mastercard | **** 8891",
        isTrial: false,
        trialAlert: false,
        category: "Entertainment",
        capabilities: ["4K Streaming", "Dolby Vision", "Offline Downloads", "Multiple Profiles"],
        status: "active",
      },
      {
        user: demoUser._id,
        name: "Spotify",
        planName: "Family Plan",
        amount: 179,
        currency: "BDT",
        billingCycle: "monthly",
        renewalDate: spotifyRenewal,
        paymentPortalUrl: "https://spotify.com/account",
        registeredEmail: "amimachkhai27@gmail.com",
        paymentMethod: "bKash | 01712345678",
        isTrial: false,
        trialAlert: false,
        category: "Entertainment",
        capabilities: ["Music Streaming", "Podcasts", "Offline Mode"],
        status: "active",
      },
    ];

    console.log("Seeding subscriptions...");
    const createdSubs = await Subscription.insertMany(subscriptionsData);
    console.log(`Successfully seeded ${createdSubs.length} subscriptions!`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
