
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plane,
  ShoppingBag,
  MapPin,
  Calendar,
  Weight,
  Star,
  Heart,
  MessageSquare,
  Trash2,
  Edit,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export interface Listing {
  id: string;
  type: 'traveler' | 'buyer';
  title: string;
  description: string;
  city?: string;
  destination?: string;
  date?: string;
  weight?: string;
  price?: string;
  listerId: string;
  userName: string;
  userRating: number;
  createdAt: any;
}

interface ListingCardProps {
  listing: Listing;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ListingCard({ listing, isFavorited, onToggleFavorite, onDelete }: ListingCardProps) {
  const { user, profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  const isOwner = user?.uid === listing.listerId;

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Auth required', description: 'Log in to connect.' });
      return;
    }

    setIsConnecting(true);
    const participants = [user.uid, listing.listerId].sort();
    const convoId = `${participants[0]}_${participants[1]}_${listing.id}`;

    const convoData = {
      id: convoId,
      participantIds: participants,
      listingId: listing.id,
      listingTitle: listing.title,
      listerId: listing.listerId,
      listerName: listing.userName,
      buyerName: profile?.username || user.email?.split('@')[0] || 'User',
      lastMessageText: 'Conversation started',
      lastMessageTimestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unreadBy: [listing.listerId],
    };

    try {
      setDocumentNonBlocking(doc(db, 'conversations', convoId), convoData, { merge: true });
      setHasConnected(true);
      toast({
        title: t('connected'),
        description: "View chat in Messages.",
        action: <ToastAction altText="Open" onClick={() => router.push(`/chat/${convoId}`)}>Open Chat</ToastAction>,
      });
    } catch (err) {
      // Error handled
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="listing-card overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              'mb-2 uppercase text-[10px] tracking-widest px-3 py-1 rounded-full border-none font-bold',
              listing.type === 'traveler' ? 'bg-primary text-white' : 'bg-accent text-white'
            )}
          >
            {listing.type === 'traveler' ? <Plane size={12} className={isRTL ? "ml-1.5" : "mr-1.5"} /> : <ShoppingBag size={12} className={isRTL ? "ml-1.5" : "mr-1.5"} />}
            <span>{t(listing.type)}</span>
          </Badge>
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite?.(listing.id); }}
            className={cn('p-2 rounded-full transition-all', isFavorited ? 'text-red-500' : 'text-muted-foreground')}
          >
            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        </div>
        <CardTitle className="text-xl line-clamp-1">{listing.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{listing.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe size={16} className="text-primary shrink-0" />
            <span className="truncate"><span className="font-bold opacity-70 text-[10px] uppercase">{t('from')}:</span> {listing.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={16} className="text-primary shrink-0" />
            <span className="truncate"><span className="font-bold opacity-70 text-[10px] uppercase">{t('to')}:</span> {listing.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={16} className="text-primary shrink-0" />
            <span className="truncate"><span className="font-bold opacity-70 text-[10px] uppercase">{t('arriving')}:</span> {listing.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {listing.type === 'traveler' ? <Weight size={16} className="text-primary shrink-0" /> : <ShoppingBag size={16} className="text-accent shrink-0" />}
            <span className="truncate"><span className="font-bold opacity-70 text-[10px] uppercase">{listing.type === 'traveler' ? t('weight') : t('budget')}:</span> {listing.type === 'traveler' ? `${listing.weight} kg` : `${listing.price} DA`}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t flex items-center justify-between bg-muted/20">
        <Link href={`/profile/${listing.listerId}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
            {listing.userName?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{listing.userName}</span>
            <div className="flex items-center gap-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /><span className="text-[10px]">{listing.userRating}</span></div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {isOwner ? (
            <>
              <Link href={`/listings/edit/${listing.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit size={16} /></Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(listing.id)}><Trash2 size={16} /></Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-2 rounded-full h-8 text-xs font-bold', hasConnected ? 'text-accent' : 'text-primary')}
              disabled={isConnecting}
              onClick={handleConnect}
            >
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : hasConnected ? <Check size={14} /> : <MessageSquare size={14} />}
              <span>{isConnecting ? '...' : hasConnected ? t('connected') : t('connect')}</span>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
