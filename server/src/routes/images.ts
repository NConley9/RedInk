import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';

export const imagesRouter = Router();
imagesRouter.use(requireAuth);

// POST /api/images/generate — proxy to Fal.ai
imagesRouter.post('/generate', async (req: AuthRequest, res: Response) => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }

  // Get user's Fal.ai key or fall back to server key
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('api_keys')
    .eq('user_id', req.userId!)
    .single();

  const apiKeys = (settings?.api_keys as Record<string, string>) || {};
  const falKey = apiKeys['fal'] || process.env.FAL_API_KEY;

  if (!falKey) {
    res.status(400).json({ error: 'No Fal.ai API key configured. Add one in Settings.' });
    return;
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'portrait_4_3',
        num_inference_steps: 4,
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: err });
      return;
    }

    const result = await response.json() as { images?: Array<{ url: string }> };
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) { res.status(500).json({ error: 'No image returned' }); return; }

    res.json({ url: imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});
