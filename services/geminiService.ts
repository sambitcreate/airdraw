/**
 * Enhances the drawing canvas and returns a Gemini-upscaled image.
 * Calls the serverless function to keep API key secure.
 * @param base64Image The base64 encoded image string from the canvas.
 * @returns A base64 encoded enhanced image the user can save.
 */
export const enhanceDrawing = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/analyze-drawing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.enhancedImage || '';
  } catch (error) {
    console.error("Error enhancing drawing:", error);
    return '';
  }
};
