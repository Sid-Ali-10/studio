"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  getDocs,
  writeBatch,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  Star, 
  CheckCircle2, 
  MoreHorizontal, 
  Reply, 
  Pencil, 
  Trash2, 
  X,
  Info,
  ShieldAlert,
  Banknote,
  Check,
  Ban,
  ShieldCheck,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, arSA, fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type Listing } from "@/components/listings/ListingCard";
import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
  id: string;
  senderId: string;
  messageText: string;
  imageUrl?: string;
  timestamp: any;
  participantIds: string[];
  isEdited?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions?: Record<string, string[]>;
}

interface ConversationData {
  id: string;
  participantIds: string[];
  listingId: string;
  listingTitle: string;
  listerId: string;
  buyerRated?: boolean;
  travelerRated?: boolean;
  buyerRating?: number;
  travelerRating?: number;
  isFinalized?: boolean;
  unreadBy?: string[];
  finalizedUsers?: string[];
  deletedBy?: string[];
  agreedPrice?: number;
  offeredPrice?: number;
  offerSenderId?: string;
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { user, profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [convData, setConvData] = useState<ConversationData | null>(null);
  
  const [currentCommission, setCurrentCommission] = useState(1000);
  
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportType, setReportType] = useState("other");
  const [isReporting, setIsReporting] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const dateLocale = language === 'ar' ? arSA : language === 'fr' ? fr : enUS;

