
"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
  increment,
  runTransaction
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle, 
  MoreHorizontal, 
  Reply, 
  Pencil, 
  Trash2, 
  X,
  Info,
  ShieldCheck,
  Flag,
  Smile,
  ImageIcon,
  ExternalLink,
  CheckCircle2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, arSA, fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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
import { type Listing } from "@/components/listings/ListingCard";
import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  unreadBy?: string[];
  isFinalized?: boolean;
  finalizedAt?: any;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const LinkPreview = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  if (!urls) return null;

  return (
    <div className="mt-2 space-y-2">
      {urls.map((url, index) => {
        const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
        if (youtubeMatch) {
          const videoId = youtubeMatch[1].split('&')[0].split('?')[0];
          return (
            <div key={index} className="rounded-xl overflow-hidden border bg-black aspect-video relative group">
              <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full border-none" allowFullScreen />
            </div>
          );
        }
        if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          return (
            <div key={index} className="rounded-xl overflow-hidden border bg-muted">
              <img src={url} alt="Preview" className="max-w-full h-auto object-contain max-h-60 mx-auto" />
            </div>
          );
        }
        return (
          <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <ExternalLink size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest truncate">Link</p>
              <p className="text-xs truncate font-medium">{url}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
};

export default function ChatRoomPage(props: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(props.params);
  const id = resolvedParams.id;
  
  const { user, profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [convData, setConvData] = useState<ConversationData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateLocale = language === 'ar' ? arSA : language === 'fr' ? fr : enUS;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdminView = profile?.isAdmin && convData && !convData.participantIds.includes(user?.uid || "");

  // Determine Roles
  const isUserLister = user?.uid === listing?.listerId;
  const isTraveler = listing?.type === 'traveler' ? isUserLister : !isUserLister;
  const isBuyer = !isTraveler;
  const travelerId = listing?.type === 'traveler' ? listing?.listerId : convData?.participantIds.find(p => p !== listing?.listerId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 160)}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    if (!user || !id) return;

    let mounted = true;
    let unsubscribeConv: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    const setupChat = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const convRef = doc(db, "conversations", id);
        unsubscribeConv = onSnapshot(convRef, async (snap) => {
          if (!mounted) return;
          if (snap.exists()) {
            const data = snap.data() as ConversationData;
            setConvData(data);
            setActiveConvId(id);
            
            if (data.unreadBy?.includes(user.uid)) {
              updateDoc(convRef, { unreadBy: arrayRemove(user.uid) });
            }

            if (!otherUser) {
              const otherUserId = data.participantIds.find(p => p !== user.uid);
              if (otherUserId) {
                const uDoc = await getDoc(doc(db, "userProfiles", otherUserId));
                if (uDoc.exists()) setOtherUser(uDoc.data());
              }
            }

            if (!listing) {
              const lDoc = await getDoc(doc(db, "listings", data.listingId));
              if (lDoc.exists()) setListing({ id: lDoc.id, ...lDoc.data() } as Listing);
            }

            if (!unsubscribeMessages) {
              const messagesQuery = query(
                collection(db, "conversations", id, "messages"), 
                orderBy("timestamp", "asc"), 
                limit(100)
              );
              unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
                if (!mounted) return;
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
                setLoading(false);
              }, (err) => {
                if (mounted) {
                  setError(t('error'));
                  setLoading(false);
                }
              });
            }
          } else {
            setTimeout(() => {
              if (mounted && !convData && loading) {
                setError(t('conv_not_found'));
                setLoading(false);
              }
            }, 3000);
          }
        }, (err) => {
          if (mounted) {
            setError(err.code === 'permission-denied' ? t('access_restricted') : t('error'));
            setLoading(false);
          }
        });
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    setupChat();
    return () => {
      mounted = false;
      unsubscribeConv?.();
      unsubscribeMessages?.();
    };
  }, [id, user, t]);

  const handleSendMessage = async (e?: React.FormEvent, customImageUrl?: string) => {
    if (isAdminView || !user || !activeConvId) return;
    if (e) e.preventDefault();
    if (editingMessage) { handleSaveEdit(); return; }
    
    if (!newMessage.trim() && !customImageUrl) return;

    const otherUserId = convData?.participantIds.find(p => p !== user.uid);
    
    const msgData: any = {
      conversationId: activeConvId,
      senderId: user.uid,
      messageText: newMessage || (customImageUrl ? "📷 Media" : ""),
      timestamp: serverTimestamp(),
      participantIds: convData?.participantIds
    };

    if (customImageUrl) {
      msgData.imageUrl = customImageUrl;
      msgData.messageText = newMessage ? `${newMessage}\n${customImageUrl}` : customImageUrl;
    }

    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.messageText,
        senderName: replyingTo.senderId === user.uid ? t('you') : (otherUser?.username || "User")
      };
    }

    try {
      setNewMessage("");
      setReplyingTo(null);
      await addDoc(collection(db, "conversations", activeConvId, "messages"), msgData);
      await updateDoc(doc(db, "conversations", activeConvId), {
        lastMessageText: msgData.messageText,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadBy: arrayUnion(otherUserId),
        deletedBy: []
      });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleFinalizeDeal = async () => {
    if (!user || !activeConvId || !travelerId || finalizing) return;
    setFinalizing(true);

    try {
      await runTransaction(db, async (transaction) => {
        const travelerRef = doc(db, "userProfiles", travelerId);
        const convRef = doc(db, "conversations", activeConvId);
        const travelerSnap = await transaction.get(travelerRef);
        
        if (!travelerSnap.exists()) throw new Error("Traveler profile not found");
        const balance = travelerSnap.data().walletBalance || 0;
        
        if (balance < 1) {
          toast({ variant: "destructive", title: t('insufficient_balance') });
          throw new Error("Insufficient balance");
        }

        // 1. Deduct credit from traveler
        transaction.update(travelerRef, {
          walletBalance: increment(-1),
          successfulDealsCount: increment(1),
          updatedAt: serverTimestamp()
        });

        // 2. Mark conversation as finalized
        transaction.update(convRef, {
          isFinalized: true,
          finalizedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 3. Add transaction record
        const txRef = doc(collection(db, "userProfiles", travelerId, "transactions"));
        transaction.set(txRef, {
          amount: -1,
          type: "payment",
          description: `Deduction for successful deal in conversation: ${listing?.title || activeConvId}`,
          createdAt: serverTimestamp()
        });

        // 4. Add rating record
        const ratingRef = doc(collection(db, "ratings"));
        transaction.set(ratingRef, {
          listingId: listing?.id,
          raterId: user.uid,
          ratedUserId: travelerId,
          stars: ratingStars,
          comment: ratingComment,
          createdAt: serverTimestamp()
        });
      });

      // Send System Message
      await addDoc(collection(db, "conversations", activeConvId, "messages"), {
        senderId: "system",
        messageText: "✅ " + t('deal_finalized'),
        timestamp: serverTimestamp(),
        participantIds: convData?.participantIds
      });

      toast({ title: t('success'), description: t('deal_finalized') });
      setIsFinalizeDialogOpen(false);
    } catch (err: any) {
      console.error("Finalize Error:", err);
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (isAdminView || !editingMessage || !activeConvId || !newMessage.trim()) return;
    try {
      await updateDoc(doc(db, "conversations", activeConvId, "messages", editingMessage.id), { 
        messageText: newMessage, 
        isEdited: true 
      });
      setEditingMessage(null);
      setNewMessage("");
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!activeConvId || msg.senderId !== user?.uid) return;
    try {
      await deleteDoc(doc(db, "conversations", activeConvId, "messages", msg.id));
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
    }
  };

  const handleToggleReaction = async (message: Message, emoji: string) => {
    if (isAdminView || !activeConvId || !user) return;
    try {
      const msgRef = doc(db, "conversations", activeConvId, "messages", message.id);
      const reactions = message.reactions || {};
      const uids = reactions[emoji] || [];
      const newUids = uids.includes(user.uid) ? uids.filter(uid => uid !== user.uid) : [...uids, user.uid];
      const updated = { ...reactions };
      if (newUids.length > 0) updated[emoji] = newUids; else delete updated[emoji];
      await updateDoc(msgRef, { reactions: updated });
    } catch (err) {
      toast({ variant: "destructive", title: t('error') });
    }
  };

  const handleInsertMediaLink = () => {
    if (mediaUrlInput.trim()) {
      handleSendMessage(undefined, mediaUrlInput.trim());
      setMediaUrlInput("");
      setIsMediaDialogOpen(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-muted-foreground">{t('loading_conversations')}</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <AlertCircle size={40} className="text-destructive" />
      <h2 className="text-xl font-bold">{t('error')}</h2>
      <p>{error}</p>
      <Button onClick={() => router.push("/chat")}>{t('browse_board')}</Button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-2 justify-center py-2 px-4 bg-muted/30 rounded-xl text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        <ShieldCheck size={12} className="text-primary" /> {t('admin_monitor_notice')}
      </div>

      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft size={20} className={cn(isRTL && "rotate-180")} /></Button>
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">{otherUser?.username?.charAt(0).toUpperCase() || "U"}</div>
        <div className="flex-1 min-w-0 text-start">
          <h2 className="font-bold truncate text-sm sm:text-base">{otherUser?.username || "Private User"}</h2>
          <button onClick={() => setIsDetailsOpen(true)} className="text-[10px] sm:text-xs text-muted-foreground truncate italic hover:text-primary flex items-center gap-1">{listing?.title || t('listing_details')} <Info size={10} /></button>
        </div>
        <div className="flex items-center gap-2">
          {isBuyer && !convData?.isFinalized && !isAdminView && (
            <Button onClick={() => setIsFinalizeDialogOpen(true)} className="rounded-xl h-9 px-4 gap-2 font-bold shadow-md animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={16} /> {t('complete_deal')}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={20} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl p-2 w-48 shadow-xl border-none">
              {!isAdminView && <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => router.push(`/chat`)}><Flag size={14} /> {t('report_problem')}</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => router.push('/chat')}><Trash2 size={14} /> {t('delete_chat')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg) => {
          if (msg.senderId === 'system') return (
            <div key={msg.id} className="flex justify-center py-2">
              <div className="px-4 py-1.5 bg-muted/50 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-muted-foreground/10">{msg.messageText}</div>
            </div>
          );

          const isOwn = !!user && msg.senderId === user.uid;
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
                  
                  <div className="text-sm whitespace-pre-wrap">{msg.messageText}</div>
                  <LinkPreview text={msg.messageText} />

                  <div className={cn("flex items-center justify-between mt-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[9px] opacity-60">{isMounted && msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm", { locale: dateLocale }) : ""}</span>
                    {msg.isEdited && <span className="text-[8px] opacity-40 italic">{t('edited')}</span>}
                  </div>
                  {Object.keys(reactions).length > 0 && (
                    <div className={cn("absolute -bottom-3 flex flex-wrap gap-1", isOwn ? "right-0" : "left-0")}>
                      {Object.entries(reactions).map(([emoji, uids]) => (
                        <button key={emoji} onClick={() => handleToggleReaction(msg, emoji)} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-card shadow-sm")}>
                          <span>{emoji}</span>
                          <span className="font-bold">{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!isAdminView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl p-2 w-48 shadow-xl border-none">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2 rounded-lg"><Smile size={14} /> {t('react')}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="rounded-xl p-1 flex gap-1">
                          {COMMON_EMOJIS.map(emoji => (
                            <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg" onClick={() => handleToggleReaction(msg, emoji)}>{emoji}</button>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => setReplyingTo(msg)}><Reply size={14} /> {t('reply')}</DropdownMenuItem>
                      {isOwn && (
                        <>
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => { setEditingMessage(msg); setNewMessage(msg.messageText); }}><Pencil size={14} /> {t('edit')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive rounded-lg" onClick={() => handleDeleteMessage(msg)}><Trash2 size={14} /> {t('delete')}</DropdownMenuItem>
                        </>
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

      <div className={cn("pt-4 border-t space-y-2", (isAdminView || convData?.isFinalized) && "opacity-50 pointer-events-none")}>
        {replyingTo && (
          <div className="mx-2 p-3 bg-muted/50 rounded-xl flex items-center justify-between border-s-4 border-primary">
            <div className="flex flex-col min-w-0 text-start">
              <span className="text-[10px] font-bold text-primary">{t('replying_to')} {replyingTo.senderId === user?.uid ? t('you') : (otherUser?.username || "User")}</span>
              <span className="text-xs truncate text-muted-foreground">{replyingTo.messageText}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}><X size={14} /></Button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-[2rem]">
          <Button type="button" variant="ghost" size="icon" className="w-10 h-10 rounded-full shrink-0 mb-0.5" onClick={() => setIsMediaDialogOpen(true)}>
            <ImageIcon size={20} className="text-muted-foreground" />
          </Button>
          <form className="flex-1 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <Textarea 
              ref={textareaRef}
              placeholder={convData?.isFinalized ? t('deal_completed_notice') : t('type_message')} 
              disabled={convData?.isFinalized}
              className="flex-1 min-h-[44px] max-h-[160px] rounded-2xl px-5 py-3 bg-transparent border-none text-start resize-none shadow-none focus-visible:ring-0 overflow-y-auto" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              rows={1}
            />
            <Button type="submit" size="icon" className="w-10 h-10 rounded-full shadow-md shrink-0 mb-0.5" disabled={!newMessage.trim() || finalizing || convData?.isFinalized}>
              <Send size={20} className={cn(isRTL && "rotate-180")} />
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6">{listing && <ListingDetailView listing={listing} />}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-primary p-8 text-white text-center space-y-2">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-2 animate-bounce"><CheckCircle2 size={40} /></div>
            <DialogTitle className="text-2xl font-black">{t('finalize_settle')}</DialogTitle>
            <DialogDescription className="text-white/80">{t('finalize_desc')}</DialogDescription>
          </div>
          <div className="p-6 space-y-6 text-start">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t('rate_experience')}</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRatingStars(s)} className="transition-all active:scale-90">
                    <Star size={36} className={cn(s <= ratingStars ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">{t('issue_details')}</Label>
              <Textarea 
                value={ratingComment} 
                onChange={(e) => setRatingComment(e.target.value)} 
                placeholder={t('comment_optional')} 
                className="rounded-2xl min-h-[100px] bg-muted/30 border-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 rounded-xl h-12" onClick={() => setIsFinalizeDialogOpen(false)}>{t('cancel')}</Button>
              <Button className="flex-1 rounded-xl h-12 font-black shadow-lg" onClick={handleFinalizeDeal} disabled={finalizing}>
                {finalizing ? <Loader2 className="animate-spin" /> : t('confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
          <DialogHeader className="text-start">
            <DialogTitle>{t('insert_link_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-start">
            <div className="space-y-2">
              <Label>{t('link_placeholder')}</Label>
              <input value={mediaUrlInput} onChange={(e) => setMediaUrlInput(e.target.value)} placeholder="https://..." className="w-full rounded-xl h-12 px-4 bg-muted border-none outline-none focus:ring-2 focus:ring-primary" />
              <p className="text-[10px] text-muted-foreground">{t('insert_link_desc')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleInsertMediaLink} className="w-full h-12 rounded-xl font-bold">{t('add_link')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
