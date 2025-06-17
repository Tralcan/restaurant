
"use client";

import Image from 'next/image';
import type { FindRestaurantsWithAmbianceOutput } from '@/ai/flows/find-restaurants-with-ambiance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Star, ImageIcon, AlertTriangle, DollarSign, ExternalLink } from 'lucide-react';

type Restaurant = FindRestaurantsWithAmbianceOutput[0];

interface RestaurantCardProps {
  restaurant: Restaurant;
  city: string; // Nueva prop para la ciudad
  imageDataUri?: string;
  isImageLoading?: boolean;
  imageError?: string;
}

export function RestaurantCard({ restaurant, city, imageDataUri, isImageLoading, imageError }: RestaurantCardProps) {
  const displayRating = restaurant.rating ? Math.round(restaurant.rating * 2) / 2 : null; // Rounds to nearest 0.5
  const cleanedPhoneNumber = restaurant.phoneNumber ? restaurant.phoneNumber.replace(/\D/g, '') : '';

  const renderImageContent = () => {
    if (isImageLoading) {
      return (
        <div className="relative w-full h-full bg-muted flex items-center justify-center animate-pulse">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>
      );
    }
    if (imageError) {
      return (
        <div className="relative w-full h-full bg-destructive/10 flex flex-col items-center justify-center text-center p-2">
          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-xs text-destructive-foreground">Error al cargar imagen</p>
        </div>
      );
    }
    
    const src = imageDataUri || restaurant.imageUrl || 'https://placehold.co/600x400.png';
    const aiHint = imageDataUri ? undefined : restaurant.name?.toLowerCase().split(" ").slice(0,2).join(" ") || "restaurant food";

    return (
      <Image
        src={src}
        alt={`Imagen de ${restaurant.name}`}
        layout="fill"
        objectFit="cover"
        className={cn(
          "transition-transform duration-300 ease-in-out",
          restaurant.websiteUrl && "group-hover:scale-105" 
        )}
        data-ai-hint={aiHint}
        onError={(e) => { 
          if (!imageDataUri) { 
            const target = e.target as HTMLImageElement;
            target.srcset = 'https://placehold.co/600x400.png'; 
            target.src = 'https://placehold.co/600x400.png';
          }
        }}
      />
    );
  };

  const googleSearchQuery = `restaurant ${restaurant.name} ${city}`;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col h-full bg-card/80 backdrop-blur-sm">
      <div className="relative w-full h-48 md:h-56">
        {restaurant.websiteUrl ? (
          <a
            href={restaurant.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visitar el sitio web de ${restaurant.name}`}
            className="block group h-full w-full"
          >
            {renderImageContent()}
          </a>
        ) : (
          renderImageContent()
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        <CardTitle className={cn(
          "absolute bottom-4 left-4 text-primary-foreground text-xl lg:text-2xl font-bold drop-shadow-md"
        )}>
          <a
            href={`https://www.google.cl/search?q=${encodeURIComponent(googleSearchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
            onClick={(e) => e.stopPropagation()} 
            aria-label={`Buscar ${restaurant.name} en Google`}
          >
            {restaurant.name}
          </a>
        </CardTitle>
      </div>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          {restaurant.description && (
            <CardDescription className="text-muted-foreground mb-3 text-sm leading-relaxed">
              {restaurant.description}
            </CardDescription>
          )}
          
          {(displayRating !== null || (restaurant.reviewCount !== undefined && restaurant.reviewCount !== null)) && (
            <div className="flex items-center mb-2">
              {displayRating !== null && Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-5 h-5",
                    i < displayRating
                      ? "text-accent fill-accent"
                      : "text-muted-foreground/50"
                  )}
                  style={ i + 0.5 === displayRating ? { clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'} : {}}
                />
              ))}
              {restaurant.reviewCount !== undefined && restaurant.reviewCount !== null && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({restaurant.reviewCount} {restaurant.reviewCount === 1 ? "reseña" : "reseñas"})
                </span>
              )}
            </div>
          )}
          
          {restaurant.priceLevel && (
            <div className="flex items-center text-sm text-muted-foreground mb-3">
              <DollarSign className="w-4 h-4 mr-2 text-accent shrink-0" />
              <span className="font-semibold mr-1 text-accent">Precio:</span>
              <span className="font-bold text-foreground">{restaurant.priceLevel}</span>
            </div>
          )}

           {restaurant.address && (
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <MapPin className="w-4 h-4 mr-2 text-accent shrink-0" />
              <span>{restaurant.address}</span>
            </div>
           )}
          {restaurant.phoneNumber && (
            <div className="flex items-center text-sm text-muted-foreground mb-3">
              <Phone className="w-4 h-4 mr-2 text-accent shrink-0" />
              <a href={`tel:${cleanedPhoneNumber}`} className="hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded">
                {restaurant.phoneNumber}
              </a>
            </div>
          )}
          {restaurant.websiteUrl && (
             <div className="flex items-center text-sm text-muted-foreground mt-1">
              <ExternalLink className="w-4 h-4 mr-2 text-accent shrink-0" />
              <a 
                href={restaurant.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded truncate"
                title={restaurant.websiteUrl}
              >
                Visitar sitio web
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