  const isAdminView = profile?.isAdmin && !participants.includes(user?.uid || "");
  const isLister = user?.uid === listing?.listerId;
  const hasUserRated = isLister ? convData?.travelerRated : convData?.buyerRated;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !id) return;

    let unsubscribeMessages: () => void;
    let unsubscribeConv: () => void;

    const setupChat = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const conversationId = id;
        const convRef = doc(db, "conversations", conversationId);
        
        const settingsSnap = await getDoc(doc(db, "settings", "config"));
        if (settingsSnap.exists()) {
          setCurrentCommission(settingsSnap.data().defaultCommission || 1000);
        }

        unsubscribeConv = onSnapshot(convRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ConversationData;
            setConvData(data);
            setParticipants(data.participantIds);
            
            if (data.unreadBy?.includes(user.uid) && data.participantIds.includes(user.uid)) {
              updateDoc(convRef, {
                unreadBy: arrayRemove(user.uid)
              });
            }
          } else {
            router.push("/chat");
          }
        }, (error) => {
          if (error.code !== 'permission-denied') {
            console.error("Chat listener error:", error);
          }
        });

        const convSnap = await getDoc(convRef);
        if (convSnap.exists()) {
          const data = convSnap.data() as ConversationData;
          setActiveConvId(conversationId);
          
          const otherUserId = data.participantIds.find(p => p !== user.uid) || data.participantIds[0];
          if (otherUserId) {
            const otherUserDoc = await getDoc(doc(db, "userProfiles", otherUserId));
            if (otherUserDoc.exists()) setOtherUser(otherUserDoc.data());
          }

          const lDoc = await getDoc(doc(db, "listings", data.listingId));
          if (lDoc.exists()) {
            setListing({ id: lDoc.id, ...lDoc.data() } as Listing);
          }

          const messagesRef = collection(db, "conversations", conversationId, "messages");
          const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

          unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);
          }, (error) => {
            if (error.code !== 'permission-denied') {
              console.error("Messages listener error:", error);
            }
            setLoading(false);
          });
        } else {
          setError(t('conv_not_found'));
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
        setError(t('access_restricted'));
      }
    };

    setupChat();
    return () => {
      unsubscribeMessages?.();
      unsubscribeConv?.();
    };
  }, [id, user, profile?.isAdmin]);

  const handleMakeOffer = async () => {
    if (!offerPrice || isNaN(Number(offerPrice)) || !activeConvId) return;
    try {
      await updateDoc(doc(db, "conversations", activeConvId), {
        offeredPrice: Number(offerPrice),
        offerSenderId: user?.uid,
        updatedAt: serverTimestamp()
      });
      setIsOfferDialogOpen(false);
      setOfferPrice("");
      toast({ title: t('offer_sent') });
    } catch (err) {
      toast({ variant: "destructive", title: t('offer_failed') });
    }
  };

  const handleRespondToOffer = async (accepted: boolean) => {
    if (!activeConvId || !convData) return;
    try {
      const updates: any = {
        offeredPrice: null,
        offerSenderId: null,
        updatedAt: serverTimestamp()
      };
      if (accepted) {
        updates.agreedPrice = convData.offeredPrice;
      }
      await updateDoc(doc(db, "conversations", activeConvId), updates);
      toast({ 
        title: accepted ? t('offer_accepted') : t('offer_rejected')
      });
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, imageUrl?: string) => {
    if (isAdminView) return;
    if (e) e.preventDefault();
    if (editingMessage) { handleSaveEdit(); return; }
    if ((!newMessage.trim() && !imageUrl) || !user || !activeConvId) return;

    const otherUserId = participants.find(p => p !== user.uid);

    const msgData: any = {
      conversationId: activeConvId,
      senderId: user.uid,
      messageText: newMessage,
      imageUrl: imageUrl || null,
      timestamp: serverTimestamp(),
      participantIds: participants
    };

    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.messageText || "Image",
        senderName: replyingTo.senderId === user.uid ? (language === 'en' ? "You" : language === 'ar' ? "أنت" : "Vous") : (otherUser?.username || "User")
      };
    }

    try {
      const text = newMessage;
      setNewMessage("");
      setReplyingTo(null);
      await addDoc(collection(db, "conversations", activeConvId, "messages"), msgData);
      await updateDoc(doc(db, "conversations", activeConvId), {
        lastMessageText: imageUrl ? "📷 Image" : text,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadBy: arrayUnion(otherUserId),
        deletedBy: [] 
      });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleEditInit = (msg: Message) => {
    if (isAdminView) return;
    setEditingMessage(msg);
    setNewMessage(msg.messageText);
  };

  const handleSaveEdit = async () => {
    if (isAdminView || !editingMessage || !activeConvId || !newMessage.trim()) return;
    try {
      const msgRef = doc(db, "conversations", activeConvId, "messages", editingMessage.id);
      await updateDoc(msgRef, {
        messageText: newMessage,
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingMessage(null);
      setNewMessage("");
      toast({ title: t('msg_updated') });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConvId) return;
    try {
      await deleteDoc(doc(db, "conversations", activeConvId, "messages", messageId));
      toast({ title: t('msg_deleted') });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId || !user || !convData) return;
    if (!confirm(t('confirm_delete'))) return;

    try {
      const deletedByList = [...(convData.deletedBy || []), user.uid];
      const convRef = doc(db, "conversations", activeConvId);

      if (deletedByList.length >= convData.participantIds.length || profile?.isAdmin) {
        const batch = writeBatch(db);
        const messagesSnap = await getDocs(collection(db, "conversations", activeConvId, "messages"));
        messagesSnap.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(convRef);
        await batch.commit();
      } else {
        await updateDoc(convRef, {
          deletedBy: arrayUnion(user.uid)
        });
      }
      
      router.push(profile?.isAdmin ? "/admin/dashboard" : "/chat");
      toast({ title: t('conv_removed') });
    } catch (err) {
      console.error("Deletion failed:", err);
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleRateDeal = async () => {
    if (isAdminView || !activeConvId || !user || !convData) return;
    
    if (!convData.agreedPrice) {
      toast({ variant: "destructive", title: t('incomplete_deal') });
      return;
    }

    const agreedPrice = convData.agreedPrice;
    
    if (!isLister) {
      if ((profile?.walletBalance || 0) < agreedPrice) {
        toast({
          variant: "destructive",
          title: t('insufficient_balance'),
        });
        return;
      }
    }

    setRatingLoading(true);
    try {
      const updateObj: any = isLister 
        ? { travelerRated: true, travelerRating: ratingStars } 
        : { buyerRated: true, buyerRating: ratingStars };

      await updateDoc(doc(db, "conversations", activeConvId), updateObj);
      
      await addDoc(collection(db, "ratings"), {
        raterId: user.uid,
        ratedUserId: otherUser?.id,
        listingId: listing?.id,
        stars: ratingStars,
        createdAt: serverTimestamp()
      });

      toast({ title: t('rating_saved') });
      setIsRatingOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    } finally {
      setRatingLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdminView) return;
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `conversations/${activeConvId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleSendMessage(undefined, url);
    } catch (err: any) {
      toast({ variant: "destructive", title: t('failed') });
    } finally {
      setUploading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!user || !activeConvId || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const reportsRef = collection(db, "reports");
      await addDoc(reportsRef, {
        reporterId: user.uid,
        conversationId: activeConvId,
        targetUserId: otherUser?.id || null,
        type: reportType,
        reason: reportReason,
        status: "pending",
        createdAt: serverTimestamp()
      });
      toast({ 
        title: t('report_sent')
      });
      setIsReportOpen(false);
      setReportReason("");
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="animate-spin text-primary" size={40} /><p className="text-muted-foreground">{t('loading_conversations') || "..."}</p></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"><AlertCircle size={40} className="text-destructive" /><h2 className="text-xl font-bold">{t('error')}</h2><p>{error}</p><Button onClick={() => router.push("/chat")}>{t('browse_board')}</Button></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      {isAdminView ? (
        <Alert variant="destructive" className="mb-4 rounded-2xl bg-destructive/5 border-destructive/20 animate-in fade-in duration-300">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Administrative View Only</AlertTitle>
          <AlertDescription className="text-xs">
            You are monitoring this conversation for quality and safety purposes. Actions are restricted.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mb-4 flex items-center gap-2 justify-center py-2 px-4 bg-muted/30 rounded-xl text-[10px] text-muted-foreground font-medium uppercase tracking-wider animate-in slide-in-from-top-2">
          <ShieldCheck size={12} className="text-primary" />
          {t('admin_monitor_notice')}
        </div>
      )}

      <div className="flex items-center gap-3 pb-4 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="rounded-full hover:bg-accent transition-all duration-200 active:scale-[0.98]"
        >
          <ArrowLeft size={20} className={cn(isRTL && "rotate-180")} />
        </Button>
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary border border-primary/20">
          {otherUser?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0 text-start">
          <h2 className="font-bold truncate text-sm sm:text-base">{otherUser?.username || "Private User"}</h2>
          <button 
            onClick={() => setIsDetailsOpen(true)} 
            className="text-[10px] sm:text-xs text-muted-foreground truncate italic hover:text-primary flex items-center gap-1 transition-all duration-200 active:opacity-70"
          >
            {listing?.title || t('listing_details')} <Info size={10} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isAdminView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-all duration-200 active:scale-[0.98] hover:bg-accent">
                  <MoreHorizontal size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl p-2 w-48 shadow-xl border-none">
                <DropdownMenuItem className="gap-2 rounded-lg text-destructive transition-colors hover:bg-destructive/5 focus:bg-destructive/10" onClick={() => setIsReportOpen(true)}>
                  <Flag size={14} /> {t('report_problem')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 rounded-lg text-destructive transition-colors hover:bg-destructive/5 focus:bg-destructive/10" onClick={handleDeleteConversation}>
                  <Trash2 size={14} /> {t('delete_chat')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!convData?.isFinalized && !isAdminView && (
            <div className="flex gap-1">
              {convData?.agreedPrice ? (
                <Button 
                  variant={hasUserRated ? "outline" : "default"}
                  size="sm" 
                  className="rounded-full gap-2 font-bold shadow-sm transition-all active:scale-[0.98]"
                  onClick={() => !hasUserRated && setIsRatingOpen(true)}
                  disabled={hasUserRated}
                >
                  <CheckCircle2 size={16} />
                  <span className="hidden sm:inline">{hasUserRated ? t('rated') : t('complete_deal')}</span>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full gap-2 font-bold transition-all active:scale-[0.98]" onClick={() => setIsOfferDialogOpen(true)}>
                  <Banknote size={16} /> <span className="hidden sm:inline">{t('price_offer')}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {convData?.offeredPrice && (
        <Alert className="mt-4 rounded-2xl bg-primary/5 border-primary/20 animate-in slide-in-from-top duration-300">
          <Banknote className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold text-primary flex items-center justify-between">
            {t('new_price_offer')}
            <span className="text-lg">{convData.offeredPrice} {t('currency_da')}</span>
          </AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between">
            <span className="text-xs">{convData.offerSenderId === user?.uid ? t('offer_sent_notice') : `${otherUser?.username} ${t('offer_received_notice')}`}</span>
            {convData.offerSenderId !== user?.uid && !isAdminView && (
              <div className="flex gap-2">
                <Button size="sm" className="h-8 rounded-lg gap-1 transition-all active:scale-[0.98]" onClick={() => handleRespondToOffer(true)}>
                  <Check size={14} /> {t('accept')}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1 text-destructive hover:bg-destructive/10 transition-all active:scale-[0.98]" onClick={() => handleRespondToOffer(false)}>
                  <Ban size={14} /> {t('reject')}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {convData?.agreedPrice && (
        <div className="mt-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{t('agreed_price_label')}</span>
          <span className="font-black text-emerald-700">{convData.agreedPrice} {t('currency_da')}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          const editAllowed = !isAdminView && isOwn && (Date.now() - (msg.timestamp?.toDate().getTime() || 0)) < (10 * 60 * 1000);
          return (
            <div key={msg.id} className={cn("flex flex-col group", isOwn ? "items-end" : "items-start")}>
              {msg.replyTo && (
                <div className={cn("text-[10px] text-muted-foreground mb-1 flex items-center gap-1 max-w-[70%]", isOwn ? "flex-row-reverse" : "flex-row")}>
                  <Reply size={10} />
                  <span className="truncate italic">{t('reply')} {msg.replyTo.senderName}: "{msg.replyTo.text}"</span>
                </div>
              )}
              <div className={cn("flex items-end gap-1 w-full relative", isOwn ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl relative break-words whitespace-pre-wrap transition-all duration-200 shadow-sm",
                  isOwn ? "bg-primary text-white rounded-tr-none hover:bg-primary/90" : "bg-card text-foreground rounded-tl-none border hover:bg-accent"
                )}>
                  {msg.imageUrl && <img src={msg.imageUrl} alt="Chat" className="rounded-lg mb-2 max-w-full h-auto" />}
                  {msg.messageText && <p className="text-sm">{msg.messageText}{msg.isEdited && <span className="text-[9px] opacity-70 ml-2">({t('edit')})</span>}</p>}
                  <span className={cn("text-[9px] mt-1 block opacity-60", isOwn ? "text-right" : "text-left")}>
                    {msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm", { locale: dateLocale }) : ""}
                  </span>
                </div>
                {!isAdminView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-[0.98] hover:bg-accent">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl p-2 w-48 shadow-xl border-none">
                      <DropdownMenuItem className="gap-2 rounded-lg transition-colors focus:bg-accent hover:bg-accent" onClick={() => setReplyingTo(msg)}><Reply size={14} /> {t('reply')}</DropdownMenuItem>
                      {editAllowed && <DropdownMenuItem className="gap-2 rounded-lg transition-colors focus:bg-accent hover:bg-accent" onClick={() => handleEditInit(msg)}><Pencil size={14} /> {t('edit')}</DropdownMenuItem>}
                      <DropdownMenuItem className="gap-2 text-destructive rounded-lg transition-colors focus:bg-destructive/10 hover:bg-destructive/5" onClick={() => handleDeleteMessage(msg.id)}><Trash2 size={14} /> {t('delete')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={cn("pt-4 border-t space-y-2", isAdminView && "opacity-50 pointer-events-none")}>
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-xl text-xs border-l-4 border-primary animate-in slide-in-from-bottom-2">
            <div className="flex flex-col min-w-0 text-start">
              <span className="font-bold text-primary">{t('reply')} {replyingTo.senderId === user?.uid ? t('you') : (otherUser?.username || t('user'))}</span>
              <span className="truncate italic">"{replyingTo.messageText || "Image"}"</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full transition-all duration-200 active:scale-[0.98] hover:bg-accent" onClick={() => setReplyingTo(null)}><X size={14} /></Button>
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
          <input type="file" id="image-upload" className="hidden" accept="image/*" disabled={uploading || isAdminView} onChange={handleImageUpload} />
          <label htmlFor="image-upload" className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full bg-muted cursor-pointer shrink-0 hover:bg-accent transition-all duration-200 active:scale-[0.98]",
            isAdminView && "cursor-not-allowed"
          )}>
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </label>
          <Input 
            placeholder={isAdminView ? "Admin: Read-Only" : (editingMessage ? t('edit') : t('type_message'))} 
            className="flex-1 h-11 rounded-full px-5 bg-muted border-none focus-visible:ring-primary/20 transition-all text-start" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isAdminView}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="w-11 h-11 rounded-full shadow-md transition-all duration-200 active:scale-[0.98]" 
            disabled={(!newMessage.trim() && !uploading) || isAdminView}
          >
            {editingMessage ? <CheckCircle2 size={20} /> : <Send size={20} className={cn(isRTL && "rotate-180")} />}
          </Button>
        </form>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2"><Flag className="text-destructive" /> {t('report_issue_title')}</DialogTitle>
            <DialogDescription>{t('report_issue_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-start">
            <div className="space-y-2">
              <Label>{t('issue_type')}</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="rounded-xl h-12 transition-all hover:bg-accent active:scale-[0.98]">
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="fraud">Potential Fraud</SelectItem>
                  <SelectItem value="harassment">Harassment / Bullying</SelectItem>
                  <SelectItem value="scam">Scam / Fake Post</SelectItem>
                  <SelectItem value="other">Other Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('issue_details')}</Label>
              <Textarea 
                placeholder="..."
                className="rounded-xl min-h-[100px] resize-none transition-all hover:bg-accent text-start"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-12 rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-lg transition-all active:scale-[0.98]" 
              onClick={handleReportIssue}
              disabled={isReporting || !reportReason.trim()}
            >
              {isReporting ? <Loader2 className="animate-spin" /> : t('send_report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <DialogTitle>{t('make_price_offer')}</DialogTitle>
            <DialogDescription>{t('price_offer_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Banknote className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="number"
                placeholder={t('budget')}
                className="ps-10 h-12 rounded-xl transition-all hover:bg-accent text-start"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]" onClick={handleMakeOffer}>{t('price_offer')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <DialogTitle>{t('finalize_settle')}</DialogTitle>
            <DialogDescription>{t('finalize_desc')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <button 
                key={s} 
                className={cn("transition-all duration-200 hover:scale-110 active:scale-90", ratingStars >= s ? "text-yellow-400" : "text-muted")} 
                onClick={() => setRatingStars(s)}
              >
                <Star size={40} fill={ratingStars >= s ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]" disabled={ratingLoading} onClick={handleRateDeal}>
              {ratingLoading ? <Loader2 className="animate-spin" /> : t('rate_complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="p-6 pb-2 text-start">
            <DialogTitle className="text-2xl font-bold">{t('listing_details')}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">
            {listing && <ListingDetailView listing={listing} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}