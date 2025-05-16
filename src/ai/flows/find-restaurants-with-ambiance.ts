
// src/ai/flows/find-restaurants-with-ambiance.ts
'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para encontrar restaurantes que coincidan con una cocina, sub-cocina (opcional) y ciudad especificadas,
 * priorizando resultados con imágenes que representen un ambiente de cena nocturno.
 *
 * - findRestaurantsWithAmbiance -  Una función para iniciar el flujo de búsqueda de restaurantes.
 * - FindRestaurantsWithAmbianceInput - El tipo de entrada para la función findRestaurantsWithAmbiance.
 * - FindRestaurantsWithAmbianceOutput - El tipo de salida para la función findRestaurantsWithAmbiance.
 */

import {ai} from '@/ai/genkit';
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
  description: z.string().optional().describe('Una breve descripción del restaurante.'),
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
    Debes intentar proporcionar nombres de restaurantes, direcciones y números de teléfono diversos y que suenen realistas dentro de la ciudad especificada.
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
    - description: Una breve descripción del restaurante.
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
    return output!;
  }
);

