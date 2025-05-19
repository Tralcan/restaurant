
// src/ai/flows/find-restaurants-with-ambiance.ts
'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para encontrar restaurantes que coincidan con una cocina, sub-cocina (opcional) y ciudad especificadas,
 * priorizando resultados con imágenes que representen un ambiente de cena nocturno. También incluye calificaciones, número de reseñas y URL del sitio web.
 *
 * - findRestaurantsWithAmbiance -  Una función para iniciar el flujo de búsqueda de restaurantes.
 * - FindRestaurantsWithAmbianceInput - El tipo de entrada para la función findRestaurantsWithAmbiance.
 * - FindRestaurantsWithAmbianceOutput - El tipo de salida para la función findRestaurantsWithAmbiance.
 */

import {ai} from '@/ai/genkit';
import {generateRestaurantImage} from './generate-restaurant-image';
import {z} from 'genkit';

const FindRestaurantsWithAmbianceInputSchema = z.object({
  cuisine: z.string().describe('El tipo de cocina (ej., Italiana, Mexicana).'),
  subCuisine: z.string().optional().describe('La sub-cocina específica (ej., pizza, tacos). Si está vacío o no se proporciona, busca todas las sub-cocinas del tipo de cocina principal.'),
  city: z.string().describe('La ciudad donde el usuario quiere encontrar restaurantes.'),
});
export type FindRestaurantsWithAmbianceInput = z.infer<typeof FindRestaurantsWithAmbianceInputSchema>;

const RestaurantSchema = z.object({
  name: z.string().describe('El nombre del restaurante.'),
  imageUrl: z.string().describe("URL de una imagen. DEBE ser 'https://placehold.co/600x400.png'. Esta imagen debe representar conceptualmente una foto de un cliente o una imagen del sitio web del restaurante, centrándose en un ambiente de cena nocturno con personas si es posible."),
  address: z.string().describe('La dirección del restaurante.'),
  phoneNumber: z.string().optional().describe('El número de teléfono del restaurante.'),
  websiteUrl: z.string().optional().describe('La URL del sitio web del restaurante (ej., https://www.ejemplorestaurante.com). Opcional, puede estar vacío si no se encuentra. Debe ser una URL válida si se proporciona.'),
  description: z.string().optional().describe('Una breve descripción del restaurante.'),
  rating: z.number().min(1).max(5).optional().describe('La calificación del restaurante, de 1 a 5 estrellas (puede ser decimal, ej. 4.5). Simula datos de sitios como Google o TripAdvisor.'),
  reviewCount: z.number().int().min(0).optional().describe('El número total de reseñas que tiene el restaurante.'),
});

const FindRestaurantsWithAmbianceOutputSchema = z.array(RestaurantSchema).describe('Un arreglo de restaurantes que coinciden con los criterios.');
export type FindRestaurantsWithAmbianceOutput = z.infer<typeof FindRestaurantsWithAmbianceOutputSchema>;

export async function findRestaurantsWithAmbiance(input: FindRestaurantsWithAmbianceInput): Promise<FindRestaurantsWithAmbianceOutput> {
  return findRestaurantsWithAmbianceFlow(input);
}

const findRestaurantsPrompt = ai.definePrompt({
  name: 'findRestaurantsPrompt',
  input: {schema: FindRestaurantsWithAmbianceInputSchema},
  output: {schema: FindRestaurantsWithAmbianceOutputSchema},
  prompt: `Eres una IA buscadora de restaurantes. Encuentra restaurantes basados en la cocina, ciudad y, opcionalmente, la sub-cocina especificada por el usuario.
    Debes intentar proporcionar nombres de restaurantes, direcciones, números de teléfono, URLs de sitios web, calificaciones y número de reseñas diversos y que suenen realistas dentro de la ciudad especificada.
    Para 'imageUrl', DEBES usar 'https://placehold.co/600x400.png' para cada restaurante. No intentes encontrar o generar otras URLs de imágenes.
    Conceptualmente, esta imagen debe representar el ambiente del restaurante, idealmente como una foto tomada por un cliente o del sitio web del restaurante, presentando un ambiente de cena nocturno, buena atmósfera y gente si es apropiado.
    Devuelve un arreglo JSON de restaurantes.

    Cocina: {{{cuisine}}}
    {{#if subCuisine}}
    Sub-Cocina: {{{subCuisine}}}
    {{else}}
    Sub-Cocina: Cualquiera (Buscar todos los tipos de restaurantes de {{{cuisine}}})
    {{/if}}
    Ciudad: {{{city}}}

    Cada objeto de restaurante en el arreglo debe incluir:
    - name: El nombre del restaurante.
    - imageUrl: ESTO DEBE ser la cadena exacta 'https://placehold.co/600x400.png'.
    - address: La dirección del restaurante en la ciudad especificada.
    - phoneNumber: El número de teléfono del restaurante. (ej., (555) 123-4567)
    - websiteUrl: La URL del sitio web del restaurante (ej., https://www.elbuensabor.com). Si no se encuentra un sitio web, este campo puede omitirse o dejarse vacío. Debe ser una URL válida si se proporciona.
    - description: Una breve descripción del restaurante.
    - rating: Un número entre 1 y 5 (puede ser decimal, ej. 4, 3.5, 4.8) que represente la calificación promedio del restaurante.
    - reviewCount: Un número entero no negativo que represente la cantidad de reseñas recibidas por el restaurante.
  `,
});

const findRestaurantsWithAmbianceFlow = ai.defineFlow(
  {
    name: 'findRestaurantsWithAmbianceFlow',
    inputSchema: FindRestaurantsWithAmbianceInputSchema,
    outputSchema: FindRestaurantsWithAmbianceOutputSchema,
  },
  async input => {
    const {output} = await findRestaurantsPrompt(input);

    // Process each restaurant to generate an image
    const restaurantsWithImages = await Promise.all(
      output!.map(async restaurant => {
        const imageResult = await generateRestaurantImage({
          restaurantName: restaurant.name,
          cuisine: input.cuisine, // Use the main cuisine from the input
          city: input.city, // Use the city from the input
        });
        return {...restaurant, imageUrl: imageResult.imageDataUri};
      })
    );

    return restaurantsWithImages;
  }
);

