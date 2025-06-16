
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
  imageUrl: z.string().describe("URL de una imagen. DEBE ser 'https://placehold.co/600x400.png' inicialmente. Esta será reemplazada por una imagen generada por IA."),
  address: z.string().describe('La dirección del restaurante.'),
  phoneNumber: z.string().optional().describe('El número de teléfono del restaurante.'),
  websiteUrl: z.string().optional().describe('La URL válida y existente del sitio web del restaurante (ej., https://www.ejemplorestaurante.com). Si no se encuentra un sitio web real y funcional, este campo debe omitirse o dejarse nulo/vacío. Debe ser una URL válida si se proporciona.'),
  description: z.string().optional().describe('Una breve descripción del restaurante.'),
  rating: z.number().min(1).max(5).optional().describe('La calificación del restaurante, de 1 a 5 estrellas (puede ser decimal, ej. 4.5). Simula datos de sitios como Google o TripAdvisor.'),
  reviewCount: z.number().int().min(0).optional().describe('El número total de reseñas que tiene el restaurante.'),
});

const FindRestaurantsWithAmbianceOutputSchema = z.array(RestaurantSchema).min(0).max(9).describe('Un arreglo de entre 0 y 9 restaurantes que coinciden con los criterios. Intenta devolver alrededor de 6-9 si se encuentran coincidencias.');
export type FindRestaurantsWithAmbianceOutput = z.infer<typeof FindRestaurantsWithAmbianceOutputSchema>;

export async function findRestaurantsWithAmbiance(input: FindRestaurantsWithAmbianceInput): Promise<FindRestaurantsWithAmbianceOutput> {
  return findRestaurantsWithAmbianceFlow(input);
}

const findRestaurantsPrompt = ai.definePrompt({
  name: 'findRestaurantsPrompt',
  input: {schema: FindRestaurantsWithAmbianceInputSchema},
  output: {schema: FindRestaurantsWithAmbianceOutputSchema.describe("Devuelve un arreglo JSON de restaurantes que coinciden con los criterios. Intenta devolver entre 6 y 9 restaurantes si es posible. Para 'websiteUrl', solo incluye el campo si encuentras una URL de sitio web real y funcional. De lo contrario, omítelo o deja su valor nulo/vacío.")},
  prompt: `Eres una IA buscadora de restaurantes. Encuentra restaurantes basados en la cocina, ciudad y, opcionalmente, la sub-cocina especificada por el usuario.
    Debes intentar proporcionar nombres de restaurantes, direcciones, números de teléfono, URLs de sitios web, calificaciones y número de reseñas diversos y que suenen realistas dentro de la ciudad especificada.
    Intenta devolver entre 6 y 9 restaurantes si es posible.
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
    - websiteUrl: La URL del sitio web del restaurante (ej., https://www.elbuensabor.com). **Solo incluye este campo si encuentras una URL de sitio web real y funcional para el restaurante. Si no encuentras una, OMITE COMPLETAMENTE este campo o deja su valor nulo/vacío.**
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

    if (!output) {
        return [];
    }

    // Process each restaurant to generate an image
    const restaurantsWithImages = await Promise.all(
      output.map(async restaurant => {
        try {
            const imageResult = await generateRestaurantImage({
            restaurantName: restaurant.name,
            cuisine: input.cuisine, 
            city: input.city, 
            });
            return {...restaurant, imageUrl: imageResult.imageDataUri};
        } catch (error) {
            console.error(`Error al generar imagen para ${restaurant.name}:`, error);
            // Mantener la imagen placeholder si la generación falla
            return {...restaurant, imageUrl: 'https://placehold.co/600x400.png'};
        }
      })
    );

    return restaurantsWithImages;
  }
);
