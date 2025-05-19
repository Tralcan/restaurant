
'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para generar una imagen para un restaurante.
 *
 * - generateRestaurantImage - Una función que llama a generateRestaurantImageFlow y devuelve un data URI de imagen.
 * - GenerateRestaurantImageInput - El tipo de entrada para la función generateRestaurantImage.
 * - GenerateRestaurantImageOutput - El tipo de salida para la función generateRestaurantImage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRestaurantImageInputSchema = z.object({
  restaurantName: z.string().describe('El nombre del restaurante.'),
  cuisine: z.string().describe('El tipo de cocina del restaurante (ej., Italiana, Mexicana).'),
  city: z.string().describe('La ciudad donde se encuentra el restaurante.'),
});
export type GenerateRestaurantImageInput = z.infer<typeof GenerateRestaurantImageInputSchema>;

const GenerateRestaurantImageOutputSchema = z.object({
  imageDataUri: z.string().describe("La imagen generada como un data URI (Base64 encoded PNG). Formato esperado: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateRestaurantImageOutput = z.infer<typeof GenerateRestaurantImageOutputSchema>;

export async function generateRestaurantImage(input: GenerateRestaurantImageInput): Promise<GenerateRestaurantImageOutput> {
  return generateRestaurantImageFlow(input);
}

const generateImagePrompt = ai.definePrompt({
  name: 'generateRestaurantImagePrompt',
  input: {schema: GenerateRestaurantImageInputSchema},
  // Aunque el output deseado es una imagen, el modelo necesita un esquema de texto para la respuesta que contiene la imagen.
  // La imagen se extraerá del campo `media` de la respuesta de `ai.generate`.
  output: { schema: z.object({generatedText: z.string().optional()}) }, 
  prompt: `Genera una imagen atractiva y de alta calidad para un restaurante llamado '{{restaurantName}}' en la ciudad de '{{city}}' que se especializa en cocina '{{cuisine}}'.
La imagen debe representar un ambiente de cena nocturno, posiblemente con comida apetitosa o el interior del restaurante.
Evita incluir texto visible en la imagen. El estilo debe ser fotorealista si es posible, o una ilustración detallada.
Responde solo con la imagen, sin texto adicional si es posible.`,
});

const generateRestaurantImageFlow = ai.defineFlow(
  {
    name: 'generateRestaurantImageFlow',
    inputSchema: GenerateRestaurantImageInputSchema,
    outputSchema: GenerateRestaurantImageOutputSchema,
  },
  async (input) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Modelo capaz de generar imágenes
      prompt: generateImagePrompt.render(input)!.prompt as string, // Usamos el prompt renderizado
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Debe incluir IMAGE
        // Opcional: ajustar safetySettings si es necesario, aunque para restaurantes no suele ser problemático
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        // ],
      },
    });

    if (!media || !media.url) {
      throw new Error('No se pudo generar la imagen o la URL de la imagen está vacía.');
    }
    
    // La URL de media ya es un data URI en base64
    return {imageDataUri: media.url};
  }
);
