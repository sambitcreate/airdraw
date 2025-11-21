import type { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

// Server-side API key (not exposed to client)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { imageData } = JSON.parse(event.body || '{}');

    if (!imageData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No image data provided' }),
      };
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/(png|jpeg);base64,/, '');

    // First: understand the sketch to steer the generation prompt
    const descriptionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'You are an expert art director. Study the incoming sketch and summarize it with a vivid scene description, key elements, and lighting cues.',
                'Respond as concise JSON with keys: "scene", "palette", and "camera" (camera contains perspective/shot suggestions).',
              ].join(' '),
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            scene: { type: 'string' },
            palette: { type: 'string' },
            camera: { type: 'string' },
          },
          required: ['scene'],
        },
      },
    });

    const parsedSummary = (() => {
      try {
        return JSON.parse(descriptionResponse.response?.text() || '{}') as {
          scene?: string;
          palette?: string;
          camera?: string;
        };
      } catch (error) {
        console.warn('Failed to parse sketch description, falling back to defaults:', error);
        return {} as { scene?: string; palette?: string; camera?: string };
      }
    })();

    const creativePrompt = [
      'Transform the provided sketch into a polished, high-fidelity illustration the user can save.',
      'Keep the original composition while adding realistic rendering, balanced lighting, and tasteful texture.',
      parsedSummary.scene ? `Reference scene: ${parsedSummary.scene}.` : 'Use the sketch lines as primary composition.',
      parsedSummary.palette ? `Preferred palette: ${parsedSummary.palette}.` : 'Use a harmonious, softly saturated palette.',
      parsedSummary.camera ? `Camera style: ${parsedSummary.camera}.` : 'Use a cinematic mid-shot with gentle depth of field.',
      'Return a single PNG image that feels finished and artful, not cartoonish. Avoid adding new objects that break the silhouette.',
    ].join(' ');

    const imageResponse = await ai.models.generateImages({
      model: 'imagen-3.0-nano-banana',
      prompt: creativePrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        guidanceScale: 18,
        enhancePrompt: true,
        outputMimeType: 'image/png',
        addWatermark: false,
      },
    });

    const generatedImage = imageResponse.generatedImages?.[0]?.image?.imageBytes;

    if (!generatedImage) {
      throw new Error('No image generated');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:image/png;base64,${generatedImage}`,
        prompt: creativePrompt,
      }),
    };
  } catch (error) {
    console.error('Error analyzing drawing:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to analyze drawing',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
