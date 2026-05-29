
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDoc, 
  doc, 
  getDocs, 
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Loader2, Info, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { enUS, arSA, fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { type Listing } from "@/components/listings/ListingCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { arrayUnion } from "firebase/firestore";

interface ChatRoom {
  id: string;
  participantIds: string[];
  lastMessageText: string;
  lastMessageTimestamp: any;
  listingId: string;
  listingTitle?: string;
  listerId?: string;
  listerName?: string;
  buyerName?: string;
  unreadBy?: string[];
  deletedBy?: string[];
  isFinalized?: boolean;
}

export default function ChatListPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const dateLocale = language === 'ar' ? arSA : language === 'fr' ? fr : enUS;

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ChatRoom));
      
      const filteredList = chatList.filter(chat => !chat.deletedBy?.includes(user.uid));
      const sortedList = filteredList.sort((a, b) => {
        const timeA = a.lastMessageTimestamp?.toMillis() || 0;
        const timeB = b.lastMessageTimestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setChats(sortedList);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error fetching conversations:", error);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; unsubscribe(); };
  }, [user]);

  const handleDeleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !confirm(t('confirm_delete'))) return;
    try {
      const chatRef = doc(db, "conversations", chatId);
      updateDocumentNonBlocking(chatRef, { deletedBy: arrayUnion(user.uid) });
      toast({ title: t('conv_removed') });
    } catch (err) { toast({ variant: "destructive", title: t('failed') }); }
  };

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    const term = searchTerm.toLowerCase();
    return chats.filter(chat => {
      const isUserLister = user?.uid === chat.listerId;
      const otherUserName = (isUserLister ? (chat.buyerName || "User") : (chat.listerName || "User")).toLowerCase();
      const listingTitle = (chat.listingTitle || "").toLowerCase();
      return otherUserName.includes(term) || listingTitle.includes(term);
    });
  }, [chats, searchTerm, user?.uid]);

  const handleShowListing = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const listingDoc = await getDoc(doc(db, "listings", listingId));
      if (listingDoc.exists()) {
        setSelectedListing({ id: listingDoc.id, ...listingDoc.data() } as Listing);
        setIsDialogOpen(true);
      }
    } catch (err) { console.error("Error fetching listing:", err); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="animate-spin text-primary" size={40} /><p className="text-muted-foreground">{t('loading_conversations')}</p></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1 text-start"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('messages')}</h1><p className="text-sm text-muted-foreground">{t('messages_subtitle')}</p></div>
        <div className="relative w-full md:w-80"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><Input placeholder={t('search_chats_placeholder')} className="ps-10 h-11 rounded-2xl bg-card border-none shadow-sm text-start" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </div>

      {chats.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-3xl py-16 text-center">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto"><MessageSquare className="text-muted-foreground" /></div>
            <h3 className="text-lg font-bold">{t('no_chats')}</h3><p className="text-muted-foreground">{t('no_chats_desc')}</p><Link href="/"><Button className="rounded-xl">{t('browse_board')}</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredChats.map((chat) => {
            const isUserLister = user?.uid === chat.listerId;
            const otherUserName = isUserLister ? (chat.buyerName || "User") : (chat.listerName || "User");
            const isUnread = chat.unreadBy?.includes(user?.uid || "");
            return (
              <Link key={chat.id} href={`/chat/${chat.id}`} className="block group">
                <Card className={cn("transition-all duration-300 border-none rounded-2xl cursor-pointer bg-card hover:shadow-lg", isUnread && "ring-2 ring-primary/20", chat.isFinalized && "opacity-75")}>
                  <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                    <div className="relative"><div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-lg sm:text-2xl">{otherUserName.charAt(0).toUpperCase()}</div>{isUnread && <div className="absolute -top-1 -start-1 w-4 h-4 bg-primary rounded-full border-2 border-white animate-pulse" />}</div>
                    <div className="flex-1 min-w-0 text-start"><div className="flex items-center justify-between mb-0.5"><h3 className={cn("font-bold text-sm sm:text-lg truncate", isUnread ? "text-primary" : "group-hover:text-primary")}>{otherUserName}</h3><span className="text-[10px] text-muted-foreground hidden sm:block">{chat.lastMessageTimestamp ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true, locale: dateLocale }) : "..."}</span></div><p className="text-xs sm:text-sm truncate font-semibold text-foreground/80">{chat.listingTitle}</p></div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"><Button variant="secondary" size="icon" className="h-9 w-9 rounded-full" onClick={(e) => handleShowListing(chat.listingId, e)}><Info size={18} /></Button><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive" onClick={(e) => handleDeleteConversation(chat.id, e)}><Trash2 size={18} /></Button></div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 pb-2"><DialogTitle className="text-2xl font-bold">{t('listing_details')}</DialogTitle></DialogHeader><div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">{selectedListing && <ListingDetailView listing={selectedListing} />}</div></DialogContent>
      </Dialog>
    </div>
  );
}
