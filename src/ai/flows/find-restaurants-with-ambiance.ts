
// src/ai/flows/find-restaurants-with-ambiance.ts
'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para encontrar restaurantes que coincidan con una cocina, sub-cocina (opcional) y ciudad especificadas,
 * priorizando resultados con imágenes que representen un ambiente de cena nocturno. También incluye calificaciones, número de reseñas, URL del sitio web y nivel de precios.
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
  imageUrl: z.string().describe("URL de una imagen. DEBE ser 'https://placehold.co/600x400.png' inicialmente. Esta será reemplazada por una imagen generada por IA en el cliente si es necesario."),
  address: z.string().optional().describe("La dirección del restaurante. Proporciona esto SOLO si tienes una alta confianza de que corresponde a un negocio real que 'conoces' por tu entrenamiento. De lo contrario, omite este campo."),
  phoneNumber: z.string().optional().describe("El número de teléfono del restaurante. Proporciona esto SOLO si tienes una alta confianza de que corresponde a un negocio real que 'conoces' por tu entrenamiento y el formato es plausible para la ciudad. De lo contrario, omite este campo."),
  websiteUrl: z.string().optional().describe('La URL válida y existente del sitio web del restaurante (ej., https://www.ejemplorestaurante.com). Proporciona esto SOLO si tienes una alta confianza de que corresponde a un negocio real que "conoces" por tu entrenamiento. De lo contrario, omite este campo.'),
  description: z.string().optional().describe('Una breve descripción del restaurante.'),
  rating: z.number().min(1).max(5).optional().describe('La calificación del restaurante, de 1 a 5 estrellas (puede ser decimal, ej. 4.5). Simula datos de sitios como Google o TripAdvisor.'),
  reviewCount: z.number().int().min(0).optional().describe('El número total de reseñas que tiene el restaurante.'),
  priceLevel: z.enum(['$', '$$', '$$$', '$$$$']).optional().describe("El nivel de precios del restaurante, donde '$' es económico, '$$' es moderado, '$$$' es caro y '$$$$' es muy caro. Intenta asignar uno si es posible."),
});

const FindRestaurantsWithAmbianceOutputSchema = z.array(RestaurantSchema).min(0).max(12).describe("Un arreglo de entre 0 y 12 restaurantes que coinciden con los criterios. Intenta devolver alrededor de 10-12 si se encuentran coincidencias. Para 'address', 'phoneNumber' y 'websiteUrl', sé MUY CONSERVADOR: solo inclúyelos si tienes una alta confianza de que corresponden a un negocio real que 'conoces' de tu entrenamiento. Es preferible omitirlos a inventarlos incorrectamente. Los otros campos (nombre, descripción, rating, reviewCount, priceLevel) pueden ser simulaciones plausibles.");
export type FindRestaurantsWithAmbianceOutput = z.infer<typeof FindRestaurantsWithAmbianceOutputSchema>;

export async function findRestaurantsWithAmbiance(input: FindRestaurantsWithAmbianceInput): Promise<FindRestaurantsWithAmbianceOutput> {
  return findRestaurantsWithAmbianceFlow(input);
}

const findRestaurantsPrompt = ai.definePrompt({
  name: 'findRestaurantsPrompt',
  input: {schema: FindRestaurantsWithAmbianceInputSchema},
  output: {schema: FindRestaurantsWithAmbianceOutputSchema},
  prompt: `Eres una IA buscadora de restaurantes. Encuentra restaurantes basados en la cocina, ciudad y, opcionalmente, la sub-cocina especificada por el usuario.
    Tu objetivo es proporcionar información que sea lo más útil y potencialmente real posible, basada en tu entrenamiento.

    Para los campos 'address', 'phoneNumber', y 'websiteUrl':
    - SOLO debes proporcionar estos detalles si tienes una ALTA CONFIANZA de que corresponden a un negocio real y específico que "conoces" a través de tu extenso entrenamiento.
    - Si no estás seguro o si la información sería especulativa, DEBES OMITIR estos campos para ese restaurante. Es mejor no dar esta información que dar una incorrecta.
    - Si proporcionas un 'phoneNumber', asegúrate de que el formato sea realista y plausible para la ciudad especificada.
    - Si proporcionas un 'websiteUrl', asegúrate de que sea una URL válida y que creas que existe.

    Para los demás campos (name, description, rating, reviewCount, priceLevel):
    - Intenta proporcionar nombres de restaurantes, descripciones, calificaciones, número de reseñas y niveles de precios diversos y que suenen realistas dentro de la ciudad especificada, inspirados en tu conocimiento.
    - Estos campos pueden ser simulaciones realistas si no corresponden a un negocio específico que recuerdes con todos sus detalles.

    Intenta devolver entre 10 y 12 restaurantes si es posible, pero prioriza la calidad y la potencial veracidad de la información de contacto sobre la cantidad.
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
    return output;
  }
);

