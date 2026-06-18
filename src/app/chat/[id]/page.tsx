
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
  orderBy,
  where,
  increment,
  deleteField
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
  Flag,
  Link2,
  Smile
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  reactions?: Record<string, string[]>; // emoji: [uids]
}

interface ConversationData {
  id: string;
  participantIds: string[];
  listingId: string;
  listingTitle: string;
  listerId: string;
  buyerRated?: boolean;
  travelerRated?: boolean;
  isFinalized?: boolean;
  unreadBy?: string[];
  deletedBy?: string[];
  agreedPrice?: number;
  offeredPrice?: number;
  offerSenderId?: string;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function ChatRoomPage(props: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(props.params);
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
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [mediaLink, setMediaLink] = useState("");
  
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

    let isMounted = true;
    let unsubscribeConv: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    const setupChat = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const conversationId = id;
        const convRef = doc(db, "conversations", conversationId);
        
        unsubscribeConv = onSnapshot(convRef, (snap) => {
          if (!isMounted) return;
          if (snap.exists()) {
            const data = snap.data() as ConversationData;
            setConvData(data);
            setParticipants(data.participantIds);
            
            if (data.unreadBy?.includes(user.uid) && data.participantIds.includes(user.uid)) {
              updateDoc(convRef, { unreadBy: arrayRemove(user.uid) });
            }
          } else {
            router.push(profile?.isAdmin ? "/admin/dashboard" : "/chat");
          }
        }, (err) => {
          if (err.code !== 'permission-denied') console.error("Chat listener error:", err);
        });

        const convSnap = await getDoc(convRef);
        if (convSnap.exists()) {
          const data = convSnap.data() as ConversationData;
          if (isMounted) setActiveConvId(conversationId);
          
          const otherUserId = data.participantIds.find(p => p !== user.uid) || data.participantIds[0];
          if (otherUserId) {
            const otherUserDoc = await getDoc(doc(db, "userProfiles", otherUserId));
            if (otherUserDoc.exists() && isMounted) setOtherUser(otherUserDoc.data());
          }

          const lDoc = await getDoc(doc(db, "listings", data.listingId));
          if (lDoc.exists() && isMounted) {
            setListing({ id: lDoc.id, ...lDoc.data() } as Listing);
          }

          const messagesRef = collection(db, "conversations", conversationId, "messages");
          const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

          unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            if (!isMounted) return;
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);
          }, (err) => {
            if (err.code !== 'permission-denied') console.error("Messages listener error:", err);
            setLoading(false);
          });
        } else {
          if (isMounted) {
            setError(t('conv_not_found'));
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
          setError(t('access_restricted'));
        }
      }
    };

    setupChat();
    return () => {
      isMounted = false;
      unsubscribeConv?.();
      unsubscribeMessages?.();
    };
  }, [id, user, router, t]);

  const handleToggleReaction = async (message: Message, emoji: string) => {
    if (isAdminView || !activeConvId || !user) return;
    try {
      const msgRef = doc(db, "conversations", activeConvId, "messages", message.id);
      const currentReactions = message.reactions || {};
      const uids = currentReactions[emoji] || [];
      
      const newUids = uids.includes(user.uid) 
        ? uids.filter(uid => uid !== user.uid)
        : [...uids, user.uid];
      
      const updatedReactions = { ...currentReactions };
      if (newUids.length > 0) {
        updatedReactions[emoji] = newUids;
      } else {
        delete updatedReactions[emoji];
      }

      await updateDoc(msgRef, { reactions: updatedReactions });
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    }
  };

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
      const updates: any = { offeredPrice: null, offerSenderId: null, updatedAt: serverTimestamp() };
      if (accepted) updates.agreedPrice = convData.offeredPrice;
      await updateDoc(doc(db, "conversations", activeConvId), updates);
      toast({ title: accepted ? t('offer_accepted') : t('offer_rejected') });
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, imageUrl?: string, customText?: string) => {
    if (isAdminView) return;
    if (e) e.preventDefault();
    if (editingMessage) { handleSaveEdit(); return; }
    
    const textToUse = customText || newMessage;
    if ((!textToUse.trim() && !imageUrl) || !user || !activeConvId) return;

    const otherUserId = participants.find(p => p !== user.uid);
    const msgData: any = {
      conversationId: activeConvId,
      senderId: user.uid,
      messageText: textToUse,
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
      const text = textToUse;
      setNewMessage("");
      setReplyingTo(null);
      await addDoc(collection(db, "conversations", activeConvId, "messages"), msgData);

      const isUrl = /^(https?:\/\/[^\s]+)$/.test(text.trim());
      let previewText = text;
      if (imageUrl) previewText = "📷 Image";
      else if (isUrl) previewText = "🔗 Link";

      await updateDoc(doc(db, "conversations", activeConvId), {
        lastMessageText: previewText,
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
      await updateDoc(msgRef, { messageText: newMessage, isEdited: true, updatedAt: serverTimestamp() });
      setEditingMessage(null);
      setNewMessage("");
      toast({ title: t('msg_updated') });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!activeConvId || !user) return;
    if (msg.senderId !== user.uid && !profile?.isAdmin) {
      toast({ variant: "destructive", title: t('error'), description: "Access Denied" });
      return;
    }

    try {
      await deleteDoc(doc(db, "conversations", activeConvId, "messages", msg.id));
      toast({ title: t('msg_deleted') });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId || !user || !convData) return;
    if (!confirm(t('confirm_delete'))) return;

    try {
      const convRef = doc(db, "conversations", activeConvId);

      if (profile?.isAdmin) {
        const batch = writeBatch(db);
        const messagesSnap = await getDocs(collection(db, "conversations", activeConvId, "messages"));
        messagesSnap.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(convRef);
        await batch.commit();
        router.push("/admin/dashboard");
      } else {
        await updateDoc(convRef, { 
          deletedBy: arrayUnion(user.uid) 
        });
        router.push("/chat");
      }
      
      toast({ title: t('conv_removed') });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleRateDeal = async () => {
    if (isAdminView || !activeConvId || !user || !convData || !listing) return;
    
    let travelerUid = listing.type === 'traveler' ? listing.listerId : (participants.find(p => p !== listing.listerId) || "");
    if (!travelerUid) return;

    const isOtherPartyRated = isLister ? convData.buyerRated : convData.travelerRated;
    const isFinalizingNow = !!isOtherPartyRated;

    if (isFinalizingNow) {
      const travelerSnap = await getDoc(doc(db, "userProfiles", travelerUid));
      if (travelerSnap.exists() && (travelerSnap.data().walletBalance || 0) < 1) {
        toast({ variant: "destructive", title: t('insufficient_balance') });
        return;
      }
    }

    setRatingLoading(true);
    try {
      const batch = writeBatch(db);
      const convRef = doc(db, "conversations", activeConvId);
      const updateObj: any = isLister ? { travelerRated: true } : { buyerRated: true };
      batch.update(convRef, { ...updateObj, updatedAt: serverTimestamp() });

      const ratingRef = doc(collection(db, "ratings"));
      batch.set(ratingRef, { raterId: user.uid, ratedUserId: otherUser?.id, listingId: listing.id, stars: ratingStars, createdAt: serverTimestamp() });

      if (isFinalizingNow && !convData.isFinalized) {
        const travelerRef = doc(db, "userProfiles", travelerUid);
        batch.update(travelerRef, { walletBalance: increment(-1), successfulDealsCount: increment(1), updatedAt: serverTimestamp() });

        const travelerTxRef = doc(collection(db, "userProfiles", travelerUid, "transactions"));
        batch.set(travelerTxRef, { amount: -1, type: "payment", description: t('marketplace_fee') + `: ${listing.title}`, createdAt: serverTimestamp() });

        const adminsSnap = await getDocs(query(collection(db, "userProfiles"), where("isAdmin", "==", true)));
        if (!adminsSnap.empty) {
          const adminId = adminsSnap.docs[0].id;
          batch.update(doc(db, "userProfiles", adminId), { walletBalance: increment(1), updatedAt: serverTimestamp() });
        }
        batch.update(convRef, { isFinalized: true });
      }

      await batch.commit();
      toast({ title: t('rating_saved') });
      if (isFinalizingNow) toast({ title: t('deal_finalized') });
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
      await addDoc(collection(db, "reports"), {
        reporterId: user.uid,
        conversationId: activeConvId,
        targetUserId: otherUser?.id || null,
        type: reportType,
        reason: reportReason,
        status: "pending",
        createdAt: serverTimestamp()
      });
      toast({ title: t('report_sent') });
      setIsReportOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    } finally {
      setIsReporting(false);
    }
  };

  const handleAddLink = () => {
    if (!mediaLink.trim()) return;
    handleSendMessage(undefined, undefined, mediaLink);
    setIsLinkDialogOpen(false);
    setMediaLink("");
  };

  const renderContent = (text: string, isOwn: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
    const isVideo = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    const isYoutube = (url: string) => url.includes('youtube.com/watch') || url.includes('youtu.be/');

    if (!text) return null;

    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        if (isImage(part)) return <img key={i} src={part} alt="Media" className="rounded-lg max-w-full h-auto my-2" />;
        if (isVideo(part)) return <video key={i} src={part} controls className="rounded-lg max-w-full h-auto my-2" />;
        if (isYoutube(part)) {
          const videoId = part.includes('v=') ? part.split('v=')[1].split('&')[0] : part.split('/').pop();
          return (
            <div key={i} className="aspect-video w-full my-2">
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={cn("underline break-all", isOwn ? "text-white/90" : "text-primary")}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="animate-spin text-primary" size={40} /><p className="text-muted-foreground">{t('loading_conversations')}</p></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"><AlertCircle size={40} className="text-destructive" /><h2 className="text-xl font-bold">{t('error')}</h2><p>{error}</p><Button onClick={() => router.push("/chat")}>{t('browse_board')}</Button></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      {isAdminView ? (
        <Alert variant="destructive" className="mb-4 rounded-2xl bg-destructive/5 border-destructive/20">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Administrative View Only</AlertTitle>
          <AlertDescription className="text-xs">Monitoring for quality and safety purposes.</AlertDescription>
        </Alert>
      ) : (
        <div className="mb-4 flex items-center gap-2 justify-center py-2 px-4 bg-muted/30 rounded-xl text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          <ShieldCheck size={12} className="text-primary" /> {t('admin_monitor_notice')}
        </div>
      )}

      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft size={20} className={cn(isRTL && "rotate-180")} /></Button>
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">{otherUser?.username?.charAt(0).toUpperCase() || "U"}</div>
        <div className="flex-1 min-w-0 text-start">
          <h2 className="font-bold truncate text-sm sm:text-base">{otherUser?.username || "Private User"}</h2>
          <button onClick={() => setIsDetailsOpen(true)} className="text-[10px] sm:text-xs text-muted-foreground truncate italic hover:text-primary flex items-center gap-1">{listing?.title || t('listing_details')} <span className={cn(isRTL ? "mr-1" : "ml-1")}><Info size={10} /></span></button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={20} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl p-2 w-48 shadow-xl border-none">
              {!isAdminView && (
                <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => setIsReportOpen(true)}><Flag size={14} /> {t('report_problem')}</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={handleDeleteConversation}><Trash2 size={14} /> {t('delete_chat')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!convData?.isFinalized && !isAdminView && (
            <div className="flex gap-1">
              {convData?.agreedPrice ? (
                <Button variant={hasUserRated ? "outline" : "default"} size="sm" className="rounded-full gap-2 font-bold" onClick={() => !hasUserRated && setIsRatingOpen(true)} disabled={hasUserRated}><CheckCircle2 size={16} /> <span className="hidden sm:inline">{hasUserRated ? t('rated') : t('complete_deal')}</span></Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full gap-2 font-bold" onClick={() => setIsOfferDialogOpen(true)}><Banknote size={16} /> <span className="hidden sm:inline">{t('price_offer')}</span></Button>
              )}
            </div>
          )}
        </div>
      </div>

      {convData?.offeredPrice && (
        <Alert className="mt-4 rounded-2xl bg-primary/5 border-primary/20">
          <Banknote className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold text-primary flex items-center justify-between">{t('new_price_offer')} <span className="text-lg">{convData.offeredPrice} {t('currency_da')}</span></AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between">
            <span className="text-xs">{convData.offerSenderId === user?.uid ? t('offer_sent_notice') : `${otherUser?.username} ${t('offer_received_notice')}`}</span>
            {convData.offerSenderId !== user?.uid && !isAdminView && (
              <div className="flex gap-2">
                <Button size="sm" className="h-8 rounded-lg gap-1" onClick={() => handleRespondToOffer(true)}><Check size={14} /> {t('accept')}</Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1 text-destructive" onClick={() => handleRespondToOffer(false)}><Ban size={14} /> {t('reject')}</Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {convData?.agreedPrice && (
        <div className="mt-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{t('agreed_price_label')}</span>
          <span className="font-black text-emerald-700">{convData.agreedPrice} {t('currency_da')}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          const canDelete = isOwn || profile?.isAdmin;
          const reactions = msg.reactions || {};

          return (
            <div key={msg.id} className={cn("flex flex-col group", isOwn ? "items-end" : "items-start")}>
              <div className={cn("flex items-end gap-1 w-full relative", isOwn ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl relative break-words shadow-sm", isOwn ? "bg-primary text-white rounded-tr-none" : "bg-card text-foreground rounded-tl-none border")}>
                  {msg.replyTo && (
                    <div className={cn("text-[10px] mb-2 p-2 rounded-lg border-s-4 bg-black/5 flex flex-col", isOwn ? "border-white/40" : "border-primary/40")}>
                      <span className="font-bold opacity-70">{msg.replyTo.senderName}</span>
                      <span className="truncate opacity-80">{msg.replyTo.text}</span>
                    </div>
                  )}
                  {msg.imageUrl && <img src={msg.imageUrl} alt="Chat" className="rounded-lg mb-2 max-w-full h-auto" />}
                  {msg.messageText && <div className="text-sm">{renderContent(msg.messageText, isOwn)}</div>}
                  
                  <div className={cn("flex items-center justify-between mt-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[9px] opacity-60">{msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm", { locale: dateLocale }) : ""}</span>
                    {msg.isEdited && <span className="text-[8px] opacity-40 italic">{t('edited')}</span>}
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className={cn("absolute -bottom-3 flex flex-wrap gap-1", isOwn ? "right-0" : "left-0")}>
                      {Object.entries(reactions).map(([emoji, uids]) => (
                        <button 
                          key={emoji} 
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border shadow-sm transition-all",
                            uids.includes(user?.uid || "") ? "bg-primary/10 border-primary/30 text-primary scale-110 z-10" : "bg-card border-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          <span>{emoji}</span>
                          <span className="font-bold">{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isAdminView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all"><MoreHorizontal size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl p-2 w-48 shadow-xl border-none">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2 rounded-lg"><Smile size={14} /> {t('react')}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="rounded-xl p-1 flex gap-1">
                          {COMMON_EMOJIS.map(emoji => (
                            <button 
                              key={emoji} 
                              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg transition-all active:scale-125"
                              onClick={() => handleToggleReaction(msg, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => setReplyingTo(msg)}><Reply size={14} /> {t('reply')}</DropdownMenuItem>
                      {isOwn && <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleEditInit(msg)}><Pencil size={14} /> {t('edit')}</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      {canDelete && (
                        <DropdownMenuItem className="gap-2 text-destructive rounded-lg" onClick={() => handleDeleteMessage(msg)}><Trash2 size={14} /> {t('delete')}</DropdownMenuItem>
                      )}
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
          <div className="mx-2 p-3 bg-muted/50 rounded-xl flex items-center justify-between border-s-4 border-primary animate-in slide-in-from-bottom-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary">{t('replying_to')} {replyingTo.senderId === user?.uid ? t('you') : (otherUser?.username || "User")}</span>
              <span className="text-xs truncate text-muted-foreground">{replyingTo.messageText || "Image"}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}><X size={14} /></Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 shrink-0">
            <input type="file" id="image-upload" className="hidden" accept="image/*" disabled={uploading || isAdminView} onChange={handleImageUpload} />
            <label htmlFor="image-upload" className="flex items-center justify-center w-11 h-11 rounded-full bg-muted cursor-pointer shrink-0 transition-all active:scale-95">{uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}</label>
            <Button type="button" variant="ghost" size="icon" className="w-11 h-11 rounded-full bg-muted shrink-0 transition-all active:scale-95" onClick={() => setIsLinkDialogOpen(true)} disabled={isAdminView}>
              <Link2 size={20} />
            </Button>
          </div>
          <form className="flex-1 flex gap-2" onSubmit={handleSendMessage}>
            <Input placeholder={isAdminView ? "Admin: Read-Only" : t('type_message')} className="flex-1 h-11 rounded-full px-5 bg-muted border-none text-start" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isAdminView} />
            <Button type="submit" size="icon" className="w-11 h-11 rounded-full shadow-md shrink-0" disabled={(!newMessage.trim() && !uploading) || isAdminView}>{editingMessage ? <CheckCircle2 size={20} /> : <Send size={20} className={cn(isRTL && "rotate-180")} />}</Button>
          </form>
        </div>
      </div>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none">
          <DialogHeader className="text-start">
            <DialogTitle>{t('insert_link_title')}</DialogTitle>
            <DialogDescription>{t('insert_link_desc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder={t('link_placeholder')} 
              className="rounded-xl h-12 text-start" 
              value={mediaLink} 
              onChange={(e) => setMediaLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={handleAddLink} disabled={!mediaLink.trim()}>
              {t('add_link')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none">
          <DialogHeader className="text-start"><DialogTitle className="flex items-center gap-2"><Flag className="text-destructive" /> {t('report_issue_title')}</DialogTitle><DialogDescription>{t('report_issue_desc')}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4 text-start">
            <div className="space-y-2"><Label>{t('issue_type')}</Label><Select value={reportType} onValueChange={setReportType}><SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="..." /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="fraud">Fraud</SelectItem><SelectItem value="harassment">Harassment</SelectItem><SelectItem value="scam">Scam</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>{t('issue_details')}</Label><Textarea placeholder="..." className="rounded-xl min-h-[100px] resize-none text-start" value={reportReason} onChange={(e) => setReportReason(e.target.value)} /></div>
          </div>
          <DialogFooter><Button className="w-full h-12 rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-lg" onClick={handleReportIssue} disabled={isReporting || !reportReason.trim()}>{isReporting ? <Loader2 className="animate-spin" /> : t('send_report')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none">
          <DialogHeader className="text-start"><DialogTitle>{t('make_price_offer')}</DialogTitle><DialogDescription>{t('price_offer_desc')}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4"><div className="relative"><Banknote className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><Input type="number" placeholder={t('budget')} className="ps-10 h-12 rounded-xl text-start" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} /></div></div>
          <DialogFooter><Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={handleMakeOffer}>{t('price_offer')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-none">
          <DialogHeader className="text-start"><DialogTitle>{t('finalize_settle')}</DialogTitle><DialogDescription>{t('finalize_desc')}</DialogDescription></DialogHeader>
          <div className="flex justify-center gap-2 py-8">{[1, 2, 3, 4, 5].map((s) => (<button key={s} className={cn("transition-all duration-200 hover:scale-110", ratingStars >= s ? "text-yellow-400" : "text-muted")} onClick={() => setRatingStars(s)}><Star size={40} fill={ratingStars >= s ? "currentColor" : "none"} /></button>))}</div>
          <DialogFooter><Button className="w-full h-12 rounded-xl font-bold shadow-lg" disabled={ratingLoading} onClick={handleRateDeal}>{ratingLoading ? <Loader2 className="animate-spin" /> : t('rate_complete')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none"><DialogHeader className="p-6 pb-2 text-start"><DialogTitle className="text-2xl font-bold">{t('listing_details')}</DialogTitle></DialogHeader><div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">{listing && <ListingDetailView listing={listing} />}</div></DialogContent>
      </Dialog>
    </div>
  );
}
