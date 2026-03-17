import { GoogleGenAI, Type } from "@google/genai";
import { ForgeMasterResponse } from "../types";

export class ForgeMasterService {
  /**
   * Generates a dynamic RPG quest and achievement based on the user's recent workout data.
   */
  static async generateQuest(apiKey: string, userData: any, existingAchievements: string[], currentInventory: string[]): Promise<ForgeMasterResponse> {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the "Forge Master," the AI Dungeon Master for a fitness and wellness RPG app called Matt Forge. Your objective is to gamify the user's Brazilian Jiu-Jitsu (BJJ), weightlifting, and overall consistency by generating dynamic quests, inventing personalized achievements, and narrating their current progression.

You will be provided with a JSON payload containing:
1. The user's recent workout data and biometrics.
2. An array of their \`existing_achievements\` and their \`current_inventory\` (items they have already unlocked).

Your Mission:
1. The Armory Summary: Review the user's \`current_inventory\`. Generate a brief, epic 2-sentence narrative describing the user's character wearing or inspecting their unlocked gear in the armory. If their inventory is empty, describe them as a raw, unarmored warrior ready to be forged.
2. Analyze Progression: Analyze the \`existing_achievements\` to understand what the user has already accomplished. Do NOT duplicate any existing achievement names or concepts.
3. Quest Generation: Evaluate the user's recent workout data. Determine what specific physical challenge they need next (e.g., returning to the gym after a break, surviving a grueling 6-minute BJJ round, or hitting a new lift volume).
4. Dynamic Creation: Dynamically invent a brand new "Side Quest" AND a brand new "Achievement" with a unique RPG item reward that fits their current trajectory.
5. Tone: Epic, encouraging, and gritty. Frame real-world physical effort (the "Mat" and the "Iron") as heroic battles. Treat 6-minute BJJ rounds as epic, intimidating Boss Fights to help the user overcome their nerves.
6. Output: You MUST return your response in strict JSON format.`;

    const prompt = `{
  "user_data": ${JSON.stringify(userData, null, 2)},
  "existing_achievements": ${JSON.stringify(existingAchievements, null, 2)},
  "current_inventory": ${JSON.stringify(currentInventory, null, 2)}
}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              armory_summary: {
                type: Type.STRING,
                description: "A 2-sentence epic description of the user's character wearing their currently unlocked items.",
              },
              quest: {
                type: Type.OBJECT,
                properties: {
                  quest_type: {
                    type: Type.STRING,
                    description: "Must be 'Daily Bounty', 'Side Quest', or 'Boss Fight'",
                  },
                  quest_title: {
                    type: Type.STRING,
                    description: "Epic name of the quest",
                  },
                  lore_description: {
                    type: Type.STRING,
                    description: "A 2-3 sentence epic narrative setting the scene and explaining the challenge.",
                  },
                  real_world_objective: {
                    type: Type.STRING,
                    description: "The exact physical task the user must complete today.",
                  },
                },
                required: [
                  "quest_type",
                  "quest_title",
                  "lore_description",
                  "real_world_objective",
                ],
              },
              new_achievement_to_add: {
                type: Type.OBJECT,
                properties: {
                  achievement_name: {
                    type: Type.STRING,
                    description: "Unique name for the new long-term achievement",
                  },
                  unlock_condition: {
                    type: Type.STRING,
                    description: "The exact physical metric required to unlock this (e.g., 'Log 5 total 6-minute rounds', 'Hit a 200lb deadlift')",
                  },
                  linked_item_reward: {
                    type: Type.OBJECT,
                    properties: {
                      item_name: {
                        type: Type.STRING,
                        description: "Epic name of a virtual item (e.g., 'Phase-Shift Gi', 'Titanium Lifting Belt')",
                      },
                      item_type: {
                        type: Type.STRING,
                        description: "Must be 'Headgear', 'Chest', 'Hands', or 'Accessory'",
                      },
                    },
                    required: ["item_name", "item_type"],
                  },
                },
                required: ["achievement_name", "unlock_condition", "linked_item_reward"],
              },
            },
            required: ["armory_summary", "quest", "new_achievement_to_add"],
          },
        },
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini API");
      }

      const questResponse: ForgeMasterResponse = JSON.parse(response.text);
      return questResponse;
    } catch (error) {
      console.error("Error generating quest:", error);
      throw error;
    }
  }
}
