
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
  writeBatch,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit
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
  Smile
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  unreadBy?: string[];
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
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [convData, setConvData] = useState<ConversationData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateLocale = language === 'ar' ? arSA : language === 'fr' ? fr : enUS;

  const isAdminView = profile?.isAdmin && convData && !convData.participantIds.includes(user?.uid || "");

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

    let isMounted = true;
    let unsubscribeConv: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    const setupChat = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const convRef = doc(db, "conversations", id);
        
        unsubscribeConv = onSnapshot(convRef, async (snap) => {
          if (!isMounted) return;
          if (snap.exists()) {
            const data = snap.data() as ConversationData;
            setConvData(data);
            setActiveConvId(id);
            
            // Mark as read
            if (data.unreadBy?.includes(user.uid)) {
              updateDoc(convRef, { unreadBy: arrayRemove(user.uid) });
            }

            // Fetch other user if not already fetched
            if (!otherUser) {
              const otherUserId = data.participantIds.find(p => p !== user.uid);
              if (otherUserId) {
                const uDoc = await getDoc(doc(db, "userProfiles", otherUserId));
                if (uDoc.exists()) setOtherUser(uDoc.data());
              }
            }

            // Fetch listing if not already fetched
            if (!listing) {
              const lDoc = await getDoc(doc(db, "listings", data.listingId));
              if (lDoc.exists()) setListing({ id: lDoc.id, ...lDoc.data() } as Listing);
            }

            // Messages listener
            if (!unsubscribeMessages) {
              const messagesQuery = query(collection(db, "conversations", id, "messages"), orderBy("timestamp", "asc"), limit(200));
              unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
                if (!isMounted) return;
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
                setLoading(false);
              });
            }
          } else {
            // Document might be newly created, wait a bit
            setTimeout(() => {
              if (isMounted && !convData && loading) {
                setError(t('conv_not_found'));
                setLoading(false);
              }
            }, 3000);
          }
        }, (err) => {
          if (isMounted) {
            setError(err.code === 'permission-denied' ? t('access_restricted') : t('error'));
            setLoading(false);
          }
        });
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    setupChat();
    return () => {
      isMounted = false;
      unsubscribeConv?.();
      unsubscribeMessages?.();
    };
  }, [id, user, t]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (isAdminView || !user || !activeConvId) return;
    if (e) e.preventDefault();
    if (editingMessage) { handleSaveEdit(); return; }
    
    if (!newMessage.trim()) return;

    const otherUserId = convData?.participantIds.find(p => p !== user.uid);
    const msgData: any = {
      conversationId: activeConvId,
      senderId: user.uid,
      messageText: newMessage,
      timestamp: serverTimestamp(),
      participantIds: convData?.participantIds
    };

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
        lastMessageText: newMessage,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadBy: arrayUnion(otherUserId),
        deletedBy: []
      });
    } catch (err) {
      toast({ variant: "destructive", title: t('failed') });
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={20} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-2 w-48 shadow-xl border-none">
            {!isAdminView && <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => router.push(`/chat`)}><Flag size={14} /> {t('report_problem')}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg text-destructive" onClick={() => router.push('/chat')}><Trash2 size={14} /> {t('delete_chat')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg) => {
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
                  <div className="text-sm">{msg.messageText}</div>
                  <div className={cn("flex items-center justify-between mt-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[9px] opacity-60">{msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm", { locale: dateLocale }) : ""}</span>
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

      <div className={cn("pt-4 border-t space-y-2", isAdminView && "opacity-50 pointer-events-none")}>
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
          <form className="flex-1 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <Textarea 
              ref={textareaRef}
              placeholder={t('type_message')} 
              className="flex-1 min-h-[44px] max-h-[160px] rounded-2xl px-5 py-3 bg-transparent border-none text-start resize-none shadow-none focus-visible:ring-0 overflow-y-auto" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              rows={1}
            />
            <Button type="submit" size="icon" className="w-10 h-10 rounded-full shadow-md shrink-0 mb-0.5" disabled={!newMessage.trim()}>
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
    </div>
  );
}
