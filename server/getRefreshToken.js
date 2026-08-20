import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  "791221947772-q7tfe15034742rau9kp8grsqaba5i0s2.apps.googleusercontent.com",
  "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",
  "http://localhost:5000/oauth2callback"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.send"
  ],
});

console.log(authUrl);