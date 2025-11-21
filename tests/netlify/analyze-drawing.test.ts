import { describe, expect, it, beforeEach, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
  Modality: {
    IMAGE: 'IMAGE',
  },
}));

describe('analyze-drawing Netlify function', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns 405 for non-POST requests', async () => {
    const { handler } = await import('../../netlify/functions/analyze-drawing');

    const result = await handler({ httpMethod: 'GET' } as any);

    expect(result.statusCode).toBe(405);
  });

  it('returns 400 when image data is missing', async () => {
    const { handler } = await import('../../netlify/functions/analyze-drawing');

    const result = await handler({ httpMethod: 'POST', body: '{}' } as any);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/No image data/i);
  });

  it('calls Gemini with text instructions followed by inline image data', async () => {
    const { handler } = await import('../../netlify/functions/analyze-drawing');

    generateContentMock.mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'enhanced-base64',
                  },
                },
              ],
            },
          },
        ],
      },
    });

    const body = JSON.stringify({ imageData: 'data:image/png;base64,original-base64' });
    const result = await handler({ httpMethod: 'POST', body } as any);

    expect(result.statusCode).toBe(200);
    expect(generateContentMock).toHaveBeenCalledTimes(1);

    const call = generateContentMock.mock.calls[0][0];
    expect(call.model).toBe('gemini-2.5-flash-image');
    expect(call.contents[0].parts[0]).toHaveProperty('text');
    expect(call.contents[0].parts[1].inlineData.data).toBe('original-base64');
    expect(call.config?.responseModalities).toEqual(['IMAGE']);
  });

  it('returns 500 when Gemini does not return an image', async () => {
    const { handler } = await import('../../netlify/functions/analyze-drawing');

    generateContentMock.mockResolvedValue({ response: { candidates: [] } });

    const body = JSON.stringify({ imageData: 'data:image/png;base64,missing' });
    const result = await handler({ httpMethod: 'POST', body } as any);

    expect(result.statusCode).toBe(500);
    const parsed = JSON.parse(result.body);
    expect(parsed.error).toMatch(/Failed to enhance drawing/);
  });
});
