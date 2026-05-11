import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractVehicleInfo(base64Image: string, mimeType: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Extract vehicle information from this image. It could be an odometer, VIN sticker, or registration document. Try to find the VIN, Year, Make, Model, and Mileage (KM). Return as JSON.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vin: { type: Type.STRING, description: "Vehicle Identification Number (VIN)" },
          year: { type: Type.STRING, description: "Vehicle year" },
          make: { type: Type.STRING, description: "Vehicle make (e.g. Ford, Toyota)" },
          model: { type: Type.STRING, description: "Vehicle model (e.g. F-150, Corolla)" },
          mileage: { type: Type.STRING, description: "Vehicle mileage in kilometers" },
        },
      },
    },
  });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to call gemini api", err);
    return null;
  }
}
