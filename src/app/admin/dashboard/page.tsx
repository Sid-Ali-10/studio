
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Package, 
  MessageSquare, 
  TrendingUp, 
  Trash2, 
  LogOut, 
  Loader2, 
  ShieldAlert,
  Search,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalConvos: number;
}

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalListings: 0, totalConvos: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [convos, setConvos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (token !== "authorized_dz_admin") {
      router.push("/admin/login");
    } else {
      setIsAuthorized(true);
      fetchData();
    }
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users
    const usersPromise = getDocs(collection(db, "userProfiles"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(data);
        return snap.size;
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'userProfiles',
          operation: 'list'
        }));
        return 0;
      });

    // Fetch listings
    const listingsPromise = getDocs(collection(db, "listings"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setListings(data);
        return snap.size;
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'listings',
          operation: 'list'
        }));
        return 0;
      });

    // Fetch conversations
    const convosPromise = getDocs(collection(db, "conversations"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConvos(data);
        return snap.size;
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'conversations',
          operation: 'list'
        }));
        return 0;
      });

    try {
      const [uCount, lCount, cCount] = await Promise.all([usersPromise, listingsPromise, convosPromise]);
      setStats({
        totalUsers: uCount,
        totalListings: lCount,
        totalConvos: cCount
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (coll: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${coll.slice(0, -1)}? This action cannot be undone.`)) return;
    
    const docRef = doc(db, coll, id);
    deleteDocumentNonBlocking(docRef);
    
    // Optimistic update
    if (coll === "userProfiles") setUsers(prev => prev.filter(u => u.id !== id));
    if (coll === "listings") setListings(prev => prev.filter(l => l.id !== id));
    if (coll === "conversations") setConvos(prev => prev.filter(c => c.id !== id));
    
    toast({ title: "Deletion initiated", description: "The resource is being removed." });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  if (!isAuthorized || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-medium animate-pulse">Initializing Control Center...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Admin Command Center
            </h1>
            <p className="text-muted-foreground">Manage users, listings, and platform health.</p>
          </div>
          <Button variant="outline" className="rounded-xl gap-2 hover:bg-destructive hover:text-white" onClick={handleLogout}>
            <LogOut size={18} /> Logout Session
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm rounded-3xl bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-black">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-3xl bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Active Listings</p>
                <p className="text-2xl font-black">{stats.totalListings}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-3xl bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Conversations</p>
                <p className="text-2xl font-black">{stats.totalConvos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card p-1 rounded-2xl h-14 border shadow-sm w-full md:w-auto overflow-x-auto">
            <TabsTrigger value="users" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
              Users
            </TabsTrigger>
            <TabsTrigger value="listings" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
              Listings
            </TabsTrigger>
            <TabsTrigger value="convos" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white">
              Chats
            </TabsTrigger>
          </TabsList>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search data..." 
              className="pl-10 h-12 rounded-xl bg-card border-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-3">
              {users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                <Card key={u.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold flex items-center gap-2">
                          {u.username} 
                          {u.isVerified && <CheckCircle2 size={14} className="text-accent" />}
                          {u.isAdmin && <Badge variant="outline" className="text-[8px] h-4">ADMIN</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold">{u.successfulDealsCount || 0} Deals</p>
                        <p className="text-[10px] text-muted-foreground">{u.walletBalance || 0} DA</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete("userProfiles", u.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-4">
            <div className="grid gap-3">
              {listings.filter(l => l.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((l) => (
                <Card key={l.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold",
                        l.type === "traveler" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      )}>
                        {l.type === "traveler" ? <TrendingUp size={24} /> : <Package size={24} />}
                      </div>
                      <div className="min-w-0 max-w-[200px] sm:max-w-md">
                        <p className="font-bold truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground italic truncate">{l.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold uppercase">{l.type}</p>
                        <p className="text-[10px] text-muted-foreground">{l.city} → {l.destination}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete("listings", l.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="convos" className="space-y-4">
            <div className="grid gap-3">
              {convos.map((c) => (
                <Card key={c.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                        <MessageSquare size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{c.listingTitle || "Marketplace Conversation"}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {c.id.slice(0, 15)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {c.participantIds?.length || 0} Participants
                      </Badge>
                      <Button variant="ghost" size="icon" className="text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete("conversations", c.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
