import type { WaiverWording } from "./hash";

// Placeholder wording for local development and the demo gym. Not a legal
// document: each gym brings its own waiver, reviewed by its own lawyer.
export const SAMPLE_WAIVER: WaiverWording = {
  title: "Sample climbing waiver",
  body: [
    "This is a sample waiver for testing Elevate. It is not a legal document. Your gym will replace it with its own waiver.",
    "Climbing, bouldering and belaying are dangerous. Falls, falling holds, equipment failure and mistakes by you or other climbers can cause serious injury or death, even when everyone follows the rules.",
    "You choose to climb at your own risk. You agree to follow the gym's rules and staff instructions, to check your own equipment, and to stop climbing if you feel unwell or unsure.",
    "You release the gym and its staff from claims for injury or loss that happen while you use the gym, except where the law does not allow this.",
    "You agree that the gym can give or arrange first aid and call emergency services for you if needed.",
  ].join("\n\n"),
  clauses: [
    "I understand climbing can cause serious injury or death.",
    "I will only belay or lead climb after passing the gym's check for it.",
    "I will keep the fall zone under boulderers clear.",
    "I have read this waiver and agree to it.",
  ],
};
