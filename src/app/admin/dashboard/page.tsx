
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query,
  where,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Package, 
  MessageSquare, 
  Trash2, 
  Loader2, 
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Banknote,
  History,
  Settings,
  Mail,
  RefreshCw,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from "next/link";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalConvos: number;
  totalCommission: number;
}

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdminInDb, setIsAdminInDb] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalListings: 0, totalConvos: 0, totalCommission: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [convos, setConvos] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Platform Settings
  const [platformCommission, setPlatformCommission] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const token = sessionStorage.getItem("admin_token");
      if (token !== "authorized_dz_admin") {
        router.push("/admin/login");
        return;
      }

      setIsAuthorized(true);

      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/login");
          return;
        }

        const profileSnap = await getDoc(doc(db, "userProfiles", user.uid));
        if (profileSnap.exists() && profileSnap.data().isAdmin === true) {
          setIsAdminInDb(true);
          fetchData(user.uid);
          fetchSettings();
        } else {
          setIsAdminInDb(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("Access verification failed", err);
        setIsAdminInDb(false);
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const settingsSnap = await getDoc(doc(db, "settings", "config"));
      if (settingsSnap.exists()) {
        setPlatformCommission(settingsSnap.data().defaultCommission || 1000);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "config"), {
        defaultCommission: Number(platformCommission),
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Settings Saved", description: "Global commission updated." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not save settings." });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Email Sent", description: "Password assistance link has been dispatched." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  };

  const fetchData = async (adminUid: string) => {
    setLoading(true);
    
    // Fetch users
    const usersPromise = getDocs(collection(db, "userProfiles"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(data);
        return snap.size;
      })
      .catch(() => 0);

    // Fetch listings
    const listingsPromise = getDocs(collection(db, "listings"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setListings(data);
        return snap.size;
      })
      .catch(() => 0);

    // Fetch conversations
    const convosPromise = getDocs(collection(db, "conversations"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConvos(data);
        return snap.size;
      })
      .catch(() => 0);

    // Fetch transactions for commissions (this admin's wallet acts as platform wallet)
    const commissionsPromise = getDocs(collection(db, "userProfiles", adminUid, "transactions"))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllTransactions(data);
        const total = data
          .filter(t => t.type === "commission")
          .reduce((sum, t) => sum + t.amount, 0);
        return total;
      })
      .catch(() => 0);

    try {
      const [uCount, lCount, cCount, commSum] = await Promise.all([
        usersPromise, 
        listingsPromise, 
        convosPromise, 
        commissionsPromise
      ]);
      setStats({
        totalUsers: uCount,
        totalListings: lCount,
        totalConvos: cCount,
        totalCommission: commSum
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (coll: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${coll.slice(0, -1)}?`)) return;
    
    const docRef = doc(db, coll, id);
    deleteDocumentNonBlocking(docRef);
    
    if (coll === "userProfiles") setUsers(prev => prev.filter(u => u.id !== id));
    if (coll === "listings") setListings(prev => prev.filter(l => l.id !== id));
    if (coll === "conversations") setConvos(prev => prev.filter(c => c.id !== id));
    
    toast({ title: "Deleted", description: "Resource removed successfully." });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  if (loading) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin" size={48} /><p>Loading Dashboard...</p></div>;
  }

  if (isAdminInDb === false) {
    return <div className="min-h-screen flex flex-col items-center justify-center text-center p-6"><AlertTriangle size={40} className="text-destructive mb-4" /><h1>Unauthorized</h1><Button onClick={() => router.push("/admin/login")}>Back to Login</Button></div>;
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Admin Command Center
            </h1>
            <p className="text-muted-foreground">Monitor platform activity and manage global settings.</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <Users className="text-blue-500" />
              <div><p className="text-xs text-muted-foreground uppercase">Users</p><p className="text-xl font-bold">{stats.totalUsers}</p></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="text-green-500" />
              <div><p className="text-xs text-muted-foreground uppercase">Listings</p><p className="text-xl font-bold">{stats.totalListings}</p></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <MessageSquare className="text-purple-500" />
              <div><p className="text-xs text-muted-foreground uppercase">Chats</p><p className="text-xl font-bold">{stats.totalConvos}</p></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-6 flex items-center gap-4">
              <Banknote />
              <div><p className="text-xs opacity-70 uppercase">Commissions</p><p className="text-xl font-bold">{stats.totalCommission} DA</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="rounded-2xl h-14 w-full md:w-auto overflow-x-auto">
            <TabsTrigger value="users" className="rounded-xl px-8">Users</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-xl px-8">Listings</TabsTrigger>
            <TabsTrigger value="convos" className="rounded-xl px-8">Chats</TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-xl px-8">Revenue Log</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-8">Settings</TabsTrigger>
          </TabsList>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Filter list..." 
              className="pl-10 h-12 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="users">
            <div className="grid gap-3">
              {users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                <Card key={u.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">{u.username?.charAt(0)}</div>
                    <div><div className="font-bold flex items-center gap-2">{u.username} {u.isVerified && <CheckCircle2 size={12} className="text-accent" />}</div><p className="text-xs text-muted-foreground">{u.email}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleResetPassword(u.email)} title="Reset Password"><RefreshCw size={18} /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("userProfiles", u.id)} title="Delete User"><Trash2 size={18} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="listings">
            <div className="grid gap-3">
              {listings.filter(l => l.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((l) => (
                <Card key={l.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                  <div><p className="font-bold">{l.title}</p><p className="text-xs text-muted-foreground">{l.type.toUpperCase()} • {l.city} → {l.destination}</p></div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("listings", l.id)}><Trash2 size={18} /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="convos">
            <div className="grid gap-3">
              {convos.map((c) => (
                <Card key={c.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                  <div><p className="font-bold text-sm">{c.listingTitle || "Private Chat"}</p><p className="text-xs text-muted-foreground">ID: {c.id.slice(0, 10)}...</p></div>
                  <div className="flex gap-2">
                    <Link href={`/chat/${c.id}`}><Button variant="ghost" size="icon" className="text-primary"><Eye size={18} /></Button></Link>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("conversations", c.id)}><Trash2 size={18} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="grid gap-3">
              {allTransactions.filter(t => t.type === "commission").map((t) => (
                <Card key={t.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><History size={20} /></div>
                    <div><p className="font-bold text-sm">{t.description}</p><p className="text-[10px] text-muted-foreground">{t.createdAt ? format(t.createdAt.toDate(), "PPPp") : "Unknown Date"}</p></div>
                  </div>
                  <div className="font-bold text-accent">+{t.amount} DA</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2"><Settings size={20} /> Platform Configuration</CardTitle>
                <CardDescription>Adjust global parameters that affect all users.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Default Traveler Commission (DA)</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input 
                        id="commission"
                        type="number"
                        className="pl-10 h-12 rounded-xl"
                        value={platformCommission}
                        onChange={(e) => setPlatformCommission(Number(e.target.value))}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">This amount is deducted from travelers for every completed deal.</p>
                  </div>

                  <Button className="w-full h-12 rounded-xl font-bold gap-2" onClick={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Global Settings</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
