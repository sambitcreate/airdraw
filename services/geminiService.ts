/**
 * Enhances the drawing canvas by generating a refined image.
 * Calls the serverless function to keep API key secure.
 * @param base64Image The base64 encoded image string from the canvas.
 * @returns A base64 data URL for the enhanced image.
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
    return data.image || "";
  } catch (error) {
    console.error("Error analyzing drawing:", error);
    return "";
  }
};
