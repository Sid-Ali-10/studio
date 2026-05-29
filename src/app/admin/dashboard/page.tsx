
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, addDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Flag,
  UserX,
  UserCheck,
  Plus,
  Pencil,
  CreditCard,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Ban,
  User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { type Listing } from '@/components/listings/ListingCard';
import { ListingDetailView } from '@/components/listings/ListingDetailView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalConvos: number;
  totalRevenueDA: number;
  totalReports: number;
}

interface SubscriptionPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdminInDb, setIsAdminInDb] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalListings: 0, totalConvos: 0, totalRevenueDA: 0, totalReports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Partial<SubscriptionPackage>>({ name: '', credits: 1, price: 100 });
  const [savingPackage, setSavingPackage] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const token = sessionStorage.getItem('admin_token');
      if (token !== 'authorized_dz_admin') {
        router.push('/admin/login');
        return;
      }

      setIsAuthorized(true);

      try {
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
        if (profileSnap.exists() && profileSnap.data().isAdmin === true) {
          setIsAdminInDb(true);
          fetchStaticData();
          listenToRevenue();
          fetchPackages();
        } else {
          setIsAdminInDb(false);
          setLoading(false);
        }
      } catch (err) {
        setIsAdminInDb(false);
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const fetchPackages = async () => {
    try {
      const packagesSnap = await getDocs(collection(db, 'subscriptionPackages'));
      setSubscriptionPackages(packagesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPackage)));
    } catch (err) {
      console.error('Failed to fetch packages', err);
    }
  };

  const listenToRevenue = () => {
    return onSnapshot(collection(db, 'revenue'), (snap) => {
      const revData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sortedRev = revData.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setRevenueHistory(sortedRev);
      
      const total = revData.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      setStats(prev => ({ ...prev, totalRevenueDA: total }));
    });
  };

  const fetchStaticData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'userProfiles'), limit(50)));
      const listingsSnap = await getDocs(query(collection(db, 'listings'), limit(50)));
      const convosSnap = await getDocs(query(collection(db, 'conversations'), limit(1)));
      const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(50)));

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setListings(listingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setStats(prev => ({
        ...prev,
        totalUsers: usersSnap.size,
        totalListings: listingsSnap.size,
        totalConvos: convosSnap.size,
        totalReports: reportsSnap.size,
      }));
    } catch (err: any) {
      console.error("Data Load Error:", err);
      toast({ variant: 'destructive', title: 'Data Load Error', description: err.message });
      
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'admin_dashboard_fetch',
          operation: 'list'
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (coll: string, id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!confirm(`Are you sure?`)) return;
    setProcessingAction(`delete-${id}`);

    try {
      await deleteDoc(doc(db, coll, id));
      if (coll === 'listings') setListings((prev) => prev.filter((l) => l.id !== id));
      if (coll === 'reports') setReports((prev) => prev.filter((r) => r.id !== id));
      if (coll === 'subscriptionPackages') setSubscriptionPackages((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Success' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSavePackage = async () => {
    if (!currentPackage.name || !currentPackage.credits || !currentPackage.price) {
      toast({ variant: 'destructive', title: 'Validation Error' });
      return;
    }
    setSavingPackage(true);
    try {
      if (currentPackage.id) {
        await updateDoc(doc(db, 'subscriptionPackages', currentPackage.id), currentPackage);
        setSubscriptionPackages(prev => prev.map(p => p.id === currentPackage.id ? (currentPackage as SubscriptionPackage) : p));
      } else {
        const docRef = await addDoc(collection(db, 'subscriptionPackages'), currentPackage);
        setSubscriptionPackages(prev => [...prev, { id: docRef.id, ...currentPackage } as SubscriptionPackage]);
      }
      toast({ title: 'Success' });
      setIsPackageDialogOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save Failed' });
    } finally {
      setSavingPackage(false);
    }
  };

  const handleOpenPackageDialog = (pkg?: SubscriptionPackage) => {
    if (pkg) {
      setCurrentPackage(pkg);
    } else {
      setCurrentPackage({ name: '', credits: 1, price: 100 });
    }
    setIsPackageDialogOpen(true);
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newStatus = !currentStatus;
    setProcessingAction(`ban-${userId}`);
    try {
      await updateDoc(doc(db, 'userProfiles', userId), { isBanned: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: newStatus } : u));
      toast({ title: newStatus ? 'User Banned' : 'User Reinstated' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin" size={48} /><p>Loading Dashboard...</p></div>;

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <ShieldAlert className="text-primary" /> Admin Center
              </h1>
              <p className="text-sm text-muted-foreground">Monitor platform activity and revenue.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchStaticData} className="rounded-full h-10 w-10 active:scale-95 transition-all">
              <RefreshCw size={20} />
            </Button>
          </div>
          <Button variant="outline" className="rounded-xl w-full md:w-auto" onClick={() => { sessionStorage.removeItem('admin_token'); router.push('/admin/login'); }}>
            Logout
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-primary-foreground overflow-hidden text-start">
            <CardContent className="p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-inner">
                  <TrendingUp size={40} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm opacity-80 uppercase font-black tracking-widest">Total Platform Revenue</p>
                  <p className="text-5xl md:text-6xl font-black tracking-tighter">
                    {stats.totalRevenueDA.toLocaleString()} <span className="text-2xl font-medium opacity-60">DA</span>
                  </p>
                </div>
              </div>
              <div className="hidden lg:block border-l border-white/10 pl-8 h-24 flex flex-col justify-center">
                <div className="flex items-center gap-3 bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md">
                   <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                   <div className="space-y-0.5">
                     <p className="text-[10px] uppercase font-black opacity-60">Status</p>
                     <p className="font-bold text-sm">Revenue Tracking Active</p>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Users className="text-blue-500" />
                </div>
                <div className="text-start">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Users</p>
                  <p className="text-2xl font-black">{stats.totalUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <Package className="text-emerald-600" />
                </div>
                <div className="text-start">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Listings</p>
                  <p className="text-2xl font-black">{stats.totalListings}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="text-purple-500" />
                </div>
                <div className="text-start">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Chats (DB Size)</p>
                  <p className="text-2xl font-black">{stats.totalConvos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
                  <Flag className="text-destructive" />
                </div>
                <div className="text-start">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Reports</p>
                  <p className="text-2xl font-black">{stats.totalReports}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="inline-flex h-14 bg-card p-1 shadow-sm rounded-2xl whitespace-nowrap">
              <TabsTrigger value="reports" className="rounded-xl px-6 md:px-8">Reports</TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl px-6 md:px-8">Users</TabsTrigger>
              <TabsTrigger value="listings" className="rounded-xl px-6 md:px-8">Listings</TabsTrigger>
              <TabsTrigger value="subs" className="rounded-xl px-6 md:px-8">Subscription Packages</TabsTrigger>
              <TabsTrigger value="revenue" className="rounded-xl px-6 md:px-8">Revenue Log</TabsTrigger>
            </TabsList>
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Filter current view..."
              className="pl-10 h-12 rounded-xl transition-all border-none shadow-sm text-start"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="reports">
            <div className="grid gap-4">
              {reports.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No reports found.</p>
              ) : reports.map((r) => {
                const targetUser = users.find(u => u.id === r.targetUserId);
                return (
                  <Card key={r.id} className="rounded-2xl border-none shadow-sm overflow-hidden p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'} className="rounded-lg">{r.status.toUpperCase()}</Badge>
                        <Badge variant="outline" className="rounded-lg border-primary/20 text-primary flex gap-1 items-center">
                          <ShieldAlert size={10} /> ADMIN ONLY VIEW
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{r.createdAt ? format(r.createdAt.toDate(), 'PPpp') : 'Recent'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => handleDelete('reports', r.id)}><Trash2 size={16} /></Button>
                        <Button variant="secondary" size="sm" className="rounded-xl h-9 gap-2 font-bold" onClick={() => updateDoc(doc(db, 'reports', r.id), { status: 'resolved' })}><CheckCircle2 size={14} /> Resolve</Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2 text-start">
                        <p className="font-black text-lg flex items-center gap-2">
                          <Flag size={20} className="text-destructive" /> {r.type.toUpperCase()}
                        </p>
                        <p className="text-sm bg-muted/50 p-4 rounded-xl italic leading-relaxed border-l-4 border-destructive/30">"{r.reason}"</p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {r.conversationId && (
                          <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 border-primary/20 hover:bg-primary/5" onClick={() => router.push(`/chat/${r.conversationId}`)}>
                            <MessageSquare size={14} /> View Conversation
                          </Button>
                        )}
                        {r.targetUserId && (
                          <>
                            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 border-primary/20 hover:bg-primary/5" onClick={() => router.push(`/profile/${r.targetUserId}`)}>
                              <UserIcon size={14} /> View Profile
                            </Button>
                            <Button 
                              variant={targetUser?.isBanned ? "secondary" : "destructive"} 
                              size="sm" 
                              className="rounded-xl h-9 gap-2" 
                              onClick={() => handleToggleBan(r.targetUserId, !!targetUser?.isBanned)}
                              disabled={processingAction === `ban-${r.targetUserId}`}
                            >
                              {targetUser?.isBanned ? <UserCheck size={14} /> : <Ban size={14} />}
                              {targetUser?.isBanned ? "Unban User" : "Ban Permanently"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="grid gap-3">
              {users.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No users found.</p>
              ) : users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                <Card key={u.id} className={cn("rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-accent transition-all duration-200", u.isBanned && "opacity-60")}>
                  <Link href={`/profile/${u.id}`} className="flex items-center gap-4 min-w-0 flex-1 group">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black transition-transform group-hover:scale-105">{u.username?.charAt(0).toUpperCase()}</div>
                    <div className="flex flex-col text-start">
                      <div className="font-black text-sm md:text-base flex items-center gap-2">
                        <span className="group-hover:text-primary transition-colors">{u.username}</span> {u.isVerified && <CheckCircle2 size={14} className="text-primary" />}
                        {u.isBanned && <Badge variant="destructive" className="h-4 text-[8px] px-1">BANNED</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" className="rounded-full relative z-10" onClick={(e) => handleToggleBan(u.id, u.isBanned, e)}>
                    {u.isBanned ? <UserCheck size={18} /> : <UserX size={18} />}
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="listings">
            <div className="grid gap-3">
              {listings.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No listings found.</p>
              ) : listings.filter(l => l.title?.toLowerCase().includes(searchTerm.toLowerCase())).map((l) => (
                <Card key={l.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-accent cursor-pointer transition-all duration-200" onClick={() => { setSelectedListing(l); setIsDetailOpen(true); }}>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="font-black truncate group-hover:text-primary transition-colors">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{l.type} • {l.city || 'Anywhere'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full text-destructive relative z-10" onClick={(e) => handleDelete('listings', l.id, e)}><Trash2 size={18} /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="subs">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Subscription Packages</h3><Button onClick={() => handleOpenPackageDialog()} className="rounded-xl gap-2"><Plus size={18} /> Add Package</Button></div>
              <div className="grid gap-3">
                {subscriptionPackages.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground italic">No packages configured.</p>
                ) : subscriptionPackages.map((pkg) => (
                  <Card key={pkg.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-start">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600"><CreditCard size={24} /></div>
                      <div><p className="font-black">{pkg.name}</p><p className="text-xs text-muted-foreground font-bold">{pkg.credits} Credits • {pkg.price} DA</p></div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenPackageDialog(pkg)} className="rounded-full"><Pencil size={18} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete('subscriptionPackages', pkg.id)} className="rounded-full text-destructive"><Trash2 size={18} /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="grid gap-3">
              {revenueHistory.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No revenue recorded yet.</p>
              ) : revenueHistory.map((t) => (
                <Card key={t.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-accent transition-all duration-200">
                  <div className="flex items-center gap-4 text-start flex-1 min-w-0">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0"><ShoppingBag size={24} /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{t.packageName} Purchase</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Buyer: {t.buyerName || 'User'} • {t.createdAt ? format(t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt), 'PPPp') : '...'}</p>
                    </div>
                  </div>
                  <div className="font-black text-emerald-600 text-lg">+{t.amount?.toLocaleString()} DA</div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
          <Link href="/">
            <Button className="rounded-full h-14 w-14 shadow-2xl transition-all active:scale-90">
              <RefreshCw size={24} />
            </Button>
          </Link>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}><DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 text-start"><DialogTitle className="text-2xl font-bold">Listing Content Review</DialogTitle></DialogHeader>
        <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">{selectedListing && <ListingDetailView listing={selectedListing as any} />}</div>
      </DialogContent></Dialog>

      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}><DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
        <DialogHeader className="text-start"><DialogTitle>{currentPackage.id ? 'Edit Package' : 'Add Package'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4 text-start">
          <div className="space-y-2"><Label>Package Name</Label><Input value={currentPackage.name} onChange={(e) => setCurrentPackage({...currentPackage, name: e.target.value})} placeholder="e.g. Starter Pack" className="rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Credits</Label><Input type="number" value={currentPackage.credits} onChange={(e) => setCurrentPackage({...currentPackage, credits: Number(e.target.value)})} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Price (DA)</Label><Input type="number" value={currentPackage.price} onChange={(e) => setCurrentPackage({...currentPackage, price: Number(e.target.value)})} className="rounded-xl" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSavePackage} disabled={savingPackage} className="w-full rounded-xl active:scale-[0.98] transition-all">{savingPackage ? <Loader2 className="animate-spin" /> : 'Save Package'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

    