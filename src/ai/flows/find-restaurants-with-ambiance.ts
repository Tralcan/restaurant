
// src/ai/flows/find-restaurants-with-ambiance.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow to find restaurants matching a specified cuisine, sub-cuisine, and city,
 * prioritizing results with images that depict a night-time dining atmosphere.
 *
 * - findRestaurantsWithAmbiance -  A function to initiate the restaurant search flow.
 * - FindRestaurantsWithAmbianceInput - The input type for the findRestaurantsWithAmbiance function.
 * - FindRestaurantsWithAmbianceOutput - The output type for the findRestaurantsWithAmbiance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindRestaurantsWithAmbianceInputSchema = z.object({
  cuisine: z.string().describe('The type of cuisine (e.g., Italian, Mexican).'),
  subCuisine: z.string().describe('The specific sub-cuisine (e.g., pizza, tacos).'),
  city: z.string().describe('The city where the user wants to find restaurants.'),
});
export type FindRestaurantsWithAmbianceInput = z.infer<typeof FindRestaurantsWithAmbianceInputSchema>;

const RestaurantSchema = z.object({
  name: z.string().describe('The name of the restaurant.'),
  imageUrl: z.string().describe("URL of an image showing the restaurant ambiance. MUST be 'https://placehold.co/600x400.png'."),
  address: z.string().describe('The address of the restaurant.'),
  description: z.string().optional().describe('A short description of the restaurant.'),
});

const FindRestaurantsWithAmbianceOutputSchema = z.array(RestaurantSchema).describe('An array of restaurants matching the criteria.');
export type FindRestaurantsWithAmbianceOutput = z.infer<typeof FindRestaurantsWithAmbianceOutputSchema>;

export async function findRestaurantsWithAmbiance(input: FindRestaurantsWithAmbianceInput): Promise<FindRestaurantsWithAmbianceOutput> {
  return findRestaurantsWithAmbianceFlow(input);
}

const findRestaurantsPrompt = ai.definePrompt({
  name: 'findRestaurantsPrompt',
  input: {schema: FindRestaurantsWithAmbianceInputSchema},
  output: {schema: FindRestaurantsWithAmbianceOutputSchema},
  prompt: `You are a restaurant finder AI. Find restaurants based on the cuisine, sub-cuisine, and city specified by the user.
    You should try to provide diverse and realistic-sounding restaurant names and addresses within the specified city.
    For the 'imageUrl', you MUST use 'https://placehold.co/600x400.png' for every restaurant. Do not attempt to find or generate any other image URLs.
    Return a JSON array of restaurants.

    Cuisine: {{{cuisine}}}
    Sub-Cuisine: {{{subCuisine}}}
    City: {{{city}}}

    Each restaurant object in the array should include:
    - name: The name of the restaurant.
    - imageUrl: This MUST be the exact string 'https://placehold.co/600x400.png'.
    - address: The address of the restaurant in the specified city.
    - description: A short description of the restaurant.
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

