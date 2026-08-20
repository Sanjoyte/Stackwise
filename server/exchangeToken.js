import { google } from "googleapis";
import readline from "readline";

const oauth2Client = new google.auth.OAuth2(
  "791221947772-q7tfe15034742rau9kp8grsqaba5i0s2.apps.googleusercontent.com",
  "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",
  "http://localhost:5000/oauth2callback"
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter code: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("Tokens:");
    console.log(tokens);

  } catch (error) {
    console.error(error);
  }

  rl.close();
});