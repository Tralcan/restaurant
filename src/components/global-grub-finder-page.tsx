
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
import { findRestaurantsWithAmbiance, type FindRestaurantsWithAmbianceOutput, type FindRestaurantsWithAmbianceInput } from '@/ai/flows/find-restaurants-with-ambiance';
import { generateRestaurantImage, type GenerateRestaurantImageInput } from '@/ai/flows/generate-restaurant-image';
import { AlertCircle, UtensilsCrossed, Search, MapPin, Building, ListFilter, Star, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const ALL_SUBCUISINES_OPTION = "Todas";
const LOCAL_STORAGE_CITY_KEY = 'globalGrubFinderLastCity';

interface RestaurantImageData {
  loading: boolean;
  dataUri?: string;
  error?: string;
}

export default function GlobalGrubFinderPage() {
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [subCuisines, setSubCuisines] = useState<string[]>([ALL_SUBCUISINES_OPTION]);
  const [selectedSubCuisine, setSelectedSubCuisine] = useState<string>(ALL_SUBCUISINES_OPTION);
  const [city, setCity] = useState<string>('');
  const [restaurants, setRestaurants] = useState<FindRestaurantsWithAmbianceOutput>([]);
  const [restaurantImageData, setRestaurantImageData] = useState<Record<string, RestaurantImageData>>({});
  
  const [isSubCuisinesLoading, startSubCuisinesTransition] = useTransition();
  const [isRestaurantsLoading, startRestaurantsTransition] = useTransition();
  
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Load city from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCity = localStorage.getItem(LOCAL_STORAGE_CITY_KEY);
      if (savedCity) {
        setCity(savedCity);
      }
    }
  }, []);

  // Save city to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CITY_KEY, city);
    }
  }, [city]);

  useEffect(() => {
    setRestaurants([]);
    setRestaurantImageData({});
    setError(null);
    setHasSearched(false);

    if (selectedCuisine) {
      setSubCuisines([ALL_SUBCUISINES_OPTION]);
      setSelectedSubCuisine(ALL_SUBCUISINES_OPTION);
      startSubCuisinesTransition(async () => {
        try {
          const result = await getSubCuisines({ cuisine: selectedCuisine });
          if (result && result.subCuisines) {
            setSubCuisines([ALL_SUBCUISINES_OPTION, ...result.subCuisines]);
            if (result.subCuisines.length === 0) {
              toast({
                title: "No se Encontraron Sub-Cocinas Específicas",
                description: `No hay sub-cocinas específicas para ${selectedCuisine}. Puedes buscar en "${ALL_SUBCUISINES_OPTION}".`,
                variant: "default",
              });
            }
          } else {
            throw new Error("Formato de respuesta inválido para sub-cocinas.");
          }
        } catch (err) {
          console.error('Error al obtener sub-cocinas:', err);
          const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
          setError(`Error al obtener sub-cocinas: ${errorMessage}`);
          toast({
            title: 'Error',
            description: `No se pudieron obtener las sub-cocinas para ${selectedCuisine}.`,
            variant: 'destructive',
          });
        }
      });
    } else {
      setSubCuisines([ALL_SUBCUISINES_OPTION]);
      setSelectedSubCuisine(ALL_SUBCUISINES_OPTION);
    }
  }, [selectedCuisine, toast]);

  useEffect(() => {
    if (selectedCuisine) { 
      setRestaurants([]);
      setRestaurantImageData({});
      setError(null);
      setHasSearched(false);
    }
  }, [selectedSubCuisine, selectedCuisine]); 

  useEffect(() => {
    setRestaurants([]);
    setRestaurantImageData({});
    setError(null);
    setHasSearched(false);
  }, [city]);


  const handleFindRestaurants = () => {
    if (!selectedCuisine || !selectedSubCuisine || !city) {
      toast({
        title: 'Selección Incompleta',
        description: 'Por favor, selecciona un tipo de cocina, una sub-cocina (o "Todas"), y ingresa una ciudad.',
        variant: 'default',
      });
      return;
    }
    setHasSearched(true);
    setError(null);
    setRestaurants([]); 
    setRestaurantImageData({}); 
    startRestaurantsTransition(async () => {
      try {
        const subCuisineToSearch = selectedSubCuisine === ALL_SUBCUISINES_OPTION ? '' : selectedSubCuisine;
        const searchInput: FindRestaurantsWithAmbianceInput = {
          cuisine: selectedCuisine,
          subCuisine: subCuisineToSearch,
          city: city,
        };
        const result = await findRestaurantsWithAmbiance(searchInput);
        if (result) {
          setRestaurants(result); 
        } else {
          throw new Error("Formato de respuesta inválido para restaurantes.");
        }
      } catch (err) {
        console.error('Error al obtener restaurantes:', err);
        const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
        setError(`Error al obtener restaurantes: ${errorMessage}`);
        toast({
          title: 'Error',
          description: 'No se pudieron obtener los restaurantes. Por favor, inténtalo de nuevo.',
          variant: 'destructive',
        });
      }
    });
  };

  useEffect(() => {
    if (restaurants.length > 0 && !isRestaurantsLoading) {
      const currentImageKeys = Object.keys(restaurantImageData);
      restaurants.forEach(resto => {
        const imageKey = `${resto.name}-${resto.address || city}-${selectedCuisine}`; // Clave más única
        
        const existingImageData = restaurantImageData[imageKey];
        if (!existingImageData || (!existingImageData.dataUri && !existingImageData.loading && !existingImageData.error)) {
          
          setRestaurantImageData(prev => ({
            ...prev,
            [imageKey]: { loading: true, error: undefined }, 
          }));

          const imageGenInput: GenerateRestaurantImageInput = {
            restaurantName: resto.name,
            cuisine: selectedCuisine, 
            city: city 
          };

          const fetchImage = async (key: string, input: GenerateRestaurantImageInput) => {
            try {
              const imageResult = await generateRestaurantImage(input);
              setRestaurantImageData(prev => ({
                ...prev,
                [key]: { loading: false, dataUri: imageResult.imageDataUri },
              }));
            } catch (imgErr) {
              console.error(`Error al generar imagen para ${input.restaurantName}:`, imgErr);
              setRestaurantImageData(prev => ({
                ...prev,
                [key]: { loading: false, error: 'Error al generar imagen', dataUri: 'https://placehold.co/600x400.png' },
              }));
            }
          };
          fetchImage(imageKey, imageGenInput);
        }
      });
       const newImageKeys = restaurants.map(r => `${r.name}-${r.address || city}-${selectedCuisine}`);
       const keysToDelete = currentImageKeys.filter(k => !newImageKeys.includes(k));
       if (keysToDelete.length > 0) {
         setRestaurantImageData(prev => {
           const newState = { ...prev };
           keysToDelete.forEach(key => delete newState[key]);
           return newState;
         });
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants, selectedCuisine, city, isRestaurantsLoading]);


  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
      <header className="mb-12 text-center">
        <UtensilsCrossed className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight">
          Buscador Global de Antojos
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Descubre tu próximo lugar favorito para cenar con el ambiente nocturno perfecto.
        </p>
      </header>

      <div className="w-full max-w-3xl bg-card p-6 sm:p-8 rounded-xl shadow-2xl mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="cuisine-select" className="block text-sm font-medium text-primary-foreground mb-2">
              Tipo de Cocina
            </label>
            <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
              <SelectTrigger id="cuisine-select" className="w-full bg-input text-foreground border-border focus:ring-accent">
                <SelectValue placeholder="Selecciona un tipo de cocina..." />
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
              Sub-Cocina / Especificidad
            </label>
            <Select
              value={selectedSubCuisine}
              onValueChange={setSelectedSubCuisine}
              disabled={!selectedCuisine || isSubCuisinesLoading}
            >
              <SelectTrigger id="subcuisine-select" className="w-full bg-input text-foreground border-border focus:ring-accent">
                 <div className="flex items-center">
                  <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={isSubCuisinesLoading ? "Cargando..." : "Selecciona especificidad..."} />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {isSubCuisinesLoading && subCuisines.length <= 1 ? ( 
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
                {!isSubCuisinesLoading && subCuisines.length === 1 && selectedCuisine && ( 
                   <p className="p-4 text-sm text-muted-foreground">No se encontraron sub-cocinas específicas. Buscando "Todas las de {selectedCuisine}".</p>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
         <div className="mb-6">
          <label htmlFor="city-input" className="block text-sm font-medium text-primary-foreground mb-2">
            Ciudad
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="city-input"
              type="text"
              placeholder="Ingresa tu ciudad..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-input text-foreground border-border focus:ring-accent pl-10"
            />
          </div>
        </div>
        <Button
            onClick={handleFindRestaurants}
            disabled={!selectedCuisine || !selectedSubCuisine || !city || isRestaurantsLoading || isSubCuisinesLoading}
            className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-accent"
          >
            {isRestaurantsLoading ? (
              <Loader className="mr-2" size={20} />
            ) : (
              <Search className="mr-2 h-5 w-5" />
            )}
            Buscar Restaurantes
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
          {[...Array(9)].map((_, i) => ( 
             <Card key={i} className="overflow-hidden shadow-lg flex flex-col h-full">
                <div className="relative w-full h-48 md:h-56 bg-muted animate-pulse flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <CardContent className="p-4 flex-grow">
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2"></div>
                  <div className="flex items-center mb-2"> 
                    {[...Array(5)].map((_, s_idx) => (
                        <div key={s_idx} className="w-5 h-5 bg-muted animate-pulse rounded-sm mr-1"></div>
                    ))}
                     <div className="h-4 bg-muted animate-pulse rounded w-1/4 ml-2"></div>
                  </div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-3"></div> {/* For price level */}
                  <div className="h-4 bg-muted animate-pulse rounded w-full mb-1"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6 mb-1"></div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

      {!isRestaurantsLoading && restaurants.length > 0 && (
        <div className="w-full max-w-6xl">
          <h2 className="text-3xl font-semibold text-primary-foreground mb-8 text-center">
            Resultados de Restaurantes para {city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
            {restaurants.map((resto) => {
              const imageKey = `${resto.name}-${resto.address || city}-${selectedCuisine}`; 
              const imageData = restaurantImageData[imageKey];
              return (
                <RestaurantCard 
                  key={imageKey} 
                  restaurant={resto}
                  city={city} // Pasar la ciudad a la tarjeta
                  imageDataUri={imageData?.dataUri}
                  isImageLoading={imageData?.loading}
                  imageError={imageData?.error}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {!isRestaurantsLoading && !error && (
        <>
          {hasSearched && restaurants.length === 0 && (
            <div className="text-center py-10 w-full max-w-3xl">
              <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">
                No se encontraron restaurantes que coincidan con tus criterios en {city}.
              </p>
              <p className="text-muted-foreground">Intenta con diferentes opciones de cocina, sub-cocina o ciudad.</p>
            </div>
          )}

          {!hasSearched && (
            <div className="text-center py-10 w-full max-w-3xl mt-8">
              <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">
                Comienza seleccionando un tipo de cocina e ingresando una ciudad para descubrir restaurantes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
