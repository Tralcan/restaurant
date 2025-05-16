
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RestaurantCard } from '@/components/restaurant-card';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { CUISINE_TYPES } from '@/lib/constants';
import { getSubCuisines, type GetSubCuisinesOutput } from '@/ai/flows/get-sub-cuisines';
import { findRestaurantsWithAmbiance, type FindRestaurantsWithAmbianceOutput } from '@/ai/flows/find-restaurants-with-ambiance';
import { AlertCircle, UtensilsCrossed, Search, MapPin, Building } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";


export default function GlobalGrubFinderPage() {
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [subCuisines, setSubCuisines] = useState<string[]>([]);
  const [selectedSubCuisine, setSelectedSubCuisine] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [restaurants, setRestaurants] = useState<FindRestaurantsWithAmbianceOutput>([]);
  
  const [isSubCuisinesLoading, startSubCuisinesTransition] = useTransition();
  const [isRestaurantsLoading, startRestaurantsTransition] = useTransition();
  
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCuisine) {
      setError(null);
      setSubCuisines([]);
      setSelectedSubCuisine('');
      setRestaurants([]);
      startSubCuisinesTransition(async () => {
        try {
          const result = await getSubCuisines({ cuisine: selectedCuisine });
          if (result && result.subCuisines) {
            setSubCuisines(result.subCuisines);
            if (result.subCuisines.length === 0) {
              toast({
                title: "No Sub-Cuisines Found",
                description: `Could not find any sub-cuisines for ${selectedCuisine}. Try another cuisine type.`,
                variant: "default",
              });
            }
          } else {
            throw new Error("Invalid response format for sub-cuisines.");
          }
        } catch (err) {
          console.error('Error fetching sub-cuisines:', err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to fetch sub-cuisines: ${errorMessage}`);
          toast({
            title: 'Error',
            description: `Could not fetch sub-cuisines for ${selectedCuisine}.`,
            variant: 'destructive',
          });
        }
      });
    }
  }, [selectedCuisine, toast]);

  const handleFindRestaurants = () => {
    if (!selectedCuisine || !selectedSubCuisine || !city) {
      toast({
        title: 'Selection Incomplete',
        description: 'Please select a cuisine, a sub-cuisine, and enter a city.',
        variant: 'default',
      });
      return;
    }
    setError(null);
    setRestaurants([]);
    startRestaurantsTransition(async () => {
      try {
        const result = await findRestaurantsWithAmbiance({
          cuisine: selectedCuisine,
          subCuisine: selectedSubCuisine,
          city: city,
        });
        if (result) {
          setRestaurants(result);
          if (result.length === 0) {
            toast({
              title: "No Restaurants Found",
              description: `Could not find restaurants for ${selectedCuisine} - ${selectedSubCuisine} in ${city}. Try other options.`,
              variant: "default",
            });
          }
        } else {
          throw new Error("Invalid response format for restaurants.");
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to fetch restaurants: ${errorMessage}`);
        toast({
          title: 'Error',
          description: 'Could not fetch restaurants. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
      <header className="mb-12 text-center">
        <UtensilsCrossed className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight">
          Global Grub Finder
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Discover your next favorite dining spot with the perfect night-time vibe.
        </p>
      </header>

      <div className="w-full max-w-3xl bg-card p-6 sm:p-8 rounded-xl shadow-2xl mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="cuisine-select" className="block text-sm font-medium text-primary-foreground mb-2">
              Cuisine Type
            </label>
            <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
              <SelectTrigger id="cuisine-select" className="w-full bg-input text-foreground border-border focus:ring-accent">
                <SelectValue placeholder="Select a cuisine..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {CUISINE_TYPES.map((cuisine) => (
                  <SelectItem key={cuisine} value={cuisine}>
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="subcuisine-select" className="block text-sm font-medium text-primary-foreground mb-2">
              Sub-Cuisine
            </label>
            <Select
              value={selectedSubCuisine}
              onValueChange={setSelectedSubCuisine}
              disabled={!selectedCuisine || isSubCuisinesLoading || subCuisines.length === 0}
            >
              <SelectTrigger id="subcuisine-select" className="w-full bg-input text-foreground border-border focus:ring-accent">
                <SelectValue placeholder={isSubCuisinesLoading ? "Loading..." : "Select a sub-cuisine..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {isSubCuisinesLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader size={20} />
                  </div>
                ) : (
                  subCuisines.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))
                )}
                {!isSubCuisinesLoading && subCuisines.length === 0 && selectedCuisine && (
                   <p className="p-4 text-sm text-muted-foreground">No sub-cuisines found for {selectedCuisine}.</p>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
         <div className="mb-6">
          <label htmlFor="city-input" className="block text-sm font-medium text-primary-foreground mb-2">
            City
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="city-input"
              type="text"
              placeholder="Enter your city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-input text-foreground border-border focus:ring-accent pl-10"
            />
          </div>
        </div>
        <Button
            onClick={handleFindRestaurants}
            disabled={!selectedSubCuisine || !city || isRestaurantsLoading || isSubCuisinesLoading}
            className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-accent"
          >
            {isRestaurantsLoading ? (
              <Loader className="mr-2" size={20} />
            ) : (
              <Search className="mr-2 h-5 w-5" />
            )}
            Find Restaurants
          </Button>
      </div>

      {error && (
         <Alert variant="destructive" className="w-full max-w-3xl mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isRestaurantsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {[...Array(3)].map((_, i) => (
             <Card key={i} className="overflow-hidden shadow-lg flex flex-col h-full">
                <div className="relative w-full h-48 md:h-56 bg-muted animate-pulse"></div>
                <CardContent className="p-4 flex-grow">
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-full mb-1"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      {!isRestaurantsLoading && restaurants.length > 0 && (
        <div className="w-full max-w-6xl">
          <h2 className="text-3xl font-semibold text-primary-foreground mb-8 text-center">
            Restaurant Results for {city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
            {restaurants.map((resto, index) => (
              <RestaurantCard key={`${resto.name}-${index}`} restaurant={resto} />
            ))}
          </div>
        </div>
      )}
      
      {!isRestaurantsLoading && restaurants.length === 0 && selectedSubCuisine && city && !error && (
        <div className="text-center py-10 w-full max-w-3xl">
          <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">
            No restaurants found matching your criteria in {city}.
          </p>
          <p className="text-muted-foreground">Try different cuisine, sub-cuisine, or city options.</p>
        </div>
      )}

      {!selectedCuisine && !error && !isRestaurantsLoading && (
         <div className="text-center py-10 w-full max-w-3xl mt-8">
          <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">
            Start by selecting a cuisine type and entering a city to discover restaurants.
          </p>
        </div>
      )}
       {!city && !selectedCuisine && !error && !isRestaurantsLoading && (
         <div className="text-center py-10 w-full max-w-3xl mt-8">
          <Building className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">
            Please enter a city to begin your search.
          </p>
        </div>
      )}


    </div>
  );
}

