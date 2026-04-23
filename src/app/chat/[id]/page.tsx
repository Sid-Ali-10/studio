
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  getDocs,
  writeBatch,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit
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
  Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
import { type Listing } from "@/components/listings/ListingCard";
import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function ChatRoomPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
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

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

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
        const conversationId = id as string;
        const convRef = doc(db, "conversations", conversationId);
        
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

            if (data.buyerRated && data.travelerRated && data.participantIds.includes(user.uid)) {
              handleFinalizeDeal(data);
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
          
          // No where filter needed here as Security Rules and the conversation listener 
          // already verify access. Removing it fixes the composite index requirement.
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
          setError("Conversation not found.");
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
        setError("Access restricted.");
      }
    };

    setupChat();
    return () => {
      unsubscribeMessages?.();
      unsubscribeConv?.();
    };
  }, [id, user, profile?.isAdmin]);

  const handleFinalizeDeal = async (data: ConversationData) => {
    if (!user || data.finalizedUsers?.includes(user.uid)) return;
    if (!data.agreedPrice) {
      toast({ variant: "destructive", title: "No Price Agreed", description: "You must agree on a price before finishing the deal." });
      return;
    }

    try {
      const batch = writeBatch(db);
      const commission = 1000;
      const agreedPrice = data.agreedPrice;

      const travelerId = listing?.listerId || "";
      const buyerId = data.participantIds.find(p => p !== travelerId) || "";

      // 1. Find an Admin to receive commissions
      const adminsSnap = await getDocs(query(collection(db, "userProfiles"), where("isAdmin", "==", true), limit(1)));
      const adminId = adminsSnap.docs[0]?.id;

      if (!adminId) {
        console.error("No platform admin found for commission.");
      }

      if (user.uid === buyerId) {
        const amount = agreedPrice + commission;
        batch.update(doc(db, "userProfiles", buyerId), {
          walletBalance: increment(-amount),
          successfulDealsCount: increment(1),
          updatedAt: serverTimestamp()
        });
        batch.set(doc(collection(db, "userProfiles", buyerId, "transactions")), {
          amount: -amount,
          type: "payment",
          description: `Marketplace Payment + Fee: ${data.listingTitle}`,
          createdAt: serverTimestamp()
        });
      } else if (user.uid === travelerId) {
        const amount = agreedPrice - commission;
        batch.update(doc(db, "userProfiles", travelerId), {
          walletBalance: increment(amount),
          successfulDealsCount: increment(1),
          updatedAt: serverTimestamp()
        });
        batch.set(doc(collection(db, "userProfiles", travelerId, "transactions")), {
          amount: amount,
          type: "payout",
          description: `Marketplace Earnings - Fee: ${data.listingTitle}`,
          createdAt: serverTimestamp()
        });
      }

      // Add to Admin wallet if found
      if (adminId) {
        batch.update(doc(db, "userProfiles", adminId), {
          walletBalance: increment(commission),
          updatedAt: serverTimestamp()
        });
        batch.set(doc(collection(db, "userProfiles", adminId, "transactions")), {
          amount: commission,
          type: "commission",
          description: `Platform Fee from deal: ${data.listingTitle}`,
          createdAt: serverTimestamp()
        });
      }

      const finalizedList = [...(data.finalizedUsers || []), user.uid];
      const convRef = doc(db, "conversations", data.id);
      
      if (finalizedList.length >= 2) {
        const messagesSnap = await getDocs(collection(db, "conversations", data.id, "messages"));
        messagesSnap.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(convRef);
      } else {
        batch.update(convRef, {
          finalizedUsers: arrayUnion(user.uid),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      toast({ title: "Deal Finalized!", description: "Funds transferred and fees processed." });
    } catch (err) {
      console.error("Finalization failed:", err);
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
      toast({ title: "Offer sent", description: "Waiting for the other party to respond." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to send offer" });
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
        title: accepted ? "Offer Accepted!" : "Offer Rejected", 
        description: accepted ? `Price locked at ${convData.offeredPrice} DA.` : "Offer dismissed." 
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Error responding to offer" });
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
        senderName: replyingTo.senderId === user.uid ? "You" : (otherUser?.username || "User")
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
      toast({ variant: "destructive", title: "Message failed" });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !activeConvId || isAdminView) return;
    const msgRef = doc(db, "conversations", activeConvId, "messages", messageId);
    try {
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;
      const reactions = (msgSnap.data().reactions as Record<string, string[]>) || {};
      const currentUsers = reactions[emoji] || [];
      let newUsers = currentUsers.includes(user.uid) 
        ? currentUsers.filter(uid => uid !== user.uid) 
        : [...currentUsers, user.uid];
      const newReactions = { ...reactions };
      if (newUsers.length === 0) delete newReactions[emoji];
      else newReactions[emoji] = newUsers;
      await updateDoc(msgRef, { reactions: newReactions });
    } catch (err) {
      console.error("Reaction failed:", err);
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
      toast({ title: "Message updated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Edit failed" });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConvId) return;
    try {
      await deleteDoc(doc(db, "conversations", activeConvId, "messages", messageId));
      toast({ title: "Message deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed" });
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId || !user || !convData) return;
    if (!confirm("Remove this conversation?")) return;

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
      toast({ title: "Conversation removed" });
    } catch (err) {
      console.error("Deletion failed:", err);
      toast({ variant: "destructive", title: "Delete failed" });
    }
  };

  const handleRateDeal = async () => {
    if (isAdminView || !activeConvId || !user || !convData) return;
    
    if (!convData.agreedPrice) {
      toast({ variant: "destructive", title: "Incomplete Deal", description: "Please agree on a price before rating." });
      return;
    }

    const totalCost = (listing?.listerId === user.uid) ? 1000 : (convData.agreedPrice + 1000);
    if ((profile?.walletBalance || 0) < totalCost) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You need at least ${totalCost} DA to complete this deal.`,
      });
      return;
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

      toast({ title: "Rating saved!" });
      setIsRatingOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save rating." });
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
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const canModify = (timestamp: any) => {
    if (isAdminView) return false;
    if (!timestamp) return true;
    const sentAt = timestamp.toDate().getTime();
    return (Date.now() - sentAt) < (10 * 60 * 1000);
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="animate-spin text-primary" size={40} /><p className="text-muted-foreground">Opening secure chat...</p></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"><AlertCircle size={40} className="text-destructive" /><h2 className="text-xl font-bold">Error</h2><p>{error}</p><Button onClick={() => router.push("/chat")}>Back to Inbox</Button></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto">
      {isAdminView && (
        <Alert variant="destructive" className="mb-4 rounded-2xl bg-destructive/5 border-destructive/20">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold">Administrative View Only</AlertTitle>
          <AlertDescription className="text-xs">
            You are monitoring this conversation for quality and safety purposes.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-primary/10 hover:text-primary"><ArrowLeft size={20} /></Button>
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary border border-primary/20">
          {otherUser?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-sm sm:text-base">{otherUser?.username || "Private User"}</h2>
          <button onClick={() => setIsDetailsOpen(true)} className="text-[10px] sm:text-xs text-muted-foreground truncate italic hover:text-primary flex items-center gap-1 transition-colors">
            {listing?.title || "Marketplace Listing"} <Info size={10} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!convData?.isFinalized && !isAdminView && (
            <div className="flex gap-1">
              {convData?.agreedPrice ? (
                <Button 
                  variant={hasUserRated ? "outline" : "default"}
                  size="sm" 
                  className="rounded-full gap-2 font-bold transition-all shadow-sm active:scale-95"
                  onClick={() => !hasUserRated && setIsRatingOpen(true)}
                  disabled={hasUserRated}
                >
                  <CheckCircle2 size={16} />
                  <span className="hidden sm:inline">{hasUserRated ? "Rated" : "Complete Deal"}</span>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full gap-2 font-bold" onClick={() => setIsOfferDialogOpen(true)}>
                  <Banknote size={16} /> <span className="hidden sm:inline">Price Offer</span>
                </Button>
              )}
            </div>
          )}
          <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:bg-destructive/10 transition-colors" onClick={handleDeleteConversation}>
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {convData?.offeredPrice && (
        <Alert className="mt-4 rounded-2xl bg-primary/5 border-primary/20 animate-in slide-in-from-top duration-300">
          <Banknote className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold text-primary flex items-center justify-between">
            New Price Offer
            <span className="text-lg">{convData.offeredPrice} DA</span>
          </AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between">
            <span className="text-xs">{convData.offerSenderId === user?.uid ? "You sent this offer." : `${otherUser?.username} proposed this price.`}</span>
            {convData.offerSenderId !== user?.uid && !isAdminView && (
              <div className="flex gap-2">
                <Button size="sm" className="h-8 rounded-lg gap-1" onClick={() => handleRespondToOffer(true)}>
                  <Check size={14} /> Accept
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1 text-destructive" onClick={() => handleRespondToOffer(false)}>
                  <Ban size={14} /> Reject
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {convData?.agreedPrice && (
        <div className="mt-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">Agreed Price</span>
          <span className="font-black text-accent">{convData.agreedPrice} DA</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          const editAllowed = !isAdminView && isOwn && canModify(msg.timestamp);
          return (
            <div key={msg.id} className={cn("flex flex-col group", isOwn ? "items-end" : "items-start")}>
              {msg.replyTo && (
                <div className={cn("text-[10px] text-muted-foreground mb-1 flex items-center gap-1 max-w-[70%]", isOwn ? "flex-row-reverse" : "flex-row")}>
                  <Reply size={10} />
                  <span className="truncate italic">Replying to {msg.replyTo.senderName}: "{msg.replyTo.text}"</span>
                </div>
              )}
              <div className={cn("flex items-end gap-1 w-full relative", isOwn ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl relative break-words whitespace-pre-wrap transition-all duration-200 shadow-sm",
                  isOwn ? "bg-primary text-white rounded-tr-none hover:bg-primary/90" : "bg-card text-foreground rounded-tl-none border hover:bg-muted/30"
                )}>
                  {msg.imageUrl && <img src={msg.imageUrl} alt="Chat" className="rounded-lg mb-2 max-w-full h-auto" />}
                  {msg.messageText && <p className="text-sm">{msg.messageText}{msg.isEdited && <span className="text-[9px] opacity-70 ml-2">(edited)</span>}</p>}
                  <span className={cn("text-[9px] mt-1 block opacity-60", isOwn ? "text-right" : "text-left")}>
                    {msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm") : ""}
                  </span>
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={cn("absolute -bottom-3 flex flex-wrap gap-1", isOwn ? "right-0" : "left-0")}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => (
                        <button key={emoji} className="bg-white border rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 shadow-sm" onClick={() => handleReaction(msg.id, emoji)}>
                          <span>{emoji}</span><span>{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!isAdminView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl p-2 w-48 shadow-xl border-none">
                      <div className="grid grid-cols-4 gap-1 mb-2">
                        {["👍", "❤️", "😂", "😮", "😢", "🔥", "😡"].map(emoji => (
                          <button key={emoji} className="text-lg hover:scale-125 transition-all p-1" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => setReplyingTo(msg)}><Reply size={14} /> Reply</DropdownMenuItem>
                      {(editAllowed || profile?.isAdmin) && (
                        <>
                          {editAllowed && <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => handleEditInit(msg)}><Pencil size={14} /> Edit</DropdownMenuItem>}
                          <DropdownMenuItem className="gap-2 text-destructive rounded-lg" onClick={() => handleDeleteMessage(msg.id)}><Trash2 size={14} /> Delete</DropdownMenuItem>
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
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-xl text-xs border-l-4 border-primary">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-primary">Replying to {replyingTo.senderId === user?.uid ? "yourself" : (otherUser?.username || "User")}</span>
              <span className="truncate italic">"{replyingTo.messageText || "Image"}"</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyingTo(null)}><X size={14} /></Button>
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
          <input type="file" id="image-upload" className="hidden" accept="image/*" disabled={uploading || isAdminView} onChange={handleImageUpload} />
          <label htmlFor="image-upload" className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full bg-muted cursor-pointer shrink-0 hover:bg-primary/10 hover:text-primary transition-colors",
            isAdminView && "cursor-not-allowed"
          )}>
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </label>
          <Input 
            placeholder={isAdminView ? "Admin: Read-Only" : (editingMessage ? "Update message..." : "Type message...")} 
            className="flex-1 h-11 rounded-full px-5 bg-muted border-none" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isAdminView}
          />
          <Button type="submit" size="icon" className="w-11 h-11 rounded-full shadow-md" disabled={(!newMessage.trim() && !uploading) || isAdminView}>
            {editingMessage ? <CheckCircle2 size={20} /> : <Send size={20} />}
          </Button>
        </form>
      </div>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Make a Price Offer</DialogTitle>
            <DialogDescription>Propose a specific price for this deal. The other party must accept before you can finalize.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                type="number"
                placeholder="Enter price (DA)"
                className="pl-10 h-12 rounded-xl"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={handleMakeOffer}>Send Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Finalize & Settle</DialogTitle>
            <DialogDescription>
              Completing this will process the payment of {convData?.agreedPrice} DA.
              <br />A 1000 DA platform fee will be deducted from your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} className={cn("transition-transform", ratingStars >= s ? "text-yellow-400" : "text-muted")} onClick={() => setRatingStars(s)}>
                <Star size={40} fill={ratingStars >= s ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" disabled={ratingLoading} onClick={handleRateDeal}>
              {ratingLoading ? <Loader2 className="animate-spin" /> : "Rate & Complete Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold">Listing Details</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">
            {listing && <ListingDetailView listing={listing} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
