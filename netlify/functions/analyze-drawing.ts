import type { Handler } from '@netlify/functions';
import { GoogleGenAI, Modality } from '@google/genai';

// Server-side API key (not exposed to client)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const enhancementInstructions = [
  'Using the provided drawing, keep the composition and proportions identical while upgrading it into a clean, polished image.',
  'Fix faint or broken strokes, preserve silhouettes, and avoid adding new subjects or any text overlays.',
  'If the subject is realistic, render it with believable lighting, depth, and materials; otherwise lean into an expressive artistic finish.',
  'Return a crisp PNG the user can save without changing the aspect ratio.',
].join(' ');

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            { text: enhancementInstructions },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
          ],
        },
      ],
      // Explicitly request image output per Gemini image model guidance
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidates = response.response?.candidates ?? response.candidates ?? [];
    const imagePart = candidates[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.includes('image') && part.inlineData?.data,
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('No enhanced image returned from Gemini');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enhancedImage: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      }),
    };
  } catch (error) {
    console.error('Error analyzing drawing:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to enhance drawing',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
