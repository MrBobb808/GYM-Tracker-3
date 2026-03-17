import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { WorkoutLog, DailyStats, WeeklySummary, UserProfile } from "../types";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export class WeeklySummaryService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  static async getLatestSummary(userEmail: string): Promise<WeeklySummary | null> {
    try {
      const q = query(
        collection(db, "weeklySummaries"),
        where("userEmail", "==", userEmail),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WeeklySummary;
    } catch (error) {
      console.error("Error fetching latest summary:", error);
      return null;
    }
  }

  static aggregateWeeklyMetrics(
    logs: WorkoutLog[],
    dailyStats: DailyStats[],
    profile: UserProfile | null
  ) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 1. Pounds Lost
    const chronoStats = [...dailyStats]
      .filter(s => s.bodyWeight)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const currentWeight = chronoStats.length > 0 ? (chronoStats[chronoStats.length - 1].bodyWeight || 0) : 0;
    const weight7DaysAgo = chronoStats.find(s => new Date(s.timestamp) >= sevenDaysAgo)?.bodyWeight || currentWeight;
    const poundsLost = Math.max(0, weight7DaysAgo - currentWeight);

    // 2. BJJ Hours
    const bjjLogs = logs.filter(l => l.type === 'bjj' && new Date(l.date) >= sevenDaysAgo);
    // Assuming each session is ~1.5 hours if not specified, or we can use a fixed value.
    // Let's assume 1.5 hours per session for now as a default if not tracked.
    const bjjHours = bjjLogs.length * 1.5; 

    // 3. Total Lifting Volume
    const strengthLogs = logs.filter(l => l.type === 'strength' && new Date(l.date) >= sevenDaysAgo);
    let liftingVolume = 0;
    strengthLogs.forEach(log => {
      log.sets?.forEach(set => {
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps) || 0;
        liftingVolume += w * r;
      });
    });

    // 4. Caloric Adherence
    const weeklyStats = dailyStats.filter(s => new Date(s.date) >= sevenDaysAgo);
    const adherenceDays = weeklyStats.filter(s => {
      const burned = (s.baseCalories || 2000) + (s.caloriesBurned || 0);
      const consumed = s.caloriesConsumed || 0;
      return consumed > 0 && consumed <= burned;
    }).length;
    const caloricAdherence = weeklyStats.length > 0 ? (adherenceDays / weeklyStats.length) * 100 : 0;

    return {
      poundsLost,
      bjjHours,
      liftingVolume,
      caloricAdherence,
      weekEnding: now.toISOString().split('T')[0]
    };
  }

  async generateSummaryImage(
    metrics: { poundsLost: number; bjjHours: number; liftingVolume: number; caloricAdherence: number },
    style: '3d' | 'comic' | 'photorealistic',
    profile: UserProfile | null
  ): Promise<{ imageUrl: string; prompt: string }> {
    const { poundsLost, bjjHours, liftingVolume, caloricAdherence } = metrics;
    
    // Dynamic Prompt Generation
    let mascotState = "Biblit looking motivated";
    if (poundsLost > 2 || bjjHours > 5 || liftingVolume > 10000) {
      mascotState = "Biblit wearing a BJJ gi with a blue belt and a heavy leather lifting belt, looking victorious and powerful";
    } else if (poundsLost > 0 || bjjHours > 0 || liftingVolume > 0) {
      mascotState = "Biblit in training gear, sweating but smiling, holding a kettlebell";
    }

    const stylePrompt = {
      '3d': "3D animated style, Pixar-like, vibrant colors, soft lighting",
      'comic': "Gritty comic book style, bold ink lines, dramatic shadows, high contrast",
      'photorealistic': "Photorealistic style, cinematic lighting, 8k resolution, highly detailed textures"
    }[style];

    const prompt = `A high-quality image of ${mascotState} in a cinematic gym setting. ${stylePrompt}. The scene should feel inspiring and represent a successful week of fitness and martial arts training. No text in the image.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    let imageUrl = "";
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Failed to generate image");

    return { imageUrl, prompt };
  }

  async overlayTextOnImage(
    base64Image: string,
    metrics: { poundsLost: number; bjjHours: number; liftingVolume: number; caloricAdherence: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Could not get canvas context");

        // Draw background image
        ctx.drawImage(img, 0, 0);

        // Add overlay gradient for readability
        const gradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

        // Text styling
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;

        const padding = 50;
        const fontSize = 40;
        ctx.font = `bold ${fontSize}px "Inter", sans-serif`;

        const stats = [
          `${metrics.poundsLost.toFixed(1)} lbs Down`,
          `${metrics.bjjHours} Hours on the Mats`,
          `${Math.round(metrics.liftingVolume).toLocaleString()} lbs Lifted`,
          `${Math.round(metrics.caloricAdherence)}% Caloric Adherence`
        ];

        stats.forEach((stat, index) => {
          ctx.fillText(stat, padding, canvas.height - padding - (stats.length - 1 - index) * (fontSize + 10));
        });

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = base64Image;
    });
  }

  static async saveSummary(userEmail: string, summary: WeeklySummary) {
    try {
      await addDoc(collection(db, "weeklySummaries"), {
        ...summary,
        userEmail,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving summary:", error);
    }
  }

  static async formatImage(
    base64Image: string,
    aspectRatio: '1:1' | '16:9' | '9:16'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width, height;

        if (aspectRatio === '1:1') {
          width = height = Math.min(img.width, img.height);
        } else if (aspectRatio === '16:9') {
          width = img.width;
          height = (img.width * 9) / 16;
        } else { // 9:16
          height = img.height;
          width = (img.height * 9) / 16;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Could not get canvas context");

        // Center crop
        const offsetX = (img.width - width) / 2;
        const offsetY = (img.height - height) / 2;

        ctx.drawImage(img, offsetX, offsetY, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = base64Image;
    });
  }

  static async getMacrocycleSummaries(userEmail: string): Promise<WeeklySummary[]> {
    try {
      const q = query(
        collection(db, "weeklySummaries"),
        where("userEmail", "==", userEmail),
        orderBy("timestamp", "asc"),
        limit(12) // Last 12 weeks
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklySummary));
    } catch (error) {
      console.error("Error fetching macrocycle summaries:", error);
      return [];
    }
  }
}
