
// src/ai/flows/find-restaurants-with-ambiance.ts
'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para encontrar restaurantes reales usando Google Places API
 * y luego enriquecerlos con una descripción de ambiente generada por IA.
 *
 * - findRestaurantsWithAmbiance - Una función para iniciar el flujo de búsqueda de restaurantes.
 * - FindRestaurantsWithAmbianceInput - El tipo de entrada para la función findRestaurantsWithAmbiance.
 * - FindRestaurantsWithAmbianceOutput - El tipo de salida para la función findRestaurantsWithAmbiance.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Client, PlaceInputType} from '@googlemaps/google-maps-services-js';

const googleMapsClient = new Client({});

const FindRestaurantsWithAmbianceInputSchema = z.object({
  cuisine: z.string().describe('El tipo de cocina (ej., Italiana, Mexicana).'),
  subCuisine: z.string().optional().describe('La sub-cocina específica (ej., pizza, tacos). Puede ser usado para refinar la búsqueda si es relevante.'),
  city: z.string().describe('La ciudad donde el usuario quiere encontrar restaurantes.'),
});
export type FindRestaurantsWithAmbianceInput = z.infer<typeof FindRestaurantsWithAmbianceInputSchema>;

const RestaurantSchema = z.object({
  name: z.string().describe('El nombre del restaurante.'),
  imageUrl: z.string().describe("URL de una imagen. DEBE ser 'https://placehold.co/600x400.png' inicialmente. Esta será reemplazada por una imagen generada por IA en el cliente."),
  address: z.string().optional().describe("La dirección formateada del restaurante."),
  description: z.string().optional().describe('Una breve descripción del restaurante, enfocada en el ambiente nocturno.'),
  rating: z.number().min(0).max(5).optional().describe('La calificación promedio del restaurante, de 0 a 5 estrellas.'),
  reviewCount: z.number().int().min(0).optional().describe('El número total de reseñas que tiene el restaurante.'),
  priceLevel: z.enum(['$', '$$', '$$$', '$$$$', 'Desconocido']).optional().describe("El nivel de precios del restaurante."),
  placeId: z.string().optional().describe("El ID de Google Places del restaurante."),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional().describe("Las coordenadas geográficas (latitud, longitud) del restaurante."),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

const FindRestaurantsWithAmbianceOutputSchema = z.array(RestaurantSchema).min(0).max(12).describe("Un arreglo de hasta 12 restaurantes encontrados.");
export type FindRestaurantsWithAmbianceOutput = z.infer<typeof FindRestaurantsWithAmbianceOutputSchema>;

// Herramienta para buscar restaurantes usando Google Places API
const searchGooglePlacesTool = ai.defineTool({
  name: 'searchGooglePlacesTool',
  description: 'Busca restaurantes reales en Google Places y devuelve sus detalles. Se enfoca en encontrar negocios que existan en la ciudad especificada.',
  inputSchema: z.object({
    cuisine: z.string(),
    subCuisine: z.string().optional(),
    city: z.string(),
  }),
  outputSchema: z.array(RestaurantSchema),
}, async ({ cuisine, subCuisine, city }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY no está configurada en las variables de entorno.');
  }

  let searchQuery = `${cuisine} ${subCuisine || ''} restaurantes en ${city}`;
  if (cuisine.toLowerCase() === 'todas') {
    searchQuery = `restaurantes en ${city} ${subCuisine || ''}`;
  }


  try {
    const response = await googleMapsClient.textSearch({
      params: {
        query: searchQuery,
        key: apiKey,
        type: 'restaurant', 
        language: 'es', 
      },
    });

    const places = response.data.results;
    if (!places) return [];

    const restaurantPromises = places.slice(0, 15).map(async (place) => {
      let placeDetails = null;
      if (place.place_id) {
        try {
            const detailsResponse = await googleMapsClient.placeDetails({
                params: {
                    place_id: place.place_id,
                    // Campos solicitados: Basic Data, Atmosphere Data y Geometry.
                    fields: ['name', 'formatted_address', 'rating', 'user_ratings_total', 'price_level', 'place_id', 'geometry'],
                    key: apiKey,
                    language: 'es',
                }
            });
            placeDetails = detailsResponse.data.result;
        } catch (detailError) {
            console.error(`Error obteniendo detalles para place_id ${place.place_id}:`, detailError);
        }
      }
      
      const currentPlace = placeDetails || place;


      let priceLevelString: Restaurant['priceLevel'] = 'Desconocido';
      if (typeof currentPlace.price_level === 'number') {
        if (currentPlace.price_level === 1) priceLevelString = '$';
        else if (currentPlace.price_level === 2) priceLevelString = '$$';
        else if (currentPlace.price_level === 3) priceLevelString = '$$$';
        else if (currentPlace.price_level >= 4) priceLevelString = '$$$$';
      }

      return {
        name: currentPlace.name || 'Nombre no disponible',
        imageUrl: 'https://placehold.co/600x400.png', 
        address: currentPlace.formatted_address,
        rating: currentPlace.rating,
        reviewCount: currentPlace.user_ratings_total,
        priceLevel: priceLevelString,
        description: '', 
        placeId: currentPlace.place_id,
        location: currentPlace.geometry?.location,
      };
    });
    return Promise.all(restaurantPromises);
  } catch (error) {
    console.error('Error llamando a Google Places API:', error);
    return []; 
  }
});

const addAmbianceDescriptionPrompt = ai.definePrompt({
  name: 'addAmbianceDescriptionPrompt',
  input: { schema: RestaurantSchema.extend({ originalCuisineQuery: z.string(), originalCityQuery: z.string() }) },
  output: { schema: z.object({ description: z.string().optional() }) },
  prompt: `Eres un experto en describir ambientes de restaurantes.
Dado el siguiente restaurante, que es un lugar real obtenido de una base de datos:
Nombre: {{{name}}}
Tipo de Cocina (según búsqueda): {{{originalCuisineQuery}}}
Ciudad: {{{originalCityQuery}}}
Dirección: {{{address}}} (si está disponible)
Nivel de Precio: {{{priceLevel}}} (si está disponible)
Rating: {{{rating}}} (si está disponible)
Número de Reseñas: {{{reviewCount}}} (si está disponible)

IMPORTANTE: El restaurante debe ser conocido por estar EN LA CIUDAD ESPECIFICADA ({{{originalCityQuery}}}). No menciones detalles como teléfono o sitio web.

Por favor, escribe una descripción corta y evocadora (1-2 frases concisas) que resalte un potencial ambiente de cena nocturno, buena atmósfera, idealmente con gente disfrutando.
Si el tipo de restaurante no se presta mucho a "ambiente nocturno" (ej. una cafetería de desayuno), enfócate en describir su atmósfera general agradable y acogedora.
El objetivo es crear una imagen atractiva para alguien que busca una experiencia de cena especial. La imagen del restaurante se generará por separado para coincidir con esta descripción de ambiente.
Responde solo con la descripción.
`,
});


export async function findRestaurantsWithAmbiance(input: FindRestaurantsWithAmbianceInput): Promise<FindRestaurantsWithAmbianceOutput> {
  const restaurantsFromPlaces = await searchGooglePlacesTool({
    cuisine: input.cuisine,
    subCuisine: input.subCuisine,
    city: input.city,
  });

  if (!restaurantsFromPlaces || restaurantsFromPlaces.length === 0) {
    return [];
  }

  const enrichedRestaurantsPromises = restaurantsFromPlaces.slice(0, 12).map(async (restaurant) => {
    try {
      const { output } = await addAmbianceDescriptionPrompt({
        ...restaurant, 
        originalCuisineQuery: input.cuisine, 
        originalCityQuery: input.city,     
      });
      return {
        ...restaurant,
        description: output?.description || restaurant.description || `Un restaurante de cocina ${input.cuisine} en ${input.city}.`,
      };
    } catch (e) {
      console.error(`Error generando descripción para ${restaurant.name}:`, e);
      return {
        ...restaurant,
        description: restaurant.description || `Un restaurante de cocina ${input.cuisine} en ${input.city}.`, 
      };
    }
  });

  const enrichedRestaurants = await Promise.all(enrichedRestaurantsPromises);
  return enrichedRestaurants;
}

const findRestaurantsWithAmbianceFlow = ai.defineFlow(
  {
    name: 'findRestaurantsWithAmbianceFlow',
    inputSchema: FindRestaurantsWithAmbianceInputSchema,
    outputSchema: FindRestaurantsWithAmbianceOutputSchema,
  },
  async (input) => {
    return findRestaurantsWithAmbiance(input);
  }
);
