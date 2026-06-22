import mongoose from "mongoose";
import Event from "../models/Event";
import { connectDB } from "../config/database";
import dotenv from "dotenv";

dotenv.config();

const TRIGGER_WORDS = [
  "game",
  "win",
  "prize",
  "reward",
  "jackpot",
  "coin",
  "casino",
  "lottery",
  "spin",
  "challenge",
  "bet",
  "gamble",
];

const REPLACEMENT_MAP: Record<string, string> = {
  game: "Coding Project",
  games: "Coding Projects",
  gaming: "Interactive Learning",
  win: "Learn",
  winning: "Learning",
  prize: "Certificate",
  reward: "Achievement",
  challenge: "Activity",
  "bubble popping game": "Bubble Pop Animation",
  "chase game": "Character Movement Project",
  "minecraft game": "Minecraft STEM Workshop",
  "build a game": "Build an Interactive Project",
  "make a game": "Create an Interactive Project",
};

function suggestReplacement(title: string, matchedWord: string): string {
  const lower = title.toLowerCase();
  for (const [phrase, replacement] of Object.entries(REPLACEMENT_MAP)) {
    if (lower.includes(phrase)) {
      return title.replace(new RegExp(phrase, "gi"), replacement);
    }
  }
  const replacement = REPLACEMENT_MAP[matchedWord.toLowerCase()];
  if (replacement) {
    return title.replace(new RegExp(`\\b${matchedWord}\\b`, "gi"), replacement);
  }
  return `${title} (manual review needed)`;
}

async function auditTriggerWords() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("Connected\n");

    const triggerRegex = new RegExp(`\\b(${TRIGGER_WORDS.join("|")})\\b`, "i");

    const events = await Event.find(
      {
        $or: [
          { title: { $regex: triggerRegex } },
          { description: { $regex: triggerRegex } },
        ],
      },
      { _id: 1, title: 1, description: 1, slug: 1, status: 1 },
    ).lean();

    if (events.length === 0) {
      console.log("No events with trigger words found.");
      return;
    }

    console.log(`Found ${events.length} events with trigger words.\n`);
    console.log("Event ID,Title,Status,Matched Words,Suggested Title");

    for (const event of events) {
      const title = event.title || "";
      const desc = (event.description || "").substring(0, 200);
      const combined = `${title} ${desc}`;

      const matches: string[] = [];
      for (const word of TRIGGER_WORDS) {
        const wordRegex = new RegExp(`\\b${word}\\b`, "gi");
        const found = combined.match(wordRegex);
        if (found) matches.push(...found.map((m: string) => m.toLowerCase()));
      }

      const uniqueMatches = [...new Set(matches)];
      const suggested = suggestReplacement(title, uniqueMatches[0] || "");

      const csvLine = [
        event._id,
        `"${title.replace(/"/g, '""')}"`,
        event.status || "unknown",
        uniqueMatches.join(";"),
        `"${suggested.replace(/"/g, '""')}"`,
      ].join(",");

      console.log(csvLine);
    }

    console.log(`\nTotal: ${events.length} events need review.`);
  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

auditTriggerWords();
