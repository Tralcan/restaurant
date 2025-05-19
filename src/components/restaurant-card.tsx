
"use client";

import Image from 'next/image';
import type { FindRestaurantsWithAmbianceOutput } from '@/ai/flows/find-restaurants-with-ambiance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Star } from 'lucide-react';

type Restaurant = FindRestaurantsWithAmbianceOutput[0];

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const displayRating = restaurant.rating ? Math.round(restaurant.rating * 2) / 2 : null; // Rounds to nearest 0.5

  const ImageAndTitleContent = () => (
    <div className="relative w-full h-48 md:h-56">
      <Image
        src={restaurant.imageUrl || 'https://placehold.co/600x400.png'}
        alt={`Ambiente de ${restaurant.name}`}
        layout="fill"
        objectFit="cover"
        className={cn(
          "transition-transform duration-300 ease-in-out",
          restaurant.websiteUrl && "group-hover:scale-105" // Apply scale only if it's a link
        )}
        data-ai-hint="restaurant night"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.srcset = 'https://placehold.co/600x400.png';
          target.src = 'https://placehold.co/600x400.png';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
      <CardTitle className={cn(
        "absolute bottom-4 left-4 text-primary-foreground text-xl lg:text-2xl font-bold drop-shadow-md",
        restaurant.websiteUrl && "group-hover:underline" // Underline on hover if it's a link
      )}>
        {restaurant.name}
      </CardTitle>
    </div>
  );

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col h-full bg-card/80 backdrop-blur-sm">
      {restaurant.websiteUrl ? (
        <a
          href={restaurant.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visitar el sitio web de ${restaurant.name}`}
          className="block group cursor-pointer" // group for hover effects
        >
          <ImageAndTitleContent />
        </a>
      ) : (
        <ImageAndTitleContent />
      )}
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          {restaurant.description && (
            <CardDescription className="text-muted-foreground mb-3 text-sm leading-relaxed">
              {restaurant.description}
            </CardDescription>
          )}
          {displayRating !== null && (
            <div className="flex items-center mb-2">
              {Array.from({ length: 5 }, (_, i) => (
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
           <div className="flex items-center text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4 mr-2 text-accent shrink-0" />
            <span>{restaurant.address}</span>
          </div>
          {restaurant.phoneNumber && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="w-4 h-4 mr-2 text-accent shrink-0" />
              <span>{restaurant.phoneNumber}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
