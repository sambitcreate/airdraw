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

    const enhancementPrompt = [
      'Transform the provided sketch or doodle into a polished, high-quality image that keeps the original composition and proportions.',
      'Fix broken or faint lines, respect the drawn silhouettes, and avoid adding new subjects or text.',
      'Choose the best presentation: photorealistic rendering when the subject is grounded in reality, or a bold artistic illustration when the scene is more imaginative.',
      'Refine shading, lighting, and material detail, introduce subtle background depth, and output a clean PNG the user can save.',
    ].join(' ');

    const response = await ai.models.generateContent({
      model: 'imagen-3.0-nano-banana',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: enhancementPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'image/png',
      },
    });

    const imagePart = response.response?.candidates?.[0]?.content?.parts?.find(
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
