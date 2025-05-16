
"use client";

import Image from 'next/image';
import type { FindRestaurantsWithAmbianceOutput } from '@/ai/flows/find-restaurants-with-ambiance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Utensils } from 'lucide-react'; // Added Phone icon

type Restaurant = FindRestaurantsWithAmbianceOutput[0];

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col h-full bg-card/80 backdrop-blur-sm">
      <div className="relative w-full h-48 md:h-56">
        <Image
          src={restaurant.imageUrl || 'https://placehold.co/600x400.png'}
          alt={`Ambiance of ${restaurant.name}`}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 ease-in-out group-hover:scale-105"
          data-ai-hint="restaurant night"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.srcset = 'https://placehold.co/600x400.png';
            target.src = 'https://placehold.co/600x400.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
         <CardTitle className="absolute bottom-4 left-4 text-primary-foreground text-xl lg:text-2xl font-bold drop-shadow-md">
            {restaurant.name}
          </CardTitle>
      </div>
      <CardContent className="p-4 flex-grow flex flex-col justify-between">
        <div>
          {restaurant.description && (
            <CardDescription className="text-muted-foreground mb-3 text-sm leading-relaxed">
              {restaurant.description}
            </CardDescription>
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
